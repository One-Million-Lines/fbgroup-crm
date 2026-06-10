import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import { groups, dailyGroupStats, groupMembers } from '../db/schema.workspace.js';
import { newId, nowIso } from '../utils/ids.js';
import { extractGroupIdFromUrl } from '../utils/normalize.js';

const DetectSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  privacy: z.string().optional().nullable(),
  visibleMemberCount: z.number().int().nonnegative().optional().nullable(),
});

export async function groupRoutes(app: FastifyInstance) {
  app.post('/groups/detect', { preHandler: [app.authRequired] }, async (req, reply) => {
    const body = DetectSchema.parse(req.body);
    const fbGroupId = extractGroupIdFromUrl(body.url);
    if (!fbGroupId) return reply.code(400).send({ error: 'not_a_group_url' });

    const db = workspaceDb(req.workspaceId!);
    const ts = nowIso();
    const existing = db.select().from(groups).where(eq(groups.fbGroupId, fbGroupId)).get();
    const canonical = `https://www.facebook.com/groups/${fbGroupId}`;

    if (existing) {
      db.update(groups).set({
        name: body.name,
        description: body.description ?? existing.description,
        avatarUrl: body.avatarUrl ?? existing.avatarUrl,
        privacy: body.privacy ?? existing.privacy,
        visibleMemberCount: body.visibleMemberCount ?? existing.visibleMemberCount,
        url: canonical,
        lastSeenAt: ts,
        updatedAt: ts,
      }).where(eq(groups.id, existing.id)).run();
      return { group: { ...existing, ...body, fbGroupId, url: canonical, lastSeenAt: ts } };
    }
    const id = newId('group');
    const row = {
      id, platform: 'facebook',
      fbGroupId, url: canonical,
      name: body.name,
      description: body.description ?? null,
      avatarUrl: body.avatarUrl ?? null,
      privacy: body.privacy ?? null,
      visibleMemberCount: body.visibleMemberCount ?? null,
      firstSeenAt: ts, lastSeenAt: ts, createdAt: ts, updatedAt: ts,
    };
    db.insert(groups).values(row).run();
    return { group: row };
  });

  app.get('/groups', { preHandler: [app.authRequired] }, async (req) => {
    const db = workspaceDb(req.workspaceId!);
    const rows = db.select().from(groups).orderBy(desc(groups.lastSeenAt)).all();
    return {
      groups: rows.map((g) => ({
        id: g.id, name: g.name, url: g.url,
        fbGroupId: g.fbGroupId,
        visibleMemberCount: g.visibleMemberCount,
        totalStoredMembers: db.select().from(groupMembers).where(eq(groupMembers.groupId, g.id)).all().length,
        lastSeenAt: g.lastSeenAt,
      })),
    };
  });

  app.get('/groups/:groupId', { preHandler: [app.authRequired] }, async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const db = workspaceDb(req.workspaceId!);
    const g = db.select().from(groups).where(eq(groups.id, groupId)).get();
    if (!g) return reply.code(404).send({ error: 'not_found' });
    const today = nowIso().slice(0, 10);
    const todayStats = db.select().from(dailyGroupStats)
      .where(and(eq(dailyGroupStats.groupId, groupId), eq(dailyGroupStats.date, today))).get();
    const totalStored = db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).all().length;
    return {
      group: {
        ...g,
        stats: {
          totalMembers: totalStored,
          newToday: todayStats?.newMembers ?? 0,
          leftToday: todayStats?.leftMembers ?? 0,
          activeToday: todayStats?.activeMembers ?? 0,
          postsToday: todayStats?.detectedPosts ?? 0,
          reactionsToday: todayStats?.totalReactions ?? 0,
          commentsToday: todayStats?.totalComments ?? 0,
        },
      },
    };
  });

  app.delete('/groups/:groupId', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const db = workspaceDb(req.workspaceId!);
    db.delete(groups).where(eq(groups.id, groupId)).run();
    db.delete(groupMembers).where(eq(groupMembers.groupId, groupId)).run();
    return { success: true };
  });
}
