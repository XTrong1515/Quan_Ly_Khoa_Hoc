/**
 * npm run tunnel — mở Cloudflare Quick Tunnel tới API local (cổng PORT, mặc định 3001) để ZaloPay gọi được
 * callback server-to-server, rồi ghi ZALOPAY_CALLBACK_URL vào .env.
 *
 *  - Không cần tài khoản Cloudflare. URL *.trycloudflare.com đổi mỗi lần chạy → khởi động lại `npm run dev`
 *    sau khi script báo đã ghi .env (dotenv chỉ đọc .env lúc khởi động).
 *  - Trong lúc chạy, TOÀN BỘ API dev truy cập được từ Internet qua URL ngẫu nhiên đó. Ctrl+C để đóng.
 *  - Lần đầu tự tải cloudflared chính thức từ GitHub release của Cloudflare vào BE/.tools/.
 */
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
require('dotenv').config({ quiet: true });

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const PORT = process.env.PORT || 3001;
const CALLBACK_PATH = '/api/orders/zalopay-callback';

const EXE = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
const LOCAL_BIN = path.join(ROOT, '.tools', EXE);
const RELEASE = {
  win32: 'cloudflared-windows-amd64.exe',
  linux: 'cloudflared-linux-amd64',
  darwin: null, // macOS: brew install cloudflared
}[process.platform];

function onPath() {
  try {
    execFileSync(EXE, ['--version'], { stdio: 'ignore' });
    return EXE;
  } catch { return null; }
}

async function download() {
  if (!RELEASE) throw new Error('Không tự tải được cloudflared cho hệ điều hành này — cài thủ công (vd. brew install cloudflared).');
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${RELEASE}`;
  console.log(`Tải cloudflared từ ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tải cloudflared thất bại: HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(LOCAL_BIN), { recursive: true });
  fs.writeFileSync(LOCAL_BIN, Buffer.from(await res.arrayBuffer()), { mode: 0o755 });
  return LOCAL_BIN;
}

/** Ghi / thay dòng KEY=value trong .env, giữ nguyên các dòng khác. */
function setEnv(key, value) {
  const text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  const next = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, '')}\n${line}\n`;
  fs.writeFileSync(ENV_FILE, next);
}

async function main() {
  const bin = fs.existsSync(LOCAL_BIN) ? LOCAL_BIN : onPath() || await download();
  console.log(`Mở tunnel tới http://localhost:${PORT} …`);

  const child = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let announced = false;
  const scan = (chunk) => {
    const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(chunk.toString());
    if (!m || announced) return;
    announced = true;
    const callbackUrl = `${m[0]}${CALLBACK_PATH}`;
    setEnv('ZALOPAY_CALLBACK_URL', callbackUrl);
    console.log(`\nTunnel: ${m[0]}`);
    console.log(`Đã ghi .env: ZALOPAY_CALLBACK_URL=${callbackUrl}`);
    console.log('→ Khởi động lại backend (npm run dev) để giao dịch mới gửi callback_url này cho ZaloPay.');
    console.log('→ Giữ cửa sổ này mở trong lúc demo; Ctrl+C để đóng tunnel.\n');
  };
  child.stdout.on('data', scan);
  child.stderr.on('data', scan);
  child.on('exit', (code) => {
    if (announced) {
      // URL cũ chết theo tunnel → xóa để giao dịch sau không gửi callback_url hỏng
      setEnv('ZALOPAY_CALLBACK_URL', '');
      console.log('Tunnel đã đóng, đã xóa ZALOPAY_CALLBACK_URL trong .env (khởi động lại backend để áp dụng).');
    }
    process.exit(code ?? 0);
  });
  process.on('SIGINT', () => child.kill('SIGINT'));
}

main().catch((err) => { console.error(err.message); process.exit(1); });
