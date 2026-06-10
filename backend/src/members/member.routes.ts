import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import {
  groupMembers, members, notes, tags, groupMemberTags,
} from '../db/schema.workspace.js';
import { nowIso } from '../utils/ids.js';

const PatchSchema = z.object({
  displayName: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  subscriptionStartAt: z.string().optional(),
  subscriptionEndAt: z.string().optional(),
  paymentStatus: z.string().optional(),
  source: z.string().optional(),
});

export async function memberRoutes(app: FastifyInstance) {
  app.get('/groups/:groupId/members', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const q = req.query as { search?: string; status?: string; role?: string; page?: string; pageSize?: string };
    const db = workspaceDb(req.workspaceId!);
    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize ?? 50)));

    const conditions = [eq(groupMembers.groupId, groupId)];
    if (q.status) conditions.push(eq(groupMembers.status, q.status));
    if (q.role) conditions.push(eq(groupMembers.role, q.role));

    const allGms = db.select().from(groupMembers).where(and(...conditions)).all();
    const enriched = allGms.map((gm) => {
      const m = db.select().from(members).where(eq(members.id, gm.memberId)).get();
      const tagLinks = db.select().from(groupMemberTags).where(eq(groupMemberTags.groupMemberId, gm.id)).all();
      const tagNames = tagLinks.map((tl) => db.select().from(tags).where(eq(tags.id, tl.tagId)).get()?.name).filter(Boolean) as string[];
      const noteCount = db.select().from(notes).where(eq(notes.groupMemberId, gm.id)).all().length;
      return {
        groupMemberId: gm.id,
        memberId: gm.memberId,
        displayName: m?.displayName ?? null,
        profileUrl: m?.profileUrl ?? null,
        fbid: m?.fbid ?? null,
        username: m?.username ?? null,
        profileImageUrl: m?.profileImageUrl ?? null,
        role: gm.role,
        status: gm.status,
        subscriptionStatus: gm.subscriptionStatus,
        paymentStatus: gm.paymentStatus,
        lastPostAt: gm.lastPostAt,
        postCount: gm.postCount,
        commentCount: gm.commentCount,
        reactionCount: gm.reactionCount,
        tags: tagNames,
        notesCount: noteCount,
      };
    });

    let filtered = enriched;
    if (q.search) {
      const s = q.search.toLowerCase();
      filtered = enriched.filter((m) =>
        (m.displayName ?? '').toLowerCase().includes(s) ||
        (m.username ?? '').toLowerCase().includes(s) ||
        (m.fbid ?? '').includes(s)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return {
      members: filtered.slice(start, start + pageSize),
      pagination: { page, pageSize, total },
    };
  });

  app.get('/groups/:groupId/members/:groupMemberId', { preHandler: [app.authRequired] }, async (req, reply) => {
    const { groupMemberId } = req.params as { groupMemberId: string };
    const db = workspaceDb(req.workspaceId!);
    const gm = db.select().from(groupMembers).where(eq(groupMembers.id, groupMemberId)).get();
    if (!gm) return reply.code(404).send({ error: 'not_found' });
    const m = db.select().from(members).where(eq(members.id, gm.memberId)).get();
    const ns = db.select().from(notes).where(eq(notes.groupMemberId, gm.id)).all();
    const tagLinks = db.select().from(groupMemberTags).where(eq(groupMemberTags.groupMemberId, gm.id)).all();
    const tagList = tagLinks.map((tl) => db.select().from(tags).where(eq(tags.id, tl.tagId)).get()).filter(Boolean);
    return {
      member: {
        groupMemberId: gm.id,
        displayName: m?.displayName,
        profileUrl: m?.profileUrl,
        fbid: m?.fbid,
        username: m?.username,
        profileImageUrl: m?.profileImageUrl,
        bio: m?.bio,
        location: m?.location,
        role: gm.role,
        status: gm.status,
        subscriptionStatus: gm.subscriptionStatus,
        subscriptionStartAt: gm.subscriptionStartAt,
        subscriptionEndAt: gm.subscriptionEndAt,
        paymentStatus: gm.paymentStatus,
        source: gm.source,
        lastSeenInGroupAt: gm.lastSeenInGroupAt,
        lastPostAt: gm.lastPostAt,
        postCount: gm.postCount,
        commentCount: gm.commentCount,
        reactionCount: gm.reactionCount,
        tags: tagList.map((t) => ({ id: t!.id, name: t!.name, color: t!.color })),
        notes: ns.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt })),
      },
    };
  });

  app.patch('/groups/:groupId/members/:groupMemberId', { preHandler: [app.authRequired] }, async (req, reply) => {
    const { groupMemberId } = req.params as { groupMemberId: string };
    const body = PatchSchema.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    const ts = nowIso();
    const gm = db.select().from(groupMembers).where(eq(groupMembers.id, groupMemberId)).get();
    if (!gm) return reply.code(404).send({ error: 'not_found' });

    if (body.displayName) {
      db.update(members).set({ displayName: body.displayName, updatedAt: ts })
        .where(eq(members.id, gm.memberId)).run();
    }
    db.update(groupMembers).set({
      role: body.role ?? gm.role,
      status: body.status ?? gm.status,
      subscriptionStatus: body.subscriptionStatus ?? gm.subscriptionStatus,
      subscriptionStartAt: body.subscriptionStartAt ?? gm.subscriptionStartAt,
      subscriptionEndAt: body.subscriptionEndAt ?? gm.subscriptionEndAt,
      paymentStatus: body.paymentStatus ?? gm.paymentStatus,
      source: body.source ?? gm.source,
      updatedAt: ts,
    }).where(eq(groupMembers.id, groupMemberId)).run();

    return { success: true };
  });
}
