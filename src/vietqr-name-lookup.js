// Account holder name lookup through VietQR.io (POST /v2/lookup) using the user's own
// Client ID and API Key. Sends only the bank BIN and account number.
import { normalizeAccountName } from './text-utils.js';

export const LOOKUP_ORIGINS = ['https://api.vietqr.io/*'];
const ENDPOINT = 'https://api.vietqr.io/v2/lookup';

/** @returns {Promise<string>} holder name, upper case without accents */
export async function lookupAccountName({ clientId, apiKey }, { bin, accountNumber }) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'x-client-id': clientId.trim(), 'x-api-key': apiKey.trim(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ bin: String(bin), accountNumber: String(accountNumber) }),
    });
  } catch {
    throw new Error('Không kết nối được VietQR.io');
  }
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (response.status === 401 || response.status === 403) throw new Error('VietQR.io từ chối Client ID / API Key');
  const name = data?.data?.accountName;
  if (data?.code !== '00' || !name) throw new Error(`VietQR.io: ${data?.desc || 'không tìm thấy tên cho tài khoản này'}`);
  return normalizeAccountName(name);
}
