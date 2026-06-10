import type { ExtractedFbMember, FbRole } from '../shared/types';
import { absUrl, getCurrentSubTab, visibleText } from './dom-utils';

/**
 * Scan visible member cards on /groups/{id}/members or its sub-tabs.
 * Strategy:
 *   1. Find all profile-link anchors that look like a member entry.
 *   2. Walk up to the nearest "card" container.
 *   3. Extract name, avatar, optional bio/location lines.
 *   4. Role is inferred from the active sub-tab (admins/moderators/new_members)
 *      OR from inline labels (e.g. "Admin · ...").
 */
export function scanVisibleMembers(): ExtractedFbMember[] {
  const subTab = getCurrentSubTab();
  const subTabRole: FbRole =
    subTab === 'admins' ? 'admin'
    : subTab === 'moderators' ? 'moderator'
    : subTab === 'new_members' ? 'new_member'
    : 'member';

  const out: ExtractedFbMember[] = [];
  const seen = new Set<string>();

  // Anchors leading to a profile (FB uses /user/<id>/ or /<vanity> or profile.php?id=)
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(
    'a[role="link"][href*="/user/"], a[role="link"][href*="profile.php"], a[role="link"][href^="/"]:not([href*="/groups/"])'
  ));

  for (const a of anchors) {
    const href = absUrl(a.getAttribute('href'));
    if (!href || !/facebook\.com\//.test(href)) continue;
    if (/\/(groups|events|marketplace|watch|gaming|posts)\b/.test(href)) continue;

    const card = a.closest('[role="listitem"], [role="article"], li, div[data-visualcompletion]') as HTMLElement | null;
    if (!card) continue;

    const cardKey = card.getAttribute('data-fbcrm-id') || (card as HTMLElement).outerHTML.slice(0, 60) + href;
    if (seen.has(cardKey)) continue;
    seen.add(cardKey);

    const displayName = visibleText(a).split('\n')[0].slice(0, 200) || null;
    if (!displayName) continue;

    const img = card.querySelector<HTMLImageElement>('image, img');
    const profileImageUrl =
      img?.getAttribute('xlink:href') ?? img?.getAttribute('src') ?? null;

    const cardText = visibleText(card);
    let role: FbRole = subTabRole;
    if (/\bAdmin\b/.test(cardText)) role = 'admin';
    else if (/\bModerator\b/.test(cardText)) role = 'moderator';

    // bio / location are best-effort: short subtitle lines beneath the name
    const bioLine = cardText
      .replace(displayName, '')
      .replace(/\b(Admin|Moderator)\b\s*·?\s*/g, '')
      .trim()
      .slice(0, 280) || null;

    out.push({
      rawLabel: displayName,
      displayName,
      profileUrl: href.split('?fref=')[0],
      profileImageUrl,
      role,
      bio: bioLine,
      location: null,
      detectedAt: new Date().toISOString(),
    });
  }
  return out;
}
