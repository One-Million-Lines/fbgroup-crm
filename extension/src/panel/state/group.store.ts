import { create } from 'zustand';
import type { DetectedFbGroup } from '../../shared/types';
import { MSG } from '../../shared/messages';
import {
  detectGroup as apiDetect, startMemberScan, chunkMemberScan, finishMemberScan,
  scanPosts as apiScanPosts, listMembers, getStats,
} from '../api/groups';

async function getActiveTab(): Promise<{ tabId: number | null; url: string | null }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_FACEBOOK_TAB' }, (r) => resolve(r ?? { tabId: null, url: null }));
  });
}

async function sendToTab<T>(tabId: number, msg: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve(resp as T);
    });
  });
}

type GroupState = {
  detected: DetectedFbGroup | null;
  groupId: string | null;
  members: Array<Record<string, unknown>>;
  stats: Record<string, number> | null;
  scanSessionId: string | null;
  scanStatus: 'idle' | 'scanning' | 'finishing' | 'error';
  scanInfo: { unique: number; chunks: number } | null;
  postScanInfo: { accepted: number; matched: number } | null;
  error: string | null;

  refreshDetect: () => Promise<void>;
  startScan: (subTab?: string) => Promise<void>;
  scanMore: () => Promise<void>;
  finishScan: (scope?: 'all' | 'sub_tab_only') => Promise<void>;
  scanPostsOnce: () => Promise<void>;
  loadMembers: () => Promise<void>;
  loadStats: () => Promise<void>;
};

export const useGroup = create<GroupState>((set, get) => ({
  detected: null, groupId: null, members: [], stats: null,
  scanSessionId: null, scanStatus: 'idle', scanInfo: null, postScanInfo: null, error: null,

  refreshDetect: async () => {
    set({ error: null });
    const { tabId } = await getActiveTab();
    if (!tabId) { set({ detected: null, groupId: null, error: 'Open a facebook.com/groups/* page' }); return; }
    try {
      const resp = await sendToTab<{ ok: boolean; group: DetectedFbGroup | null; error?: string }>(
        tabId, { type: MSG.DETECT_GROUP }
      );
      if (!resp?.ok || !resp.group) { set({ detected: null, error: resp?.error ?? 'Could not detect group' }); return; }
      const created = await apiDetect({
        url: resp.group.url,
        name: resp.group.name,
        description: resp.group.description,
        avatarUrl: resp.group.avatarUrl,
        privacy: resp.group.privacy,
        visibleMemberCount: resp.group.visibleMemberCount,
      });
      set({ detected: resp.group, groupId: created.group.id, stats: created.stats });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  startScan: async (subTab) => {
    const groupId = get().groupId; if (!groupId) return;
    set({ scanStatus: 'scanning', scanInfo: { unique: 0, chunks: 0 }, error: null });
    try {
      const r = await startMemberScan(groupId, subTab);
      set({ scanSessionId: r.scanSessionId });
      await get().scanMore();
    } catch (e) { set({ error: (e as Error).message, scanStatus: 'error' }); }
  },

  scanMore: async () => {
    const { groupId, scanSessionId, scanInfo } = get();
    if (!groupId || !scanSessionId) return;
    const { tabId } = await getActiveTab();
    if (!tabId) return;
    try {
      const resp = await sendToTab<{ ok: boolean; members: unknown[]; error?: string }>(
        tabId, { type: MSG.SCAN_VISIBLE_MEMBERS }
      );
      if (!resp?.ok) throw new Error(resp?.error ?? 'scan failed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await chunkMemberScan(groupId, scanSessionId, resp.members as any);
      set({ scanInfo: { unique: r.uniqueDetectedSoFar, chunks: (scanInfo?.chunks ?? 0) + 1 } });
    } catch (e) { set({ error: (e as Error).message }); }
  },

  finishScan: async (scope) => {
    const { groupId, scanSessionId } = get();
    if (!groupId || !scanSessionId) return;
    set({ scanStatus: 'finishing' });
    try {
      await finishMemberScan(groupId, scanSessionId, scope);
      set({ scanStatus: 'idle', scanSessionId: null });
      await get().loadMembers();
      await get().loadStats();
    } catch (e) { set({ error: (e as Error).message, scanStatus: 'error' }); }
  },

  scanPostsOnce: async () => {
    const { groupId } = get(); if (!groupId) return;
    const { tabId } = await getActiveTab(); if (!tabId) return;
    try {
      const resp = await sendToTab<{ ok: boolean; posts: unknown[]; error?: string }>(
        tabId, { type: MSG.SCAN_VISIBLE_POSTS }
      );
      if (!resp?.ok) throw new Error(resp?.error ?? 'post scan failed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await apiScanPosts(groupId, resp.posts as any);
      set({ postScanInfo: { accepted: r.accepted, matched: r.matchedAuthors } });
      await get().loadStats();
    } catch (e) { set({ error: (e as Error).message }); }
  },

  loadMembers: async () => {
    const { groupId } = get(); if (!groupId) return;
    try {
      const r = await listMembers(groupId, { page: 1 });
      set({ members: r.members });
    } catch (e) { set({ error: (e as Error).message }); }
  },

  loadStats: async () => {
    const { groupId } = get(); if (!groupId) return;
    try {
      const r = await getStats(groupId);
      set({ stats: r.summary });
    } catch (e) { set({ error: (e as Error).message }); }
  },
}));
