import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import { tags, groupMemberTags } from '../db/schema.workspace.js';
import { newId, nowIso } from '../utils/ids.js';

const TagCreate = z.object({ name: z.string().min(1), color: z.string().optional() });
const AssignSchema = z.object({ tagIds: z.array(z.string()) });

export async function tagRoutes(app: FastifyInstance) {
  app.get('/tags', { preHandler: [app.authRequired] }, async (req) => {
    const db = workspaceDb(req.workspaceId!);
    return { tags: db.select().from(tags).all() };
  });

  app.post('/tags', { preHandler: [app.authRequired] }, async (req, reply) => {
    const body = TagCreate.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    const existing = db.select().from(tags).where(eq(tags.name, body.name)).get();
    if (existing) return reply.code(200).send({ tag: existing });
    const id = newId('tag');
    const row = { id, name: body.name, color: body.color ?? null, createdAt: nowIso() };
    db.insert(tags).values(row).run();
    return { tag: row };
  });

  app.post('/groups/:groupId/members/:groupMemberId/tags', { preHandler: [app.authRequired] }, async (req) => {
    const { groupMemberId } = req.params as { groupMemberId: string };
    const body = AssignSchema.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    db.delete(groupMemberTags).where(eq(groupMemberTags.groupMemberId, groupMemberId)).run();
    for (const tagId of body.tagIds) {
      db.insert(groupMemberTags).values({ groupMemberId, tagId }).run();
    }
    return { success: true };
  });
}
