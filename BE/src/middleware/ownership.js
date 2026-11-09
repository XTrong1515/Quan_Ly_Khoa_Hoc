const pool = require('../config/db');

/*
 * Kiểm tra quyền sở hữu khóa học (chống IDOR) cho khu vực giảng viên.
 * Mỗi resolver truy từ id trên URL về courses.instructor_id.
 * Không phải chủ → 404 (không tiết lộ tài nguyên của người khác có tồn tại hay không).
 * ADMIN được bỏ qua kiểm tra.
 */
const OWNER_SQL = {
  course:   'SELECT c.id AS courseId, c.instructor_id AS ownerId, c.status FROM courses c WHERE c.id = ?',
  lesson:   `SELECT c.id AS courseId, c.instructor_id AS ownerId, c.status
             FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`,
  quiz:     `SELECT c.id AS courseId, c.instructor_id AS ownerId, c.status
             FROM quizzes q JOIN lessons l ON l.id = q.lesson_id JOIN courses c ON c.id = l.course_id
             WHERE q.id = ?`,
  question: `SELECT c.id AS courseId, c.instructor_id AS ownerId, c.status
             FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id
             JOIN lessons l ON l.id = q.lesson_id JOIN courses c ON c.id = l.course_id
             WHERE qq.id = ?`,
};

const NOT_FOUND = { message: 'Không tìm thấy' };

/**
 * requireOwnership('lesson', 'lessonId') — đọc req.params[param], gắn req.course = { courseId, ownerId, status }.
 */
function requireOwnership(entity, param = 'id') {
  const sql = OWNER_SQL[entity];
  if (!sql) throw new Error(`requireOwnership: entity không hợp lệ "${entity}"`);

  return async (req, res, next) => {
    const id = parseInt(req.params[param], 10);
    if (!Number.isInteger(id)) return res.status(404).json(NOT_FOUND);
    try {
      const [rows] = await pool.query(sql, [id]);
      const row = rows[0];
      if (!row) return res.status(404).json(NOT_FOUND);
      if (req.user.role !== 'ADMIN' && row.ownerId !== req.user.id) return res.status(404).json(NOT_FOUND);
      req.course = row;
      next();
    } catch (err) {
      console.error('[ownership]', err);
      return res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  };
}

const LOCKED_MESSAGE = {
  PENDING_REVIEW: 'Khóa học đang chờ duyệt — rút lại yêu cầu duyệt nếu cần chỉnh sửa nội dung',
  ARCHIVED: 'Khóa học đã lưu trữ — không thể chỉnh sửa nội dung',
};

/**
 * Chạy sau requireOwnership: đang chờ duyệt thì nội dung (bài học, quiz, bài tập, media) phải đứng yên,
 * nếu không thứ admin duyệt khác với thứ được xuất bản. Chỉ gắn ở khu vực giảng viên.
 */
function requireEditableContent(req, res, next) {
  const message = LOCKED_MESSAGE[req.course.status];
  if (message) return res.status(409).json({ message });
  next();
}

/** Body là mảng [{ id, ... }] các bài học — mọi bài học phải thuộc khóa học của người gọi và đang sửa được. */
async function requireLessonsOwnership(req, res, next) {
  const ids = Array.isArray(req.body) ? req.body.map((item) => parseInt(item?.id, 10)) : [];
  if (!ids.length || ids.some((id) => !Number.isInteger(id))) {
    return res.status(400).json({ message: 'Danh sách không hợp lệ' });
  }
  if (req.user.role === 'ADMIN') return next();
  try {
    const [rows] = await pool.query(
      `SELECT l.id, c.status
       FROM lessons l JOIN courses c ON c.id = l.course_id
       WHERE l.id IN (?) AND c.instructor_id = ?`,
      [ids, req.user.id],
    );
    if (rows.length !== new Set(ids).size) return res.status(404).json(NOT_FOUND);
    const locked = rows.find((r) => LOCKED_MESSAGE[r.status]);
    if (locked) return res.status(409).json({ message: LOCKED_MESSAGE[locked.status] });
    next();
  } catch (err) {
    console.error('[ownership/lessons]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { requireOwnership, requireLessonsOwnership, requireEditableContent };
