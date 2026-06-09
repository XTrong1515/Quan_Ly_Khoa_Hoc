const pool = require('../config/db');

/* ── GET /api/lessons/:id/preview ────────────────────────────── */
async function preview(req, res) {
  const lessonId = parseInt(req.params.id, 10);

  try {
    const [rows] = await pool.query(
      `SELECT l.id, l.title, l.duration_minutes, l.video_url, l.is_preview,
              c.title AS courseTitle, c.slug AS courseSlug
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?`,
      [lessonId],
    );

    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy bài học' });
    if (!rows[0].is_preview) return res.status(403).json({ message: 'Bài học này yêu cầu đăng ký khóa học' });

    return res.json({ lesson: rows[0] });
  } catch (err) {
    console.error('[lessons/preview]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/lessons/:id ─────────────────────────────────────── */
// requireEnrollment({ allowPreview: true }) middleware runs first:
//   sets req.enrollmentId (null for preview lessons) and req.lessonCourseId
async function detail(req, res) {
  const lessonId     = parseInt(req.params.id, 10);
  const enrollmentId = req.enrollmentId;   // null when is_preview + not enrolled
  const courseId     = req.lessonCourseId;

  try {
    const [lessonRows] = await pool.query(
      `SELECT l.id, l.title, l.video_url, l.content, l.duration_minutes,
              l.attachment_url, l.is_preview,
              c.title AS courseTitle, c.slug AS courseSlug
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = ?`,
      [lessonId],
    );
    if (!lessonRows.length) return res.status(404).json({ message: 'Không tìm thấy bài học' });
    const lesson = lessonRows[0];

    // Saved playback progress (only if enrolled)
    let progress = { lastWatchedSeconds: 0, isCompleted: false };
    if (enrollmentId) {
      const [progRows] = await pool.query(
        `SELECT last_watched_seconds, is_completed
         FROM lesson_progress
         WHERE enrollment_id = ? AND lesson_id = ?
         LIMIT 1`,
        [enrollmentId, lessonId],
      );
      if (progRows.length) {
        progress = {
          lastWatchedSeconds: progRows[0].last_watched_seconds,
          isCompleted: !!progRows[0].is_completed,
        };
      }
    }

    // Curriculum: all sections + lessons with completion flags
    const [sectionRows] = await pool.query(
      `SELECT cs.id AS sectionId, cs.title AS sectionTitle, cs.order_index AS sectionOrder,
              l.id AS lessonId, l.title AS lessonTitle, l.duration_minutes,
              l.order_index, l.is_preview,
              COALESCE(lp.is_completed, 0) AS isCompleted
       FROM course_sections cs
       JOIN lessons l ON l.section_id = cs.id
       LEFT JOIN lesson_progress lp
         ON lp.lesson_id = l.id AND lp.enrollment_id = ?
       WHERE cs.course_id = ?
       ORDER BY cs.order_index ASC, l.order_index ASC`,
      [enrollmentId ?? 0, courseId],
    );

    const sectionsMap = {};
    for (const row of sectionRows) {
      if (!sectionsMap[row.sectionId]) {
        sectionsMap[row.sectionId] = {
          id: row.sectionId,
          title: row.sectionTitle,
          order: row.sectionOrder,
          lessons: [],
        };
      }
      sectionsMap[row.sectionId].lessons.push({
        id: row.lessonId,
        title: row.lessonTitle,
        durationMinutes: row.duration_minutes,
        orderIndex: row.order_index,
        isPreview: !!row.is_preview,
        isCompleted: !!row.isCompleted,
      });
    }

    return res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        videoUrl: lesson.video_url,
        content: lesson.content,
        durationMinutes: lesson.duration_minutes,
        hasAttachment: !!lesson.attachment_url,
        courseId,
        courseTitle: lesson.courseTitle,
        courseSlug: lesson.courseSlug,
      },
      sections: Object.values(sectionsMap).sort((a, b) => a.order - b.order),
      progress,
      enrollmentId,
    });
  } catch (err) {
    console.error('[lessons/detail]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── GET /api/lessons/:id/attachment ─────────────────────────── */
// requireEnrollment() middleware runs first (strict — no preview exception)
async function attachment(req, res) {
  const lessonId = parseInt(req.params.id, 10);

  try {
    const [rows] = await pool.query(
      'SELECT attachment_url FROM lessons WHERE id = ?',
      [lessonId],
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy bài học' });

    const { attachment_url } = rows[0];
    if (!attachment_url) return res.status(404).json({ message: 'Bài học không có tài liệu đính kèm' });

    return res.json({ url: attachment_url });
  } catch (err) {
    console.error('[lessons/attachment]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { preview, detail, attachment };
