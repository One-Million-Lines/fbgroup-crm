// Background service worker - opens side panel and provides cross-tab helpers
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      console.error('sidePanel.open failed', e);
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_ACTIVE_FACEBOOK_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url && /facebook\.com\/groups\//i.test(tab.url)) {
        sendResponse({ tabId: tab.id, url: tab.url });
      } else {
        sendResponse({ tabId: null, url: null });
      }
    });
    return true;
  }
  return false;
});
