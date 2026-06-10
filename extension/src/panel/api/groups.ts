import { api } from './client';
import type { ExtractedFbMember, ExtractedFbPost } from '../../shared/types';

export async function detectGroup(input: {
  url: string; name?: string | null; description?: string | null;
  avatarUrl?: string | null; privacy?: string | null; visibleMemberCount?: number | null;
}) {
  return api<{ group: { id: string; fbGroupId: string; name: string | null }; isNew: boolean; stats: Record<string, number> }>(
    '/groups/detect', { method: 'POST', body: JSON.stringify(input) }
  );
}

export async function listGroups() {
  return api<{ groups: Array<{ id: string; fbGroupId: string; name: string | null }> }>('/groups');
}

export async function startMemberScan(groupId: string, subTab?: string) {
  return api<{ scanSessionId: string }>(
    `/groups/${groupId}/scans/members/start`,
    { method: 'POST', body: JSON.stringify({ subTab }) }
  );
}

export async function chunkMemberScan(groupId: string, scanSessionId: string, members: ExtractedFbMember[]) {
  return api<{ accepted: number; uniqueDetectedSoFar: number }>(
    `/groups/${groupId}/scans/members/chunk`,
    { method: 'POST', body: JSON.stringify({ scanSessionId, members }) }
  );
}

export async function finishMemberScan(groupId: string, scanSessionId: string, scope?: 'all' | 'sub_tab_only') {
  return api<{ summary: Record<string, unknown> }>(
    `/groups/${groupId}/scans/members/finish`,
    { method: 'POST', body: JSON.stringify({ scanSessionId, scope }) }
  );
}

export async function scanPosts(groupId: string, posts: ExtractedFbPost[]) {
  return api<{ accepted: number; matchedAuthors: number; unmatchedAuthors: number }>(
    `/groups/${groupId}/scans/posts`,
    { method: 'POST', body: JSON.stringify({ posts }) }
  );
}

export async function listMembers(groupId: string, q: { search?: string; status?: string; role?: string; page?: number } = {}) {
  const sp = new URLSearchParams();
  if (q.search) sp.set('search', q.search);
  if (q.status) sp.set('status', q.status);
  if (q.role) sp.set('role', q.role);
  if (q.page) sp.set('page', String(q.page));
  return api<{ members: Array<Record<string, unknown>>; pagination: { total: number; page: number; pageSize: number } }>(
    `/groups/${groupId}/members?${sp.toString()}`
  );
}

export async function getStats(groupId: string) {
  return api<{ summary: Record<string, number>; daily: Array<Record<string, unknown>> }>(
    `/groups/${groupId}/stats`
  );
}
