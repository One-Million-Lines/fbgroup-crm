import type { DetectedFbGroup } from '../shared/types';
import {
  extractGroupIdFromUrl, extractMemberCountFromText, getCurrentSubTab,
  isMembersPage, visibleText,
} from './dom-utils';

export function detectGroup(): DetectedFbGroup | null {
  const url = window.location.href;
  const fbGroupId = extractGroupIdFromUrl(url);
  if (!fbGroupId) return null;

  // Group name: prefer h1, fallback document.title
  const h1 = document.querySelector('h1');
  let name = visibleText(h1);
  if (!name) {
    const t = document.title.split('|')[0].trim();
    if (t && t !== 'Facebook') name = t;
  }

  // Avatar: a square image inside the group header (best effort)
  const avatarImg = document.querySelector<HTMLImageElement>(
    'a[href*="/groups/' + fbGroupId + '/"] image, a[href*="/groups/' + fbGroupId + '/"] img'
  );
  const avatarUrl = avatarImg?.getAttribute('xlink:href') ?? avatarImg?.getAttribute('src') ?? null;

  // Privacy: heuristic from sidebar text
  const bodyText = visibleText(document.body).toLowerCase();
  let privacy: 'public' | 'private' | null = null;
  if (/\bprivate\s+group\b/.test(bodyText)) privacy = 'private';
  else if (/\bpublic\s+group\b/.test(bodyText)) privacy = 'public';

  // Member count
  const visibleMemberCount = extractMemberCountFromText(bodyText);

  return {
    url,
    fbGroupId,
    name: name || null,
    description: null,
    avatarUrl,
    privacy,
    visibleMemberCount,
    isMembersPageOpen: isMembersPage(),
    currentSubTab: getCurrentSubTab(),
  };
}
