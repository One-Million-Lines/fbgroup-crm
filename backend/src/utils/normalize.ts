/**
 * Facebook profile URL parsing.
 *
 * Supports:
 *   - https://www.facebook.com/zuck
 *   - https://www.facebook.com/profile.php?id=4
 *   - https://www.facebook.com/groups/123/user/456/
 *   - relative paths (/zuck, /profile.php?id=4)
 */
const HOST_REGEX = /^https?:\/\/(?:[a-z0-9.-]+\.)?facebook\.com/i;

export function normalizeProfileUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Strip trailing query params we don't care about, but keep id=
  try {
    const u = trimmed.startsWith('http') ? new URL(trimmed) : new URL(trimmed, 'https://www.facebook.com/');
    u.hash = '';
    // Keep only the id param if present
    const id = u.searchParams.get('id');
    u.search = id ? `?id=${id}` : '';
    // Normalize host
    u.host = 'www.facebook.com';
    // Remove trailing slash
    let pathname = u.pathname.replace(/\/+$/, '');
    if (!pathname) pathname = '/';
    u.pathname = pathname;
    return u.toString();
  } catch {
    return null;
  }
}

export type ProfileIdentity = {
  url: string | null;
  fbid: string | null;       // numeric id when known
  username: string | null;   // vanity slug when known
};

export function extractProfileIdentity(input: string | null | undefined): ProfileIdentity {
  const url = normalizeProfileUrl(input);
  if (!url) return { url: null, fbid: null, username: null };
  try {
    const u = new URL(url);
    const id = u.searchParams.get('id');
    if (id && /^\d+$/.test(id)) {
      return { url, fbid: id, username: null };
    }
    // /<username> at top level (avoid groups, profile.php, etc.)
    const path = u.pathname.replace(/^\/+|\/+$/g, '');
    if (path && !path.includes('/') && !['profile.php', 'groups', 'pages', 'people'].includes(path)) {
      return { url, fbid: null, username: path };
    }
    // /people/Name/123456 form
    const peopleMatch = u.pathname.match(/^\/people\/[^/]+\/(\d+)/);
    if (peopleMatch) {
      return { url, fbid: peopleMatch[1], username: null };
    }
    return { url, fbid: null, username: null };
  } catch {
    return { url, fbid: null, username: null };
  }
}

export function normalizeName(input: string | null | undefined): string | null {
  if (!input) return null;
  return input.trim().replace(/\s+/g, ' ').toLowerCase() || null;
}

export function extractGroupIdFromUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const u = input.startsWith('http') ? new URL(input) : new URL(input, 'https://www.facebook.com/');
    if (!HOST_REGEX.test(u.toString())) return null;
    const m = u.pathname.match(/\/groups\/([^/]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
