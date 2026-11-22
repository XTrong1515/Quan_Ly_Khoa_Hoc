/**
 * Cổng ZaloPay (API v2, web gateway). Tách khỏi controller để controller chỉ cần:
 *   createPaymentUrl() → order_url, queryOrder() → trạng thái thật, verifyCallback() → dữ liệu callback.
 *
 * Khóa: key1 ký request gửi đi (create/query), key2 kiểm chữ ký callback ZaloPay gửi về.
 * Sandbox: https://sb-openapi.zalopay.vn/v2 — production: https://openapi.zalopay.vn/v2
 */
const crypto = require('crypto');

const cfg = () => ({
  appId:       process.env.ZALOPAY_APP_ID || '',
  key1:        process.env.ZALOPAY_KEY1 || '',
  key2:        process.env.ZALOPAY_KEY2 || '',
  endpoint:    (process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2').replace(/\/+$/, ''),
  redirectUrl: process.env.ZALOPAY_REDIRECT_URL || 'http://localhost:5173/payment/result',
  // ZaloPay gọi server-to-server → phải là URL công khai (localhost không nhận được). Bỏ trống → không gửi.
  callbackUrl: process.env.ZALOPAY_CALLBACK_URL || '',
});

const isConfigured = () => {
  const { appId, key1, key2 } = cfg();
  return Boolean(appId && key1 && key2);
};

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a ?? '').toLowerCase());
  const y = Buffer.from(String(b ?? '').toLowerCase());
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

const LINK_TTL_S = 15 * 60;
const MIN_TTL_S  = 300; // ZaloPay: expire_duration_seconds tối thiểu 300
const TIMEOUT_MS = 10_000;

/** yymmdd theo giờ Việt Nam — ZaloPay bắt app_trans_id bắt đầu bằng ngày hiện tại (GMT+7). */
function vnYymmdd(ms = Date.now()) {
  return new Date(ms + 7 * 60 * 60 * 1000).toISOString().slice(2, 10).replace(/-/g, '');
}

/**
 * Mỗi lần mở cổng cần app_trans_id MỚI (ZaloPay từ chối trùng: -68), nên không dùng order_code trực tiếp.
 * Dạng: yymmdd_<orderId>_<hậu tố ngẫu nhiên> (≤ 40 ký tự) → callback/redirect suy ngược ra orderId.
 */
function appTransIdFor(orderId) {
  return `${vnYymmdd()}_${orderId}_${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
}

/** Trả orderId (số) nếu app_trans_id đúng định dạng của Hoisted, ngược lại null. */
function orderIdFrom(appTransId) {
  const m = /^\d{6}_(\d+)_[a-z0-9]+$/.exec(String(appTransId ?? ''));
  return m ? Number(m[1]) : null;
}

async function post(path, body) {
  const res = await fetch(`${cfg().endpoint}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams(body),
    signal:  AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ZaloPay ${path} HTTP ${res.status}`);
  return res.json();
}

/**
 * Tạo đơn trên ZaloPay, trả URL cổng thanh toán (order_url).
 * Link sống tối đa 15 phút và không quá hạn của đơn Hoisted.
 */
async function createPaymentUrl({ orderId, orderCode, userId, amountVND, orderExpiresAt }) {
  const { appId, key1, redirectUrl, callbackUrl } = cfg();
  const now = Date.now();
  const remainingS = Math.floor((new Date(orderExpiresAt).getTime() - now) / 1000);
  const ttl = Math.max(MIN_TTL_S, Math.min(LINK_TTL_S, remainingS));

  const order = {
    app_id:       appId,
    app_user:     `user_${userId}`,
    app_trans_id: appTransIdFor(orderId),
    app_time:     String(now),
    amount:       String(Math.round(Number(amountVND))),
    item:         '[]',
    // preferred_payment_method rỗng → cổng hiện mọi phương thức (ví ZaloPay/QR, ATM, thẻ quốc tế)
    embed_data:   JSON.stringify({ redirecturl: redirectUrl, preferred_payment_method: [] }),
    description:  `Hoisted - Thanh toan don hang ${orderCode}`,
    bank_code:    '',
    expire_duration_seconds: String(ttl),
  };
  if (callbackUrl) order.callback_url = callbackUrl;
  order.mac = hmac(key1, [order.app_id, order.app_trans_id, order.app_user, order.amount,
    order.app_time, order.embed_data, order.item].join('|'));

  const data = await post('/create', order);
  if (data.return_code !== 1 || !data.order_url) {
    const err = new Error(`ZaloPay create: ${data.sub_return_code} ${data.sub_return_message || data.return_message}`);
    err.zalopay = data;
    throw err;
  }
  return { paymentUrl: data.order_url, appTransId: order.app_trans_id };
}

/**
 * Hỏi thẳng ZaloPay trạng thái giao dịch — nguồn sự thật khi học viên quay về (không tin query string).
 * state: 'PAID' | 'FAILED' | 'PENDING'
 */
async function queryOrder(appTransId) {
  const { appId, key1 } = cfg();
  const data = await post('/query', {
    app_id: appId,
    app_trans_id: appTransId,
    mac: hmac(key1, `${appId}|${appTransId}|${key1}`),
  });
  const state = data.return_code === 1 ? 'PAID' : data.return_code === 2 ? 'FAILED' : 'PENDING';
  return {
    state,
    amount: Number(data.amount ?? 0),
    zpTransId: data.zp_trans_id ? String(data.zp_trans_id) : null,
    subCode: data.sub_return_code,
  };
}

/** Kiểm chữ ký callback ({ data, mac, type }) bằng key2. Hợp lệ → object data đã parse, sai → null. */
function verifyCallback(body) {
  const { key2 } = cfg();
  if (!key2 || typeof body?.data !== 'string') return null;
  if (!safeEqualHex(hmac(key2, body.data), body.mac)) return null;
  try { return JSON.parse(body.data); } catch { return null; }
}

/**
 * Redirect về merchant có checksum = HMAC(key2, appid|apptransid|pmcid|bankcode|amount|discountamount|status).
 * Chỉ dùng để biết học viên đã hủy / trả thất bại trên cổng — PAID luôn phải qua queryOrder hoặc callback.
 */
function verifyRedirect(q) {
  const { appId, key2 } = cfg();
  if (!key2 || String(q?.appid) !== String(appId)) return false;
  const input = [q.appid, q.apptransid, q.pmcid, q.bankcode, q.amount, q.discountamount, q.status].map((v) => v ?? '').join('|');
  return safeEqualHex(hmac(key2, input), q.checksum);
}

module.exports = { isConfigured, verifyRedirect, createPaymentUrl, queryOrder, verifyCallback, orderIdFrom, appTransIdFor, vnYymmdd };
