import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { appDb } from '../db/index.js';
import { users, workspaces, workspaceUsers } from '../db/schema.app.js';
import { hashPassword, verifyPassword } from './password.js';
import { newId, nowIso } from '../utils/ids.js';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});
const LoginSchema = z.object({ email: z.string().email(), password: z.string() });

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    const db = appDb();
    if (db.select().from(users).where(eq(users.email, body.email)).get()) {
      return reply.code(409).send({ error: 'email_in_use' });
    }
    const userId = newId('user');
    const wsId = newId('ws');
    const ts = nowIso();
    db.insert(users).values({
      id: userId, email: body.email,
      passwordHash: await hashPassword(body.password),
      name: body.name ?? null, createdAt: ts, updatedAt: ts,
    }).run();
    db.insert(workspaces).values({
      id: wsId, name: body.name ? `${body.name} Workspace` : 'My Workspace',
      ownerUserId: userId, createdAt: ts, updatedAt: ts,
    }).run();
    db.insert(workspaceUsers).values({
      id: newId('wu'), workspaceId: wsId, userId, role: 'owner', createdAt: ts,
    }).run();
    const accessToken = await reply.jwtSign({ sub: userId, wsId }, { expiresIn: '7d' });
    return { accessToken, workspace: { id: wsId, name: 'My Workspace' } };
  });

  app.post('/auth/login', async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    const db = appDb();
    const user = db.select().from(users).where(eq(users.email, body.email)).get();
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' });
    if (!(await verifyPassword(user.passwordHash, body.password))) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }
    const wu = db.select().from(workspaceUsers).where(eq(workspaceUsers.userId, user.id)).get();
    const accessToken = await reply.jwtSign({ sub: user.id, wsId: wu?.workspaceId }, { expiresIn: '7d' });
    return { accessToken };
  });

  app.get('/me', { preHandler: [app.authRequired] }, async (req) => {
    const db = appDb();
    const user = db.select().from(users).where(eq(users.id, req.userId!)).get();
    const wsLinks = db.select().from(workspaceUsers).where(eq(workspaceUsers.userId, req.userId!)).all();
    const wsList = wsLinks.map((l) => {
      const w = db.select().from(workspaces).where(eq(workspaces.id, l.workspaceId)).get();
      return w ? { id: w.id, name: w.name, role: l.role } : null;
    }).filter(Boolean);
    return {
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
      workspaces: wsList,
    };
  });
}
