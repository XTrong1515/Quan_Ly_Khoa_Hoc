/**
 * Chạy MinIO local (object storage S3-compatible) cho môi trường dev.
 * Run: npm run storage
 *
 * - Tài khoản root MinIO = S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY trong .env
 * - API:     http://localhost:9000   (BE dùng qua S3_ENDPOINT)
 * - Console: http://localhost:9001   (xem bucket/object trên trình duyệt)
 * - Tự tạo bucket S3_BUCKET (private) nếu chưa có.
 */
require('dotenv').config({ quiet: true });
const fs    = require('fs');
const os    = require('os');
const path  = require('path');
const { spawn } = require('child_process');
const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

const {
  S3_ENDPOINT = 'http://127.0.0.1:9000',
  S3_REGION = 'us-east-1',
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_BUCKET = 'hoisted-media',
  FE_ORIGIN = 'http://localhost:5173',
} = process.env;

const exe     = process.platform === 'win32' ? 'minio.exe' : 'minio';
const bin     = process.env.MINIO_BIN || path.join(os.homedir(), 'go', 'bin', exe);
const dataDir = path.resolve(__dirname, '..', process.env.MINIO_DATA_DIR || './.minio-data');
const apiPort = new URL(S3_ENDPOINT).port || '9000';

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || S3_SECRET_ACCESS_KEY.length < 8) {
  console.error('Thiếu S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (secret ≥ 8 ký tự) trong BE/.env');
  process.exit(1);
}
if (!fs.existsSync(bin)) {
  console.error(`Không tìm thấy MinIO tại ${bin}\nCài bằng: go install github.com/minio/minio@latest  (hoặc đặt MINIO_BIN)`);
  process.exit(1);
}
fs.mkdirSync(dataDir, { recursive: true });

// Chỉ lắng nghe trên localhost — không mở MinIO ra mạng LAN
const server = spawn(bin, ['server', dataDir, '--address', `127.0.0.1:${apiPort}`, '--console-address', '127.0.0.1:9001'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MINIO_ROOT_USER: S3_ACCESS_KEY_ID,
    MINIO_ROOT_PASSWORD: S3_SECRET_ACCESS_KEY,
    MINIO_API_CORS_ALLOW_ORIGIN: FE_ORIGIN, // cho phép FE upload/xem qua presigned URL
  },
});
server.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));

async function ensureBucket() {
  const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  for (let i = 0; i < 30; i += 1) {
    try {
      const live = await fetch(`${S3_ENDPOINT}/minio/health/live`);
      if (live.ok) break;
    } catch { /* server chưa lên */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`\n[storage] Bucket "${S3_BUCKET}" đã sẵn sàng`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`\n[storage] Đã tạo bucket private "${S3_BUCKET}"`);
  }
}

ensureBucket().catch((err) => console.error('[storage] Không tạo được bucket:', err.message));
