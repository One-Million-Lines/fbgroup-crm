export function visibleText(el: Element | null | undefined): string {
  if (!el) return '';
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function getCurrentUrl(): string {
  return window.location.href;
}

export function extractGroupIdFromUrl(url: string): string | null {
  const m = url.match(/facebook\.com\/groups\/([^/?#]+)/i);
  return m ? m[1] : null;
}

export function getCurrentSubTab():
  | 'admins' | 'moderators' | 'members' | 'new_members' | 'friends' | null {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/members/admins')) return 'admins';
  if (path.includes('/members/moderators')) return 'moderators';
  if (path.includes('/members/new')) return 'new_members';
  if (path.includes('/members/friends')) return 'friends';
  if (path.includes('/members')) return 'members';
  return null;
}

export function isMembersPage(): boolean {
  return /\/groups\/[^/]+\/members/i.test(window.location.pathname);
}

/** Pull "X members" / "X total members" type counts from any visible text. */
export function extractMemberCountFromText(text: string): number | null {
  const m = text.match(/([\d.,]+)\s*(?:total\s+)?members?/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
  return isNaN(n) ? null : n;
}

/** Resolve a possibly-relative facebook.com URL to absolute. */
export function absUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, window.location.origin).toString();
  } catch {
    return null;
  }
}
