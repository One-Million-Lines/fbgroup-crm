import { and, eq, or } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.workspace.js';
import { members, groupMembers } from '../db/schema.workspace.js';
import { newId, nowIso } from '../utils/ids.js';
import {
  extractProfileIdentity, normalizeName, normalizeProfileUrl,
} from '../utils/normalize.js';

export type IncomingMember = {
  rawLabel?: string | null;
  displayName?: string | null;
  profileUrl?: string | null;
  profileImageUrl?: string | null;
  role?: 'admin' | 'moderator' | 'member' | 'new_member' | null;
  bio?: string | null;
  location?: string | null;
  detectedAt?: string;
};

export type MatchResult = {
  memberId: string;
  groupMemberId: string;
  resultType: 'created' | 'matched_fbid' | 'matched_username' | 'matched_url' | 'matched_name' | 'updated';
  confidence: number;
};

type WsDb = BetterSQLite3Database<typeof schema>;

export function matchOrCreateMember(db: WsDb, groupId: string, m: IncomingMember): MatchResult {
  const ts = nowIso();
  const ident = extractProfileIdentity(m.profileUrl ?? null);
  const url = ident.url;
  const fbid = ident.fbid;
  const username = ident.username;
  const nameNorm = normalizeName(m.displayName);

  let existing: typeof members.$inferSelect | undefined;
  let confidence = 0;
  let resultType: MatchResult['resultType'] = 'created';

  // 1. fbid match (strongest)
  if (fbid) {
    existing = db.select().from(members).where(eq(members.fbid, fbid)).get();
    if (existing) { confidence = 1.0; resultType = 'matched_fbid'; }
  }
  // 2. username match
  if (!existing && username) {
    existing = db.select().from(members).where(eq(members.username, username)).get();
    if (existing) { confidence = 0.95; resultType = 'matched_username'; }
  }
  // 3. profile URL match
  if (!existing && url) {
    existing = db.select().from(members).where(eq(members.profileUrl, url)).get();
    if (existing) { confidence = 0.9; resultType = 'matched_url'; }
  }
  // 4. weak name match within this group only
  if (!existing && nameNorm) {
    const gms = db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId)).all();
    for (const gm of gms) {
      const cand = db.select().from(members).where(eq(members.id, gm.memberId)).get();
      if (cand && normalizeName(cand.displayName) === nameNorm) {
        existing = cand;
        confidence = 0.45;
        resultType = 'matched_name';
        break;
      }
    }
  }

  let memberId: string;
  if (existing) {
    memberId = existing.id;
    db.update(members).set({
      displayName: m.displayName ?? existing.displayName,
      profileUrl: url ?? existing.profileUrl,
      fbid: fbid ?? existing.fbid,
      username: username ?? existing.username,
      profileImageUrl: m.profileImageUrl ?? existing.profileImageUrl,
      bio: m.bio ?? existing.bio,
      location: m.location ?? existing.location,
      lastSeenAt: ts,
      updatedAt: ts,
    }).where(eq(members.id, memberId)).run();
  } else {
    memberId = newId('member');
    db.insert(members).values({
      id: memberId,
      displayName: m.displayName ?? null,
      profileUrl: url,
      fbid,
      username,
      profileImageUrl: m.profileImageUrl ?? null,
      bio: m.bio ?? null,
      location: m.location ?? null,
      firstSeenAt: ts, lastSeenAt: ts, createdAt: ts, updatedAt: ts,
    }).run();
    confidence = 0;
    resultType = 'created';
  }

  // Upsert group_members
  const gmExisting = db.select().from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId))).get();

  let groupMemberId: string;
  if (gmExisting) {
    groupMemberId = gmExisting.id;
    db.update(groupMembers).set({
      role: m.role ?? gmExisting.role ?? 'member',
      status: 'active',
      lastSeenInGroupAt: ts,
      leftAt: null,
      updatedAt: ts,
    }).where(eq(groupMembers.id, groupMemberId)).run();
    if (resultType === 'created') resultType = 'updated';
  } else {
    groupMemberId = newId('gm');
    db.insert(groupMembers).values({
      id: groupMemberId,
      groupId, memberId,
      role: m.role ?? 'member',
      status: 'active',
      firstSeenInGroupAt: ts, lastSeenInGroupAt: ts,
      createdAt: ts, updatedAt: ts,
    }).run();
  }

  return { memberId, groupMemberId, resultType, confidence };
}
