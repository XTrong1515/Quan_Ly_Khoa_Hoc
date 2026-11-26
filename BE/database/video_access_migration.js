/**
 * Migration — nhật ký xem video (truy vết khi nội dung bị phát tán)
 * Run: node database/video_access_migration.js   (chạy lại nhiều lần vẫn an toàn)
 *
 * Mỗi lần người dùng thực sự được cấp quyền phát video (lấy khóa giải mã HLS hoặc link MP4 có hạn)
 * → ghi user, bài, thời điểm, IP, trình duyệt. Watermark trên video hiện ID người xem; khi ảnh / video bị
 * phát tán, admin đối chiếu ID + thời điểm với bảng này để có bằng chứng phía server.
 * Ghi tối đa 1 dòng / (người, bài, nguồn, IP) mỗi 10 phút — không phình bảng khi tua / tải lại.
 */
require('dotenv').config({ quiet: true });
const pool = require('../src/config/db');

const DB = process.env.DB_NAME || 'course_mng';

async function run() {
  console.log(`=== Video access log migration (${DB}) ===\n`);
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [DB, 'video_access_logs'],
  );
  if (rows.length) {
    console.log('  skip: video_access_logs already exists');
  } else {
    await pool.query(`
      CREATE TABLE video_access_logs (
        id          BIGINT NOT NULL AUTO_INCREMENT,
        user_id     INT NOT NULL,
        lesson_id   INT NOT NULL,
        course_id   INT NOT NULL,
        source      ENUM('HLS','MP4') NOT NULL COMMENT 'HLS = lấy khóa giải mã; MP4 = cấp link presigned (video chưa mã hóa xong)',
        ip          VARCHAR(45)  NULL,
        user_agent  VARCHAR(255) NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_val_user_time   (user_id, created_at),
        KEY idx_val_lesson_time (lesson_id, created_at),
        CONSTRAINT fk_val_user   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE CASCADE,
        CONSTRAINT fk_val_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
        CONSTRAINT fk_val_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        COMMENT='Nhật ký cấp quyền phát video — đối chiếu watermark khi nội dung bị lộ'`);
    console.log('  created: video_access_logs');
  }
  console.log('\nDone.');
}

run()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
