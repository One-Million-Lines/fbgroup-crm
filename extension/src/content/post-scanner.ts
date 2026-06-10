import type { ExtractedFbPost } from '../shared/types';
import { absUrl, visibleText } from './dom-utils';

function parseCount(label: string | null | undefined): number {
  if (!label) return 0;
  const m = label.replace(/[,\s]/g, '').match(/([\d.]+)([KkMm]?)/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return 0;
  const mult = m[2]?.toLowerCase() === 'k' ? 1000 : m[2]?.toLowerCase() === 'm' ? 1_000_000 : 1;
  return Math.round(n * mult);
}

export function scanVisiblePosts(): ExtractedFbPost[] {
  const out: ExtractedFbPost[] = [];
  const articles = document.querySelectorAll<HTMLElement>('div[role="article"]');
  const seen = new Set<string>();

  for (const article of Array.from(articles)) {
    // Author: first profile-like anchor with text
    const authorAnchor = article.querySelector<HTMLAnchorElement>(
      'a[role="link"][href*="/user/"], a[role="link"][href*="profile.php"], h3 a[role="link"]'
    );
    const authorLabel = authorAnchor ? visibleText(authorAnchor) || null : null;
    const authorProfileUrl = authorAnchor ? absUrl(authorAnchor.getAttribute('href')) : null;

    // Permalink + timestamp
    const permalinkAnchor = article.querySelector<HTMLAnchorElement>(
      'a[href*="/posts/"], a[href*="/permalink/"], a[role="link"][href*="/groups/"][href*="?"]'
    );
    const fbPostUrl = permalinkAnchor ? absUrl(permalinkAnchor.getAttribute('href')) : null;
    const postedAt = permalinkAnchor?.getAttribute('aria-label') ?? null;

    if (!fbPostUrl && !authorProfileUrl) continue;
    const dedupKey = fbPostUrl || `${authorProfileUrl}|${visibleText(article).slice(0, 80)}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    // Reactions / comments / shares from aria-labels of count buttons
    const reactionsLabel =
      article.querySelector('[aria-label*="reaction"], [aria-label*="Like"]')?.getAttribute('aria-label') ?? null;
    const commentsLabel =
      article.querySelector('[aria-label*="comment"]')?.getAttribute('aria-label') ?? null;
    const sharesLabel =
      article.querySelector('[aria-label*="share"]')?.getAttribute('aria-label') ?? null;

    const hasMedia = !!article.querySelector('img[alt][src*="scontent"], video');

    out.push({
      fbPostUrl,
      authorLabel,
      authorProfileUrl,
      postedAt,
      reactionCount: parseCount(reactionsLabel),
      commentCount: parseCount(commentsLabel),
      shareCount: parseCount(sharesLabel),
      hasMedia,
      detectedAt: new Date().toISOString(),
    });
  }
  return out;
}
