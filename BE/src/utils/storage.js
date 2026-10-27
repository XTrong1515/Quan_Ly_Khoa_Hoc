/**
 * Object storage S3-compatible (MinIO khi dev; Cloudflare R2 / AWS S3 khi deploy — chỉ đổi biến S3_*).
 * Bucket PRIVATE: không có URL công khai, mọi truy cập đi qua presigned URL ngắn hạn.
 */
const crypto = require('crypto');
const {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand,
  ListObjectsV2Command, DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const MB = 1024 * 1024;

/* Loại file được phép theo mục đích upload */
const MEDIA_RULES = {
  video: {
    types:    { 'video/mp4': 'mp4', 'video/webm': 'webm' },
    maxBytes: (Number(process.env.VIDEO_MAX_MB) || 1024) * MB,
  },
  attachment: {
    types:    { 'application/pdf': 'pdf' },
    maxBytes: (Number(process.env.ATTACHMENT_MAX_MB) || 50) * MB,
  },
};

const UPLOAD_URL_TTL = 15 * 60;                                   // 15 phút để upload
const VIDEO_URL_TTL  = Number(process.env.VIDEO_URL_TTL) || 30 * 60; // link xem video
const FILE_URL_TTL   = 5 * 60;                                    // link mở tài liệu

let client;
function getClient() {
  if (!client) {
    client = new S3Client({
      region:         process.env.S3_REGION || 'us-east-1',
      endpoint:       process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId:     process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return client;
}

const bucket = () => process.env.S3_BUCKET || 'hoisted-media';
const isConfigured = () => Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

/** Thư mục của 1 bài học — dùng để kiểm tra key client gửi lên có thuộc đúng bài học không. */
const lessonPrefix = (courseId, lessonId, kind) => `courses/${courseId}/lessons/${lessonId}/${kind}/`;

function buildKey(courseId, lessonId, kind, contentType) {
  const ext = MEDIA_RULES[kind].types[contentType];
  return `${lessonPrefix(courseId, lessonId, kind)}${crypto.randomUUID()}.${ext}`;
}

/** Presigned PUT — trình duyệt upload thẳng lên storage, không đi qua server. */
function presignUpload(key, contentType) {
  return getSignedUrl(getClient(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), {
    expiresIn: UPLOAD_URL_TTL,
  });
}

/** Presigned GET — chỉ cấp cho người có quyền, hết hạn sau expiresIn giây. */
function presignDownload(key, { expiresIn = VIDEO_URL_TTL, filename, inline = true } = {}) {
  const params = { Bucket: bucket(), Key: key };
  if (filename) {
    params.ResponseContentDisposition = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }
  return getSignedUrl(getClient(), new GetObjectCommand(params), { expiresIn });
}

/** { size, contentType } hoặc null nếu object không tồn tại. */
async function headObject(key) {
  try {
    const res = await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: res.ContentLength, contentType: res.ContentType };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

/** Xóa best-effort — lỗi chỉ ghi log, không làm hỏng request chính. */
async function deleteObject(key) {
  if (!key) return;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    console.error('[storage/delete]', key, err.message);
  }
}

/* ── Dùng cho pipeline HLS (server tự đọc / ghi object) ─────────── */

/** Tải object về file trên đĩa (stream, không đọc hết vào RAM). */
async function downloadToFile(key, filePath) {
  const { pipeline } = require('stream/promises');
  const fs = require('fs');
  const res = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  await pipeline(res.Body, fs.createWriteStream(filePath));
}

async function putObject(key, body, contentType) {
  await getClient().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}

async function getObjectText(key) {
  const res = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return res.Body.transformToString();
}

/** Xóa mọi object dưới 1 thư mục (best-effort) — vd thư mục HLS cũ khi thay video. */
async function deletePrefix(prefix) {
  if (!prefix || !prefix.endsWith('/')) return;
  try {
    let token;
    do {
      const list = await getClient().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }));
      const objects = (list.Contents ?? []).map((o) => ({ Key: o.Key }));
      if (objects.length) await getClient().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: objects } }));
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  } catch (err) {
    console.error('[storage/deletePrefix]', prefix, err.message);
  }
}

module.exports = {
  MEDIA_RULES, UPLOAD_URL_TTL, VIDEO_URL_TTL, FILE_URL_TTL,
  isConfigured, lessonPrefix, buildKey, presignUpload, presignDownload, headObject, deleteObject,
  downloadToFile, putObject, getObjectText, deletePrefix,
};
