import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { workspaceDb } from '../db/index.js';
import {
  scanSessions, scanMemberResults, groupMembers, dailyGroupStats,
} from '../db/schema.workspace.js';
import { newId, nowIso } from '../utils/ids.js';
import { matchOrCreateMember, type IncomingMember } from '../members/member-matcher.js';
import { extractProfileIdentity } from '../utils/normalize.js';

const StartSchema = z.object({
  subTab: z.enum(['admins', 'moderators', 'members', 'new_members', 'friends', 'all']).optional(),
});

const ChunkSchema = z.object({
  scanSessionId: z.string(),
  members: z.array(z.object({
    rawLabel: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    profileUrl: z.string().nullable().optional(),
    profileImageUrl: z.string().nullable().optional(),
    role: z.enum(['admin', 'moderator', 'member', 'new_member']).nullable().optional(),
    bio: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    detectedAt: z.string().optional(),
  })),
});

const FinishSchema = z.object({
  scanSessionId: z.string(),
  /**
   * Members panel sub-tab specific behaviour:
   * - 'all' or 'members': any active GM not seen → mark as left
   * - 'admins' / 'moderators': only re-grade roles, do not mark missing as left
   * - 'new_members' / 'friends': additive, never mark missing as left
   */
  scope: z.enum(['all', 'sub_tab_only']).optional(),
});

export async function scanRoutes(app: FastifyInstance) {
  app.post('/groups/:groupId/scans/members/start', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const body = StartSchema.parse(req.body ?? {});
    const db = workspaceDb(req.workspaceId!);
    const id = newId('scan');
    const ts = nowIso();
    db.insert(scanSessions).values({
      id, groupId, scanType: 'members',
      subTab: body.subTab ?? 'all',
      startedAt: ts, createdByUserId: req.userId!,
    }).run();
    return { scanSessionId: id };
  });

  app.post('/groups/:groupId/scans/members/chunk', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const body = ChunkSchema.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    let accepted = 0;
    for (const m of body.members as IncomingMember[]) {
      const ident = extractProfileIdentity(m.profileUrl ?? null);
      const match = matchOrCreateMember(db, groupId, m);
      db.insert(scanMemberResults).values({
        id: newId('smr'),
        scanSessionId: body.scanSessionId,
        groupId,
        memberId: match.memberId,
        rawLabel: m.rawLabel ?? null,
        displayName: m.displayName ?? null,
        profileUrl: ident.url ?? null,
        fbid: ident.fbid ?? null,
        username: ident.username ?? null,
        role: m.role ?? null,
        confidenceScore: match.confidence,
        resultType: match.resultType,
        detectedAt: m.detectedAt ?? nowIso(),
      }).run();
      accepted += 1;
    }
    const uniqueSoFar = new Set(
      db.select().from(scanMemberResults)
        .where(eq(scanMemberResults.scanSessionId, body.scanSessionId)).all()
        .map((r) => r.memberId)
    ).size;
    return { accepted, uniqueDetectedSoFar: uniqueSoFar };
  });

  app.post('/groups/:groupId/scans/members/finish', { preHandler: [app.authRequired] }, async (req) => {
    const { groupId } = req.params as { groupId: string };
    const { scanSessionId, scope } = FinishSchema.parse(req.body);
    const db = workspaceDb(req.workspaceId!);
    const ts = nowIso();
    const today = ts.slice(0, 10);

    const session = db.select().from(scanSessions).where(eq(scanSessions.id, scanSessionId)).get();
    const detected = db.select().from(scanMemberResults)
      .where(eq(scanMemberResults.scanSessionId, scanSessionId)).all();
    const detectedMemberIds = new Set(detected.map((d) => d.memberId).filter(Boolean) as string[]);

    const newMembers = detected.filter((d) => d.resultType === 'created').length;
    const updatedMembers = detected.filter((d) => ['updated', 'matched_fbid', 'matched_username', 'matched_url', 'matched_name'].includes(d.resultType ?? '')).length;

    // Decide whether to mark missing-as-left
    const fullCoverage =
      (scope ?? 'all') === 'all' &&
      (session?.subTab === 'all' || session?.subTab === 'members' || !session?.subTab);

    let missing = 0;
    if (fullCoverage) {
      const allActive = db.select().from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, 'active'))).all();
      for (const gm of allActive) {
        if (!detectedMemberIds.has(gm.memberId)) {
          db.update(groupMembers).set({
            status: 'left', leftAt: ts, updatedAt: ts,
          }).where(eq(groupMembers.id, gm.id)).run();
          missing += 1;
        }
      }
    }

    db.update(scanSessions).set({
      finishedAt: ts,
      totalDetected: detected.length,
      newMembers, missingMembers: missing, updatedMembers,
    }).where(eq(scanSessions.id, scanSessionId)).run();

    const totalActive = db.select().from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, 'active'))).all().length;
    const dayRow = db.select().from(dailyGroupStats)
      .where(and(eq(dailyGroupStats.groupId, groupId), eq(dailyGroupStats.date, today))).get();
    if (dayRow) {
      db.update(dailyGroupStats).set({
        totalMembers: totalActive,
        newMembers: (dayRow.newMembers ?? 0) + newMembers,
        leftMembers: (dayRow.leftMembers ?? 0) + missing,
        updatedAt: ts,
      }).where(eq(dailyGroupStats.id, dayRow.id)).run();
    } else {
      db.insert(dailyGroupStats).values({
        id: newId('dgs'), groupId, date: today,
        totalMembers: totalActive, newMembers, leftMembers: missing,
        createdAt: ts, updatedAt: ts,
      }).run();
    }

    return {
      summary: {
        totalDetected: detected.length, newMembers,
        missingMembers: missing, updatedMembers,
        coveredFullList: fullCoverage,
      },
    };
  });
}
