/**
 * Spike — kiểm tra hạ tầng: object storage (MinIO/R2), sandbox chấm bài (isolated-vm),
 * Judge0 (tùy chọn), Gemini.
 * Run: npm run check:services
 *
 * Dịch vụ nào chưa có biến môi trường sẽ được bỏ qua kèm hướng dẫn cấu hình.
 */
require('dotenv').config({ quiet: true });

const results = [];

function report(name, status, detail) {
  results.push({ name, status, detail });
  const icon = { OK: '✔', SKIP: '–', FAIL: '✘' }[status];
  console.log(`${icon} [${name}] ${detail}`);
}

/* ── Object storage (MinIO dev / Cloudflare R2 / S3) ───────────── */
async function checkStorage() {
  const { S3_ENDPOINT, S3_REGION = 'us-east-1', S3_FORCE_PATH_STYLE, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET) {
    return report('Storage', 'SKIP', 'Chưa cấu hình S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET');
  }

  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE !== 'false', // MinIO cần path-style
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });

  const Key = `_healthcheck/${Date.now()}.txt`;
  try {
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key, Body: 'hoisted', ContentType: 'text/plain' }));
    const obj  = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key }));
    const body = await obj.Body.transformToString();

    // Bucket phải private: truy cập không có chữ ký phải bị từ chối
    const anon = await fetch(`${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}/${Key}`);
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key }));

    if (body !== 'hoisted') throw new Error(`Nội dung đọc lại không khớp: "${body}"`);
    const privacy = anon.status === 403 ? 'bucket private ✔' : `CẢNH BÁO: truy cập ẩn danh trả HTTP ${anon.status}`;
    report('Storage', 'OK', `Ghi/đọc/xóa object thành công trên "${S3_BUCKET}" (${S3_ENDPOINT}) — ${privacy}`);
  } catch (err) {
    const hint = /ECONNREFUSED|fetch failed/i.test(`${err.name} ${err.message} ${err.code}`)
      ? ' — MinIO đã chạy chưa? (npm run storage)' : '';
    report('Storage', 'FAIL', `${err.name}: ${err.message}${hint}`);
  }
}

/* ── Sandbox chấm bài JS (isolated-vm) — runner mặc định ───────── */
async function checkSandbox() {
  let ivm;
  try {
    ivm = require('isolated-vm');
  } catch (err) {
    return report('Sandbox', 'FAIL', `Không load được isolated-vm: ${err.message}`);
  }

  async function run(code) {
    const isolate = new ivm.Isolate({ memoryLimit: 32 });
    try {
      const context = await isolate.createContext();
      return { ok: true, value: await context.eval(code, { timeout: 500, copy: true }) };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      if (!isolate.isDisposed) isolate.dispose();
    }
  }

  const cases = [
    ['code hợp lệ',      'function sum(a, b) { return a + b } sum(2, 3)', (r) => r.ok && r.value === 5],
    ['vòng lặp vô hạn',  'while (true) {}',                                (r) => !r.ok && /timed out/i.test(r.error)],
    ['vượt bộ nhớ',      'const a = []; while (true) a.push(new Array(1e6).fill(1))', (r) => !r.ok],
    ['require/process',  'typeof require + typeof process',                (r) => r.ok && r.value === 'undefinedundefined'],
    ['escape constructor', 'this.constructor.constructor("return typeof process")()', (r) => r.ok && r.value === 'undefined'],
  ];

  const failed = [];
  for (const [label, code, pass] of cases) {
    if (!pass(await run(code))) failed.push(label);
  }
  if (failed.length) return report('Sandbox', 'FAIL', `Ca không đạt: ${failed.join(', ')}`);
  report('Sandbox', 'OK', `isolated-vm ${require('isolated-vm/package.json').version}: ${cases.length}/${cases.length} ca đạt (timeout, giới hạn RAM, không có require/process)`);
}

/* ── Judge0 (tùy chọn — runner từ xa nếu có cấu hình) ──────────── */
async function checkJudge0() {
  const { JUDGE0_URL, JUDGE0_KEY } = process.env;
  if (!JUDGE0_URL) {
    return report('Judge0', 'SKIP', 'Tùy chọn — không cấu hình, dùng sandbox isolated-vm');
  }

  const base = JUDGE0_URL.replace(/\/$/, '');
  if (base.includes('rapidapi.com') && !JUDGE0_KEY) {
    return report('Judge0', 'SKIP', 'Chưa cấu hình JUDGE0_KEY (RapidAPI key, xem hướng dẫn)');
  }
  const headers = { 'Content-Type': 'application/json' };
  if (base.includes('rapidapi.com')) {
    headers['X-RapidAPI-Key']  = JUDGE0_KEY;
    headers['X-RapidAPI-Host'] = new URL(base).host;
  } else if (JUDGE0_KEY) {
    headers['X-Auth-Token'] = JUDGE0_KEY;
  }

  try {
    const langRes = await fetch(`${base}/languages`, { headers });
    if (!langRes.ok) throw new Error(`GET /languages → HTTP ${langRes.status}`);
    const languages = await langRes.json();
    const js = languages
      .filter((l) => /^JavaScript/i.test(l.name))
      .sort((a, b) => b.id - a.id)[0]; // id lớn nhất = Node.js mới nhất
    if (!js) throw new Error('Không tìm thấy ngôn ngữ JavaScript');

    const subRes = await fetch(`${base}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language_id: js.id, source_code: 'console.log(JSON.stringify([1, 2].map((x) => x * 2)))' }),
    });
    if (!subRes.ok) throw new Error(`POST /submissions → HTTP ${subRes.status}`);
    const sub = await subRes.json();
    if (sub.stdout?.trim() !== '[2,4]') {
      throw new Error(`Kết quả không như mong đợi: status=${sub.status?.description}, stdout=${sub.stdout}, stderr=${sub.stderr}`);
    }
    report('Judge0', 'OK', `Chạy JS thành công — language_id=${js.id} (${js.name}), time=${sub.time}s, memory=${sub.memory}KB`);
  } catch (err) {
    report('Judge0', 'FAIL', err.message);
  }
}

/* ── Gemini ────────────────────────────────────────────────────── */
async function checkGemini() {
  const { GEMINI_API_KEY } = process.env;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  if (!GEMINI_API_KEY) {
    return report('Gemini', 'SKIP', 'Chưa cấu hình GEMINI_API_KEY (lấy tại https://aistudio.google.com/apikey)');
  }

  const { GoogleGenAI, Type } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    // Thử luôn structured output — sẽ dùng cho tính năng AI sinh quiz
    const res = await ai.models.generateContent({
      model,
      contents: 'Tạo 1 câu hỏi trắc nghiệm ngắn về từ khóa `let` trong JavaScript.',
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options:  { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
          },
          required: ['question', 'options', 'correctIndex'],
        },
      },
    });
    const data = JSON.parse(res.text);
    report('Gemini', 'OK', `Model "${model}" trả JSON hợp lệ: "${data.question}" (${data.options.length} đáp án)`);
  } catch (err) {
    let hint = '';
    if (/not found|404/i.test(err.message)) {
      try {
        const names = [];
        for await (const m of await ai.models.list()) if (/flash/i.test(m.name)) names.push(m.name.replace('models/', ''));
        hint = ` — Model khả dụng: ${names.slice(0, 8).join(', ')}`;
      } catch { /* bỏ qua */ }
    }
    report('Gemini', 'FAIL', `${err.message.slice(0, 300)}${hint}`);
  }
}

(async () => {
  console.log('=== Hoisted — kiểm tra dịch vụ ngoài ===\n');
  await checkStorage();
  await checkSandbox();
  await checkJudge0();
  await checkGemini();
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const ok     = results.filter((r) => r.status === 'OK').length;
  console.log(`\n${ok} OK · ${failed} lỗi · ${results.length - ok - failed} chưa cấu hình`);
  process.exit(failed ? 1 : 0);
})();
