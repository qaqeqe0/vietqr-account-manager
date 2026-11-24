// Where a QR image can come from: the visible browser tab, a pasted or dropped image,
// a picked file, or the camera. Each returns the parsed VietQR result from qr-image-decoder.
import { decodeQrCodes, pickVietQr, scanImageBlob } from './qr-image-decoder.js';
import { el, openModal } from './ui-helpers.js';

export const isExtensionPage = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
export const canCaptureTab = isExtensionPage && !!chrome.tabs?.captureVisibleTab;

/** Screenshot of the tab the user was on when they opened the popup (needs "activeTab"). */
export async function scanVisibleTab() {
  let dataUrl;
  try {
    dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
  } catch {
    throw new Error('Không chụp được trang này (trang chrome:// hoặc Cửa hàng Chrome không cho phép). Hãy chụp ảnh mã QR rồi dán vào.');
  }
  const blob = await (await fetch(dataUrl)).blob();
  return scanImageBlob(blob);
}

/** Returns the first image File in a paste/drop DataTransfer, or null. */
export function imageFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return null;
  const fromFiles = [...(dataTransfer.files || [])].find((file) => file.type.startsWith('image/'));
  if (fromFiles) return fromFiles;
  const item = [...(dataTransfer.items || [])].find((entry) => entry.kind === 'file' && entry.type.startsWith('image/'));
  return item ? item.getAsFile() : null;
}

/** Opens the OS file picker for one image. Resolves to a File, or null when cancelled. */
export function pickImageFile() {
  return new Promise((resolve) => {
    const input = el('input', { type: 'file', accept: 'image/*', hidden: true });
    input.addEventListener('change', () => { resolve(input.files[0] || null); input.remove(); });
    input.addEventListener('cancel', () => { resolve(null); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

/**
 * Live camera scanner dialog. Calls onResult(parsed) once a VietQR is read, then closes.
 * Non-VietQR codes are reported in the dialog and scanning continues.
 */
export function openCameraScanner(onResult) {
  const video = el('video', { class: 'camera-video', autoplay: true, muted: true, playsinline: true });
  const status = el('p', { class: 'field-hint camera-status' }, 'Đang mở camera…');
  let stream = null;
  let timer = null;
  let busy = false;
  let done = false;

  const stop = () => {
    done = true;
    clearInterval(timer);
    stream?.getTracks().forEach((track) => track.stop());
  };
  const modal = openModal({
    title: 'Quét mã QR bằng camera',
    content: el('div', { class: 'camera-box' }, video, el('div', { class: 'camera-frame' }), status),
    footer: [el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => modal.close() }, 'Huỷ')],
    onClose: stop,
  });

  async function tick() {
    if (busy || done || video.readyState < 2) return;
    busy = true;
    try {
      // Decode a still frame so the same picture can be used to read the holder name.
      const frame = el('canvas', { width: video.videoWidth, height: video.videoHeight });
      frame.getContext('2d').drawImage(video, 0, 0);
      const result = pickVietQr(await decodeQrCodes(frame));
      if (result.ok && !done) {
        stop();
        modal.close();
        onResult({ ...result, image: frame });
      } else if (!result.ok && !/Không tìm thấy/.test(result.error)) {
        status.textContent = result.error;
      }
    } catch { /* keep scanning */ }
    busy = false;
  }

  navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
    .then((media) => {
      if (done) { media.getTracks().forEach((track) => track.stop()); return; }
      stream = media;
      video.srcObject = media;
      status.textContent = 'Đưa mã QR vào giữa khung hình';
      timer = setInterval(tick, 300);
    })
    .catch(() => {
      status.textContent = 'Không mở được camera. Hãy cho phép quyền camera cho tiện ích này, hoặc dán ảnh mã QR.';
      status.classList.add('warn');
    });
  return modal;
}
