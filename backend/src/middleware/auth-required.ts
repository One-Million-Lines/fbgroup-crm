import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authRequired: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId?: string;
    workspaceId?: string;
  }
}

export async function authRequired(req: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await req.jwtVerify<{ sub: string; wsId?: string }>();
    req.userId = decoded.sub;
    req.workspaceId = decoded.wsId;
    if (!req.workspaceId) return reply.code(403).send({ error: 'no_workspace' });
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
}
