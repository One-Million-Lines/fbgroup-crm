import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import { notes } from '../db/schema.workspace.js';
import { newId, nowIso } from '../utils/ids.js';

const NoteSchema = z.object({ body: z.string().min(1) });

export async function noteRoutes(app: FastifyInstance) {
  app.post('/groups/:groupId/members/:groupMemberId/notes', { preHandler: [app.authRequired] }, async (req) => {
    const { groupMemberId } = req.params as { groupMemberId: string };
    const body = NoteSchema.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    const ts = nowIso();
    const id = newId('note');
    db.insert(notes).values({
      id, groupMemberId, body: body.body,
      createdByUserId: req.userId!, createdAt: ts, updatedAt: ts,
    }).run();
    return { note: { id, body: body.body, createdAt: ts } };
  });

  app.delete('/notes/:noteId', { preHandler: [app.authRequired] }, async (req) => {
    const { noteId } = req.params as { noteId: string };
    const db = workspaceDb(req.workspaceId!);
    db.delete(notes).where(eq(notes.id, noteId)).run();
    return { success: true };
  });
}
