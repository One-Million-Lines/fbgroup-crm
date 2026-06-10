import type { FastifyInstance } from 'fastify';
import { and, eq, gte, lte } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import { dailyGroupStats } from '../db/schema.workspace.js';

export async function statsRoutes(app: FastifyInstance) {
  app.get('/groups/:groupId/stats', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const q = req.query as { from?: string; to?: string };
    const db = workspaceDb(req.workspaceId!);
    const conds = [eq(dailyGroupStats.groupId, groupId)];
    if (q.from) conds.push(gte(dailyGroupStats.date, q.from));
    if (q.to) conds.push(lte(dailyGroupStats.date, q.to));
    const rows = db.select().from(dailyGroupStats).where(and(...conds)).all();
    const summary = rows.reduce((acc, r) => ({
      totalMembers: r.totalMembers ?? 0,
      newMembers: acc.newMembers + (r.newMembers ?? 0),
      leftMembers: acc.leftMembers + (r.leftMembers ?? 0),
      activeMembers: acc.activeMembers + (r.activeMembers ?? 0),
      detectedPosts: acc.detectedPosts + (r.detectedPosts ?? 0),
      totalReactions: acc.totalReactions + (r.totalReactions ?? 0),
      totalComments: acc.totalComments + (r.totalComments ?? 0),
    }), { totalMembers: 0, newMembers: 0, leftMembers: 0, activeMembers: 0, detectedPosts: 0, totalReactions: 0, totalComments: 0 });
    return { summary, daily: rows };
  });
}
