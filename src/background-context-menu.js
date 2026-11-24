// Right-click menu: "Quét mã VietQR trên trang này" (anywhere on a page) and
// "Thêm tài khoản từ mã QR trong ảnh này" (on an image). The click grants activeTab, so the
// worker screenshots the visible tab right away, parks it in session storage, and opens
// the popup (or a full tab when the browser cannot open the popup), which scans it.
import { PENDING_SCAN_KEY } from './background-context-menu-keys.js';

const MENU_PAGE = 'vietqr-scan-page';
const MENU_IMAGE = 'vietqr-scan-image';

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_PAGE, title: 'Quét mã VietQR trên trang này', contexts: ['page', 'frame', 'selection', 'link'] });
    chrome.contextMenus.create({ id: MENU_IMAGE, title: 'Thêm tài khoản từ mã QR trong ảnh này', contexts: ['image'] });
  });
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (![MENU_PAGE, MENU_IMAGE].includes(info.menuItemId)) return;
  const pending = { at: Date.now(), imageUrl: info.menuItemId === MENU_IMAGE ? info.srcUrl || '' : '', screenshot: '', error: '' };
  try {
    // JPEG keeps a full-page screenshot well under the session storage quota.
    pending.screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 95 });
  } catch {
    pending.error = 'Không chụp được trang này (trang chrome:// hoặc Cửa hàng Chrome không cho phép).';
  }
  await chrome.storage.session.set({ [PENDING_SCAN_KEY]: pending });
  try {
    await chrome.action.openPopup({ windowId: tab.windowId });
  } catch {
    await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?view=tab'), index: tab.index + 1 });
  }
});
