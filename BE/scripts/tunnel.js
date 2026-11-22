/**
 * npm run tunnel — mở tunnel công khai tới API local (cổng PORT, mặc định 3001) để ZaloPay sandbox gọi được
 * callback server-to-server, rồi ghi ZALOPAY_CALLBACK_URL vào .env.
 *
 *  - ZaloPay SANDBOX chỉ gọi callback qua http:// thường (cổng 80) — đã thử: URL https của Cloudflare Quick
 *    Tunnel (ép HTTPS) không nhận được callback nào, URL http:// của Pinggy nhận ngay. Production dùng HTTPS
 *    trên domain thật, không cần script này.
 *  - Dùng Pinggy qua `ssh` (có sẵn trên Windows 10+/macOS/Linux), không cần tài khoản. Bản miễn phí hết hạn sau
 *    60 phút và URL đổi mỗi lần chạy → khởi động lại `npm run dev` sau khi script báo đã ghi .env.
 *  - Trong lúc chạy, TOÀN BỘ API dev truy cập được từ Internet qua URL đó. Ctrl+C để đóng.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ quiet: true });

const ENV_FILE = path.join(__dirname, '..', '.env');
const PORT = process.env.PORT || 3001;
const CALLBACK_PATH = '/api/orders/zalopay-callback';

/** Ghi / thay dòng KEY=value trong .env, giữ nguyên các dòng khác. */
function setEnv(key, value) {
  const text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  const next = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, '')}\n${line}\n`;
  fs.writeFileSync(ENV_FILE, next);
}

console.log(`Mở tunnel Pinggy tới http://localhost:${PORT} …`);
const child = spawn('ssh', [
  '-p', '443',
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'ServerAliveInterval=30',
  '-o', 'ExitOnForwardFailure=yes',
  `-R0:localhost:${PORT}`,
  'a.pinggy.io',
], { stdio: ['pipe', 'pipe', 'pipe'] }); // stdin phải mở: stdin đóng (EOF) thì Pinggy không trả URL

let announced = false;
let buffer = '';
const scan = (chunk) => {
  if (announced) return;
  buffer += chunk.toString();
  // Output có cả https://dashboard.pinggy.io trên cùng dòng thông báo → lấy URL tunnel đầu tiên KHÁC dashboard
  const host = [...buffer.matchAll(/https?:\/\/([a-z0-9.-]+\.pinggy[a-z0-9.-]*)/gi)]
    .map((m) => m[1].replace(/[.]+$/, ''))
    .find((h) => !/^dashboard\./i.test(h));
  if (!host) return;
  announced = true;
  const callbackUrl = `http://${host}${CALLBACK_PATH}`;
  setEnv('ZALOPAY_CALLBACK_URL', callbackUrl);
  console.log(`\nTunnel: http://${host}  (hết hạn sau 60 phút)`);
  console.log(`Đã ghi .env: ZALOPAY_CALLBACK_URL=${callbackUrl}`);
  console.log('→ Khởi động lại backend (npm run dev) để giao dịch mới gửi callback_url này cho ZaloPay.');
  console.log('→ Giữ cửa sổ này mở trong lúc demo; Ctrl+C để đóng tunnel.\n');
};
child.stdout.on('data', scan);
child.stderr.on('data', scan);
child.on('error', (err) => {
  console.error(`Không chạy được ssh (${err.message}). Cài OpenSSH client rồi thử lại.`);
  process.exit(1);
});
child.on('exit', (code) => {
  if (announced) {
    // URL cũ chết theo tunnel → xóa để giao dịch sau không gửi callback_url hỏng
    setEnv('ZALOPAY_CALLBACK_URL', '');
    console.log('Tunnel đã đóng, đã xóa ZALOPAY_CALLBACK_URL trong .env (khởi động lại backend để áp dụng).');
  } else {
    console.error('Tunnel không mở được — kiểm tra mạng (ssh tới a.pinggy.io cổng 443).');
  }
  process.exit(code ?? 0);
});
process.on('SIGINT', () => child.kill('SIGINT'));
