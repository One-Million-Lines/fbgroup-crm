import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRequired } from './middleware/auth-required.js';
import { authRoutes } from './auth/auth.routes.js';
import { groupRoutes } from './groups/group.routes.js';
import { memberRoutes } from './members/member.routes.js';
import { scanRoutes } from './scans/scan.routes.js';
import { postScanRoutes } from './scans/post-scan.routes.js';
import { noteRoutes } from './notes/note.routes.js';
import { tagRoutes } from './tags/tag.routes.js';
import { statsRoutes } from './stats/stats.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.length === 0) return cb(null, true);
      const ok = env.CORS_ORIGINS.some((p) => {
        if (p === '*') return true;
        if (p.endsWith('/*')) return origin.startsWith(p.slice(0, -2));
        return p === origin;
      });
      cb(null, ok);
    },
    credentials: true,
  });

  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  app.decorate('authRequired', authRequired);

  app.get('/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes);
  await app.register(groupRoutes);
  await app.register(memberRoutes);
  await app.register(scanRoutes);
  await app.register(postScanRoutes);
  await app.register(noteRoutes);
  await app.register(tagRoutes);
  await app.register(statsRoutes);

  app.setErrorHandler((err, req, reply) => {
    if ((err as { validation?: unknown }).validation) {
      return reply.code(400).send({ error: 'validation_error', details: err.message });
    }
    req.log.error(err);
    reply.code(err.statusCode ?? 500).send({ error: err.message });
  });
  return app;
}
