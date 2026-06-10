import { MSG } from '../shared/messages';
import { detectGroup } from './group-detector';
import { scanVisibleMembers } from './member-scanner';
import { scanVisiblePosts } from './post-scanner';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  try {
    if (msg?.type === MSG.DETECT_GROUP) {
      sendResponse({ ok: true, group: detectGroup() });
      return false;
    }
    if (msg?.type === MSG.SCAN_VISIBLE_MEMBERS) {
      sendResponse({ ok: true, members: scanVisibleMembers() });
      return false;
    }
    if (msg?.type === MSG.SCAN_VISIBLE_POSTS) {
      sendResponse({ ok: true, posts: scanVisiblePosts() });
      return false;
    }
  } catch (e) {
    sendResponse({ ok: false, error: (e as Error).message });
    return false;
  }
  return false;
});
