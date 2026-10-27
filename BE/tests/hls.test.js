// Storage giả lập trong bộ nhớ; ffmpeg chạy thật (ffmpeg-static) trên video mẫu sinh bằng lavfi
const mockObjects = new Map();
jest.mock('../src/utils/storage', () => {
  const fs = require('fs');
  return {
    ...jest.requireActual('../src/utils/storage'),
    isConfigured: jest.fn(() => true),
    headObject: jest.fn(),
    deleteObject: jest.fn(),
    downloadToFile: jest.fn(async (key, file) => {
      if (!mockObjects.has(key)) throw new Error('NoSuchKey');
      fs.writeFileSync(file, mockObjects.get(key));
    }),
    putObject: jest.fn(async (key, body) => { mockObjects.set(key, Buffer.from(body)); }),
    getObjectText: jest.fn(async (key) => mockObjects.get(key).toString('utf8')),
    deletePrefix: jest.fn(async (prefix) => {
      for (const k of [...mockObjects.keys()]) if (prefix && k.startsWith(prefix)) mockObjects.delete(k);
    }),
  };
});

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const request = require('supertest');
const app = require('../src/app');
const hls = require('../src/services/video/hls');
const {
  pool, resetDb, createUser, authHeader, createCourse, createLesson, enroll,
} = require('./helpers');

beforeAll(resetDb);
afterAll(() => pool.end());

let teacher; let otherTeacher; let student; let outsider;
let course; let lesson; let videoKey;
beforeAll(async () => {
  teacher      = await createUser({ role: 'INSTRUCTOR' });
  otherTeacher = await createUser({ role: 'INSTRUCTOR' });
  student      = await createUser();
  outsider     = await createUser();
  course       = await createCourse({ instructor: teacher, status: 'PUBLISHED' });
  lesson       = await createLesson(course.id);
  await enroll(student, course.id);

  // Video mẫu 8 giây H.264 + AAC → 2 đoạn HLS
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hls-test-')), 'sample.mp4');
  const r = spawnSync(require('ffmpeg-static'), [
    '-y', '-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=15:duration=8',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-g', '15', '-c:a', 'aac', '-shortest', file,
  ]);
  if (r.status !== 0) throw new Error(`ffmpeg không tạo được video mẫu: ${r.stderr}`);
  videoKey = `courses/${course.id}/lessons/${lesson.id}/video/sample.mp4`;
  mockObjects.set(videoKey, fs.readFileSync(file));
  await pool.query('UPDATE lessons SET video_key = ? WHERE id = ?', [videoKey, lesson.id]);
}, 60_000);

describe('Khóa video — bọc bằng master key', () => {
  it('seal → open trả lại đúng 16 byte, mỗi lần seal ra chuỗi khác nhau', () => {
    const key = crypto.randomBytes(16);
    const a = hls.sealKey(key); const b = hls.sealKey(key);
    expect(a).not.toBe(b);
    expect(hls.openKey(a).equals(key)).toBe(true);
  });

  it('chuỗi bị sửa → không mở được (GCM xác thực)', () => {
    const sealed = Buffer.from(hls.sealKey(crypto.randomBytes(16)), 'base64');
    sealed[sealed.length - 1] ^= 1;
    expect(() => hls.openKey(sealed.toString('base64'))).toThrow();
  });
});

describe('rewritePlaylist', () => {
  it('khóa → URI tương đối "key", đoạn → URL do hàm ký sinh ra, giữ nguyên các thẻ khác', async () => {
    const raw = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="file:///tmp/x.key",IV=0xabc\n#EXTINF:6.0,\nseg_0000.ts\n#EXTINF:2.0,\n../evil/seg_0001.ts\n#EXT-X-ENDLIST';
    const out = await hls.rewritePlaylist(raw, 'p/hls/u/', async (k) => `https://s3/${k}?sig`);
    expect(out).toContain('#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0xabc');
    expect(out).toContain('https://s3/p/hls/u/seg_0000.ts?sig');
    expect(out).toContain('https://s3/p/hls/u/seg_0001.ts?sig'); // basename → không thoát ra khỏi thư mục
    expect(out).toContain('#EXT-X-ENDLIST');
  });
});

describe('processLesson — ffmpeg thật', () => {
  let prefix; let key;
  beforeAll(async () => {
    await hls.processLesson(lesson.id);
    const [[row]] = await pool.query('SELECT hls_status, hls_prefix, hls_key, hls_error FROM lessons WHERE id = ?', [lesson.id]);
    expect(row.hls_error).toBeNull();
    expect(row.hls_status).toBe('READY');
    prefix = row.hls_prefix;
    key = hls.openKey(row.hls_key);
  }, 60_000);

  it('upload playlist + các đoạn .ts vào thư mục hls của bài học', () => {
    expect(prefix.startsWith(`courses/${course.id}/lessons/${lesson.id}/hls/`)).toBe(true);
    const files = [...mockObjects.keys()].filter((k) => k.startsWith(prefix));
    expect(files).toContain(`${prefix}index.m3u8`);
    expect(files.filter((f) => f.endsWith('.ts')).length).toBeGreaterThanOrEqual(2);
  });

  it('đoạn .ts đã mã hóa: không đọc được trực tiếp, giải mã bằng khóa + IV thì ra MPEG-TS hợp lệ', () => {
    const playlist = mockObjects.get(`${prefix}index.m3u8`).toString();
    const iv = Buffer.from(playlist.match(/IV=0x([0-9a-f]{32})/i)[1], 'hex');
    const seg = mockObjects.get(`${prefix}seg_0000.ts`);
    const plainHeader = seg[0] === 0x47 && seg[188] === 0x47;
    expect(plainHeader).toBe(false);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const plain = Buffer.concat([decipher.update(seg), decipher.final()]);
    expect(plain[0]).toBe(0x47);   // sync byte MPEG-TS
    expect(plain[188]).toBe(0x47);
  });

  it('playlist không chứa đường dẫn khóa trên đĩa server', () => {
    const playlist = mockObjects.get(`${prefix}index.m3u8`).toString();
    expect(playlist).toContain('URI="key"');
    expect(playlist).not.toMatch(/video\.key|[A-Za-z]:\\|\/tmp\//);
  });

  describe('Phát lại qua API', () => {
    it('chi tiết bài học trả hlsUrl khi READY (vẫn kèm MP4 có hạn làm dự phòng)', async () => {
      const res = await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(student));
      expect(res.status).toBe(200);
      expect(res.body.lesson.hlsStatus).toBe('READY');
      expect(res.body.lesson.hlsUrl).toBe(`/api/lessons/${lesson.id}/hls/index.m3u8`);
      expect(JSON.stringify(res.body)).not.toContain(prefix);
    });

    it('học viên đã mua: playlist với đoạn là presigned URL, không cache', async () => {
      const res = await request(app).get(`/api/lessons/${lesson.id}/hls/index.m3u8`).set(authHeader(student));
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/vnd\.apple\.mpegurl/);
      expect(res.headers['cache-control']).toBe('no-store');
      const segLines = res.text.split('\n').filter((l) => l && !l.startsWith('#'));
      expect(segLines.length).toBeGreaterThanOrEqual(2);
      expect(segLines.every((l) => l.includes('X-Amz-Signature='))).toBe(true);
      expect(res.text).toContain('URI="key"');
    });

    it('học viên đã mua: khóa đúng 16 byte, không cache', async () => {
      const res = await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(authHeader(student))
        .buffer(true).parse((r, cb) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => cb(null, Buffer.concat(c))); });
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toMatch(/no-store/);
      expect(Buffer.compare(res.body, key)).toBe(0);
    });

    it('chưa mua → 403, chưa đăng nhập → 401 (cả playlist lẫn khóa)', async () => {
      for (const p of ['index.m3u8', 'key']) {
        expect((await request(app).get(`/api/lessons/${lesson.id}/hls/${p}`).set(authHeader(outsider))).status).toBe(403);
        expect((await request(app).get(`/api/lessons/${lesson.id}/hls/${p}`)).status).toBe(401);
      }
    });

    it('giảng viên sở hữu xem được; giảng viên khác thì không', async () => {
      expect((await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(authHeader(teacher))).status).toBe(200);
      expect((await request(app).get(`/api/lessons/${lesson.id}/hls/key`).set(authHeader(otherTeacher))).status).toBe(403);
    });
  });

  it('video bị thay trong lúc mã hóa → bỏ kết quả, không ghi đè', async () => {
    const before = (await pool.query('SELECT hls_prefix FROM lessons WHERE id = ?', [lesson.id]))[0][0].hls_prefix;
    const realPut = jest.requireMock('../src/utils/storage').putObject;
    const swap = realPut.getMockImplementation();
    realPut.mockImplementationOnce(async (k, body) => {
      await pool.query('UPDATE lessons SET video_key = ? WHERE id = ?', [`${videoKey}.new`, lesson.id]);
      return swap(k, body);
    });
    await hls.processLesson(lesson.id);
    const [[row]] = await pool.query('SELECT hls_prefix, video_key FROM lessons WHERE id = ?', [lesson.id]);
    expect(row.hls_prefix).toBe(before);
    expect([...mockObjects.keys()].filter((k) => k.includes('/hls/') && !k.startsWith(before))).toEqual([]);
    // Thực tế attachMedia sẽ xếp hàng mã hóa bản mới; ở đây trả lại trạng thái cũ
    await pool.query("UPDATE lessons SET video_key = ?, hls_status = 'READY' WHERE id = ?", [videoKey, lesson.id]);
  }, 60_000);
});

describe('WebM VP9/Opus', () => {
  it('được chuyển mã sang H.264 (không chép thẳng VP9 vào .ts — trình duyệt không phát được)', async () => {
    const webm = await createLesson(course.id);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-webm-'));
    const file = path.join(dir, 'in.webm');
    const r = spawnSync(require('ffmpeg-static'), ['-y', '-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=15:duration=3',
      '-f', 'lavfi', '-i', 'sine=duration=3', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-c:a', 'libopus', '-shortest', file]);
    expect(r.status).toBe(0);
    const k = `courses/${course.id}/lessons/${webm.id}/video/in.webm`;
    mockObjects.set(k, fs.readFileSync(file));
    await pool.query('UPDATE lessons SET video_key = ? WHERE id = ?', [k, webm.id]);
    await hls.processLesson(webm.id);

    const [[row]] = await pool.query('SELECT hls_status, hls_prefix, hls_key FROM lessons WHERE id = ?', [webm.id]);
    expect(row.hls_status).toBe('READY');
    const playlist = mockObjects.get(`${row.hls_prefix}index.m3u8`).toString();
    const iv = Buffer.from(playlist.match(/IV=0x([0-9a-f]{32})/i)[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', hls.openKey(row.hls_key), iv);
    const seg = path.join(dir, 'seg.ts');
    fs.writeFileSync(seg, Buffer.concat([decipher.update(mockObjects.get(`${row.hls_prefix}seg_0000.ts`)), decipher.final()]));
    const info = spawnSync(require('ffmpeg-static'), ['-hide_banner', '-i', seg]).stderr.toString();
    expect(info).toMatch(/Video: h264/);
    expect(info).toMatch(/Audio: aac/);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

describe('Lỗi mã hóa & mã hóa lại', () => {
  it('file trên storage không phải video → FAILED kèm lý do, không để lại file rác', async () => {
    const bad = await createLesson(course.id);
    const k = `courses/${course.id}/lessons/${bad.id}/video/bad.mp4`;
    mockObjects.set(k, Buffer.from('not a video'));
    await pool.query('UPDATE lessons SET video_key = ? WHERE id = ?', [k, bad.id]);
    await hls.processLesson(bad.id);
    const [[row]] = await pool.query('SELECT hls_status, hls_error FROM lessons WHERE id = ?', [bad.id]);
    expect(row.hls_status).toBe('FAILED');
    expect(row.hls_error).toBeTruthy();
    expect([...mockObjects.keys()].some((x) => x.startsWith(`courses/${course.id}/lessons/${bad.id}/hls/`))).toBe(false);
    // Chưa READY → không có playlist / khóa
    expect((await request(app).get(`/api/lessons/${bad.id}/hls/key`).set(authHeader(teacher))).status).toBe(404);
  }, 60_000);

  it('POST /lessons/:id/hls: chủ khóa học → 202 PROCESSING; giảng viên khác → 404; chưa có video → 400', async () => {
    const res = await request(app).post(`/api/instructor/lessons/${lesson.id}/hls`).set(authHeader(teacher));
    expect(res.status).toBe(202);
    expect((await pool.query('SELECT hls_status FROM lessons WHERE id = ?', [lesson.id]))[0][0].hls_status).toBe('PROCESSING');
    expect((await request(app).post(`/api/instructor/lessons/${lesson.id}/hls`).set(authHeader(teacher))).status).toBe(409);
    expect((await request(app).post(`/api/instructor/lessons/${lesson.id}/hls`).set(authHeader(otherTeacher))).status).toBe(404);
    const empty = await createLesson(course.id);
    expect((await request(app).post(`/api/instructor/lessons/${empty.id}/hls`).set(authHeader(teacher))).status).toBe(400);
  });

  it('đang PROCESSING → chi tiết bài học không trả hlsUrl (FE phát MP4), playlist 404', async () => {
    const res = await request(app).get(`/api/lessons/${lesson.id}`).set(authHeader(student));
    expect(res.body.lesson.hlsUrl).toBeNull();
    expect(res.body.lesson.videoSource).toBe('storage');
    expect((await request(app).get(`/api/lessons/${lesson.id}/hls/index.m3u8`).set(authHeader(student))).status).toBe(404);
  });

  it('gỡ video → xóa thư mục HLS và reset trạng thái', async () => {
    const storage = jest.requireMock('../src/utils/storage');
    const [[before]] = await pool.query('SELECT hls_prefix FROM lessons WHERE id = ?', [lesson.id]);
    const res = await request(app).delete(`/api/instructor/lessons/${lesson.id}/media/video`).set(authHeader(teacher));
    expect(res.status).toBe(200);
    expect(storage.deletePrefix).toHaveBeenCalledWith(before.hls_prefix);
    const [[row]] = await pool.query('SELECT video_key, hls_status, hls_prefix, hls_key FROM lessons WHERE id = ?', [lesson.id]);
    expect(row).toEqual({ video_key: null, hls_status: 'NONE', hls_prefix: null, hls_key: null });
  });
});
