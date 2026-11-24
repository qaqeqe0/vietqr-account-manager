// "Thêm bằng mã QR" strip shown at the top of the add-account form: scan the current
// page, pick an image, use the camera, or paste/drop an image of a VietQR code.
// File pickers and camera prompts close or fail inside the extension popup, so in the
// popup those two buttons hand off to the full-tab view.
import { scanImageBlob } from './qr-image-decoder.js';
import { resolveHolderName } from './holder-name-resolver.js';
import { canCaptureTab, isExtensionPage, scanVisibleTab, pickImageFile, openCameraScanner } from './qr-scan-sources.js';
import { el, ICONS } from './ui-helpers.js';

/**
 * @param {{isPopup: boolean, onResult: (parsed) => void, onOpenTab: (hash: string) => void}} options
 * @returns {{node: HTMLElement, scanBlob: (blob: Blob) => Promise<void>, scanBlobs: (blobs: Blob[]) => Promise<void>,
 *           startCamera: () => void, setStatus: Function}}
 */
export function createScanStrip({ isPopup, onResult, onOpenTab }) {
  const handOff = isPopup && isExtensionPage;
  const status = el('p', { class: 'scan-status', role: 'status', 'aria-live': 'polite', hidden: true });

  function setStatus(text, type = '') {
    status.textContent = text;
    status.className = `scan-status ${type}`.trim();
    status.hidden = !text;
  }

  // A decoded QR rarely carries the holder name, so fill it from the picture or lookup.
  async function finish(result) {
    const { image, box, ...fields } = result;
    const holder = await resolveHolderName(result, (message) => setStatus(message));
    image?.close?.();
    setStatus('');
    onResult({ ...fields, accountName: holder.name, nameSource: holder.source, nameNote: holder.note });
  }

  // The task is called synchronously so a file picker still has the click's user activation.
  async function run(task) {
    setStatus('Đang đọc mã QR…');
    try {
      const result = await task();
      if (!result) { setStatus(''); return; }
      if (result.ok) await finish(result); else setStatus(result.error, 'err');
    } catch (error) {
      setStatus(error.message || 'Không đọc được mã QR', 'err');
    }
  }

  const startCamera = () => openCameraScanner((result) => finish(result).catch((error) => setStatus(error.message, 'err')));
  const button = (icon, label, onclick, extra = {}) => el('button', { type: 'button', class: 'btn btn-ghost scan-btn', onclick, ...extra },
    el('span', { html: ICONS[icon] }), label);

  const buttons = [
    canCaptureTab && isPopup
      ? button('scan', 'Quét QR trên trang', () => run(scanVisibleTab), { title: 'Đọc mã QR đang hiện trên tab bạn đang xem' })
      : null,
    button('image', 'Chọn ảnh', () => (handOff
      ? onOpenTab('#scan-file')
      : run(async () => { const file = await pickImageFile(); return file ? scanImageBlob(file) : null; })),
    { title: handOff ? 'Mở toàn tab để chọn ảnh' : 'Chọn ảnh có mã QR' }),
    button('camera', 'Camera', () => (handOff ? onOpenTab('#scan-camera') : startCamera()),
      { title: handOff ? 'Mở toàn tab để dùng camera' : 'Quét bằng camera' }),
  ];

  const node = el('div', { class: 'scan-strip' },
    el('div', { class: 'scan-title' }, 'Thêm nhanh bằng mã QR'),
    el('div', { class: 'scan-buttons' }, ...buttons),
    el('p', { class: 'field-hint' }, 'Hoặc dán (⌘/Ctrl + V) hay kéo thả ảnh mã QR vào form này.'),
    status,
  );

  // Tries each image in turn (e.g. the right-clicked picture, then a screenshot of the page).
  const scanBlobs = (blobs) => run(async () => {
    let last = null;
    for (const blob of blobs.filter(Boolean)) {
      try {
        last = await scanImageBlob(blob);
        if (last.ok) return last;
      } catch (error) {
        last = { ok: false, error: error.message };
      }
    }
    return last || { ok: false, error: 'Không có ảnh để quét' };
  });

  return { node, scanBlob: (blob) => scanBlobs([blob]), scanBlobs, startCamera, setStatus };
}
