// Settings dialog: your name for {toi}, editable groups, content templates, backup/restore,
// Google Sheet / Drive sync and VietQR.io name lookup.
import { DEFAULT_GROUPS, DEFAULT_TEMPLATES } from './storage.js';
import { el, openModal, toast } from './ui-helpers.js';
import { normalizeAccountName } from './text-utils.js';
import { createSyncSettingsPanel } from './sync-settings-panel.js';
import { VIETQR_IMAGE_ORIGINS } from './qr-print-card.js';

const PRIVACY_URL = 'https://qaqeqe0.github.io/so-tai-khoan-qr-privacy/';

/** "Phiên bản x.y.z · Chính sách quyền riêng tư" at the bottom of Settings. */
function aboutLine() {
  const version = typeof chrome !== 'undefined' && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : '';
  return el('p', { class: 'about-line' },
    version ? `Sổ tài khoản QR chuyển khoản · phiên bản ${version} · ` : 'Sổ tài khoản QR chuyển khoản · ',
    el('a', { href: PRIVACY_URL, target: '_blank', rel: 'noopener noreferrer' }, 'Chính sách quyền riêng tư'));
}

const lines = (text) => [...new Set(String(text).split('\n').map((s) => s.trim()).filter(Boolean))];

/**
 * @param {object} settings
 * @param {{onSave: (settings) => void, onExport: () => void, onImport: (file: File) => void,
 *          isPopup: boolean, onOpenTab: () => void}} handlers
 */
export function openSettingsModal(settings, { onSave, onExport, onImport, isPopup, onOpenTab }) {
  const myName = el('input', { class: 'field-input', placeholder: 'VD: NGUYEN VAN A', value: settings.myName });
  const groups = el('textarea', { class: 'field-input', rows: '5' }, settings.groups.join('\n'));
  const templates = el('textarea', { class: 'field-input', rows: '6' }, settings.templates.join('\n'));
  const qrLayout = el('select', { class: 'field-input' },
    el('option', { value: 'card', selected: settings.qrLayout !== 'classic' }, 'Thẻ VietQR (mặc định) — thẻ in có logo, khung số TK, nút “Tải mã QR”'),
    el('option', { value: 'classic', selected: settings.qrLayout === 'classic' }, 'Cổ điển — mã QR, ô số tiền/nội dung, các nút bên dưới'));
  const vietqrImage = el('input', { type: 'checkbox', checked: settings.qrImageSource !== 'offline' });
  const vietqrRow = el('label', { class: 'check-row' }, vietqrImage,
    ' Dùng ảnh thẻ chính thức từ img.vietqr.io (có logo VietQR, napas 247, ngân hàng)');
  const syncVietqrRow = () => { vietqrRow.hidden = qrLayout.value !== 'card'; };
  qrLayout.addEventListener('change', syncVietqrRow);
  // Downloading the official card needs access to img.vietqr.io; asked while the click
  // still counts. Without it the card is still shown, and downloads use the offline card.
  const askImagePermission = () => {
    if (isPopup || typeof chrome === 'undefined' || !chrome.permissions) return;
    if (qrLayout.value === 'card' && vietqrImage.checked) chrome.permissions.request({ origins: VIETQR_IMAGE_ORIGINS }).catch(() => {});
  };
  qrLayout.addEventListener('change', askImagePermission);
  vietqrImage.addEventListener('change', askImagePermission);
  syncVietqrRow();
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) onImport(fileInput.files[0]);
    fileInput.value = '';
  });

  const resetLink = (target, values) => el('button', {
    type: 'button', class: 'link-btn', onclick: () => { target.value = values.join('\n'); },
  }, 'Khôi phục mặc định');

  const syncSlot = el('div', { class: 'sync-slot' });
  const content = el('div', { class: 'account-form' },
    el('label', { class: 'form-field' }, el('span', { class: 'form-label' }, 'Tên chủ tài khoản của bạn (người chuyển)'), myName,
      el('span', { class: 'field-hint' }, 'Dùng cho nội dung mặc định “TÊN BẠN chuyen tien” và biến {toi}.')),
    el('div', { class: 'form-field' },
      el('span', { class: 'form-label' }, 'Kiểu hộp thoại mã QR'), qrLayout, vietqrRow,
      el('span', { class: 'field-hint' }, 'Ảnh từ img.vietqr.io cần internet và gửi số TK, tên chủ TK, số tiền, nội dung tới VietQR.io. Khi mất mạng sẽ tự dùng thẻ tạo trên máy (chữ thay cho logo).')),
    el('label', { class: 'form-field' },
      el('span', { class: 'form-label' }, 'Nhóm (mỗi dòng một nhóm) ', resetLink(groups, DEFAULT_GROUPS)), groups),
    el('label', { class: 'form-field' },
      el('span', { class: 'form-label' }, 'Mẫu nội dung chuyển khoản ', resetLink(templates, DEFAULT_TEMPLATES)), templates,
      el('span', { class: 'field-hint' }, 'Biến: {toi} tên bạn · {nguoinhan} tên người nhận · {thang} tháng/năm · {ngay} ngày/tháng')),
    el('div', { class: 'backup-row' },
      el('span', { class: 'form-label' }, 'Sao lưu dữ liệu'),
      el('div', { class: 'backup-actions' },
        el('button', { type: 'button', class: 'btn btn-ghost', onclick: onExport }, 'Xuất file JSON'),
        el('button', {
          type: 'button', class: 'btn btn-ghost',
          // The file picker closes extension popups, so import runs in a full tab.
          onclick: () => (isPopup ? onOpenTab() : fileInput.click()),
        }, isPopup ? 'Nhập file (mở tab)' : 'Nhập file JSON'),
        fileInput)),
    syncSlot,
    el('p', { class: 'field-hint' }, 'Dữ liệu lưu trong trình duyệt này và chỉ gửi tới Google Sheet / Drive / VietQR.io khi bạn bật ở trên. Mã QR được tạo offline (trừ khi dùng ảnh thẻ từ img.vietqr.io).'),
    aboutLine(),
  );
  createSyncSettingsPanel({ isPopup, onOpenTab })
    .then((panel) => syncSlot.replaceChildren(panel))
    .catch((error) => syncSlot.replaceChildren(el('p', { class: 'field-hint warn' }, `Không mở được phần đồng bộ: ${error.message}`)));

  const modal = openModal({
    title: 'Cài đặt',
    content,
    footer: [
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => modal.close() }, 'Huỷ'),
      el('button', {
        type: 'button', class: 'btn btn-primary',
        onclick: () => {
          const groupList = lines(groups.value);
          if (!groupList.length) { toast('Cần ít nhất một nhóm', 'err'); return; }
          // Send only what was edited here, so groups or templates changed meanwhile
          // (e.g. by an import in this tab or by sync) are not overwritten with stale lists.
          const changes = {};
          const name = normalizeAccountName(myName.value);
          if (name !== settings.myName) changes.myName = name;
          if (qrLayout.value !== (settings.qrLayout || 'card')) changes.qrLayout = qrLayout.value;
          const source = vietqrImage.checked ? 'vietqr' : 'offline';
          if (source !== (settings.qrImageSource || 'vietqr')) changes.qrImageSource = source;
          if (groupList.join('\n') !== settings.groups.join('\n')) changes.groups = groupList;
          const templateList = lines(templates.value);
          if (templateList.join('\n') !== settings.templates.join('\n')) changes.templates = templateList;
          onSave(changes);
          modal.close();
        },
      }, 'Lưu'),
    ],
  });
}
