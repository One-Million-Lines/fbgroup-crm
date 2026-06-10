import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import { postActivity, members, groupMembers, dailyGroupStats } from '../db/schema.workspace.js';
import { newId, nowIso } from '../utils/ids.js';
import { extractProfileIdentity, normalizeName } from '../utils/normalize.js';

const PostScanSchema = z.object({
  posts: z.array(z.object({
    fbPostUrl: z.string().url().nullable().optional(),
    authorLabel: z.string().nullable().optional(),
    authorProfileUrl: z.string().nullable().optional(),
    postedAt: z.string().nullable().optional(),
    reactionCount: z.number().int().nonnegative().optional(),
    commentCount: z.number().int().nonnegative().optional(),
    shareCount: z.number().int().nonnegative().optional(),
    hasMedia: z.boolean().optional(),
    detectedAt: z.string().optional(),
  })),
});

export async function postScanRoutes(app: FastifyInstance) {
  app.post('/groups/:groupId/scans/posts', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const body = PostScanSchema.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    const ts = nowIso();
    const today = ts.slice(0, 10);

    let accepted = 0, matched = 0, unmatched = 0, totalReactions = 0, totalComments = 0;

    // Build lookup of existing members
    const gms = db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).all();
    const byFbid = new Map<string, { gmId: string; memberId: string }>();
    const byUrl = new Map<string, { gmId: string; memberId: string }>();
    const byUsername = new Map<string, { gmId: string; memberId: string }>();
    const byName = new Map<string, { gmId: string; memberId: string }>();
    for (const gm of gms) {
      const m = db.select().from(members).where(eq(members.id, gm.memberId)).get();
      if (!m) continue;
      const idx = { gmId: gm.id, memberId: gm.memberId };
      if (m.fbid) byFbid.set(m.fbid, idx);
      if (m.profileUrl) byUrl.set(m.profileUrl, idx);
      if (m.username) byUsername.set(m.username, idx);
      const name = normalizeName(m.displayName);
      if (name) byName.set(name, idx);
    }

    for (const p of body.posts) {
      // De-dup by URL
      if (p.fbPostUrl) {
        const exists = db.select().from(postActivity).where(eq(postActivity.fbPostUrl, p.fbPostUrl)).get();
        if (exists) continue;
      }

      const ident = extractProfileIdentity(p.authorProfileUrl ?? null);
      const nameKey = normalizeName(p.authorLabel ?? null);
      const match =
        (ident.fbid && byFbid.get(ident.fbid)) ||
        (ident.url && byUrl.get(ident.url)) ||
        (ident.username && byUsername.get(ident.username)) ||
        (nameKey && byName.get(nameKey)) ||
        null;

      db.insert(postActivity).values({
        id: newId('post'),
        groupId,
        memberId: match?.memberId ?? null,
        fbPostUrl: p.fbPostUrl ?? null,
        authorLabel: p.authorLabel ?? null,
        authorProfileUrl: ident.url ?? null,
        postedAt: p.postedAt ?? null,
        detectedAt: p.detectedAt ?? ts,
        reactionCount: p.reactionCount ?? 0,
        commentCount: p.commentCount ?? 0,
        shareCount: p.shareCount ?? 0,
        hasMedia: p.hasMedia ? 1 : 0,
      }).run();

      accepted += 1;
      totalReactions += p.reactionCount ?? 0;
      totalComments += p.commentCount ?? 0;

      if (match) {
        matched += 1;
        const gm = db.select().from(groupMembers).where(eq(groupMembers.id, match.gmId)).get();
        if (gm) {
          db.update(groupMembers).set({
            postCount: (gm.postCount ?? 0) + 1,
            reactionCount: (gm.reactionCount ?? 0) + (p.reactionCount ?? 0),
            commentCount: (gm.commentCount ?? 0) + (p.commentCount ?? 0),
            lastPostAt: p.postedAt ?? gm.lastPostAt ?? ts,
            updatedAt: ts,
          }).where(eq(groupMembers.id, match.gmId)).run();
        }
      } else {
        unmatched += 1;
      }
    }

    // Bump daily stats
    const day = db.select().from(dailyGroupStats)
      .where(and(eq(dailyGroupStats.groupId, groupId), eq(dailyGroupStats.date, today))).get();
    if (day) {
      db.update(dailyGroupStats).set({
        detectedPosts: (day.detectedPosts ?? 0) + accepted,
        totalReactions: (day.totalReactions ?? 0) + totalReactions,
        totalComments: (day.totalComments ?? 0) + totalComments,
        updatedAt: ts,
      }).where(eq(dailyGroupStats.id, day.id)).run();
    } else {
      db.insert(dailyGroupStats).values({
        id: newId('dgs'), groupId, date: today,
        detectedPosts: accepted, totalReactions, totalComments,
        createdAt: ts, updatedAt: ts,
      }).run();
    }

    return { accepted, matchedAuthors: matched, unmatchedAuthors: unmatched };
  });
}
