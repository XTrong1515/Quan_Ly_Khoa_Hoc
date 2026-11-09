const pool = require('../config/db');
const { completeLesson, unmetRequirement } = require('./lessonProgressController');

/* ── helpers ─────────────────────────────────────────────────────── */
/** Câu một đáp án: đúng 1 đáp án đúng. Câu nhiều đáp án: ít nhất 1. Trả chuỗi lỗi hoặc null. */
function optionsError(type, options) {
  if (!Array.isArray(options) || options.length < 2) return 'Phải có ít nhất 2 đáp án';
  const correct = options.filter((o) => o.isCorrect).length;
  if (correct === 0) return 'Phải có ít nhất 1 đáp án đúng';
  if (type === 'single' && correct > 1) return 'Câu hỏi một đáp án chỉ được có 1 đáp án đúng';
  return null;
}

async function loadQuestionsWithOptions(quizId, includeCorrect = false) {
  const [rows] = await pool.query(
    `SELECT q.id AS qid, q.question, q.type, q.position,
            o.id AS oid, o.option_text${includeCorrect ? ', o.is_correct' : ''}
     FROM quiz_questions q
     LEFT JOIN quiz_options o ON o.question_id = q.id
     WHERE q.quiz_id = ?
     ORDER BY q.position ASC, o.id ASC`,
    [quizId],
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.qid]) {
      map[r.qid] = { id: r.qid, question: r.question, type: r.type, position: r.position, options: [] };
    }
    if (r.oid) {
      const opt = { id: r.oid, text: r.option_text };
      if (includeCorrect) opt.isCorrect = !!r.is_correct;
      map[r.qid].options.push(opt);
    }
  }
  return Object.values(map);
}

/* ── ADMIN: GET /api/admin/lessons/:lessonId/quiz ───────────────── */
async function getQuizAdmin(req, res) {
  const lessonId = parseInt(req.params.lessonId, 10);
  try {
    const [[quiz]] = await pool.query(
      'SELECT id, lesson_id, title, pass_score FROM quizzes WHERE lesson_id = ? LIMIT 1',
      [lessonId],
    );
    if (!quiz) return res.json({ quiz: null });
    const questions = await loadQuestionsWithOptions(quiz.id, true);
    return res.json({ quiz: { id: quiz.id, lessonId: quiz.lesson_id, title: quiz.title, passScore: quiz.pass_score, questions } });
  } catch (err) {
    console.error('[quiz/getAdmin]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── ADMIN: POST /api/admin/lessons/:lessonId/quiz ──────────────── */
async function createQuiz(req, res) {
  const lessonId = parseInt(req.params.lessonId, 10);
  const { title = '', passScore = 70 } = req.body;
  try {
    const [[lesson]] = await pool.query('SELECT id FROM lessons WHERE id = ? LIMIT 1', [lessonId]);
    if (!lesson) return res.status(404).json({ message: 'Không tìm thấy bài học' });

    const [[existing]] = await pool.query('SELECT id FROM quizzes WHERE lesson_id = ? LIMIT 1', [lessonId]);
    if (existing) return res.status(400).json({ message: 'Bài học này đã có quiz' });

    const [result] = await pool.query(
      'INSERT INTO quizzes (lesson_id, title, pass_score) VALUES (?, ?, ?)',
      [lessonId, title || null, passScore],
    );
    return res.status(201).json({ quizId: result.insertId });
  } catch (err) {
    console.error('[quiz/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── ADMIN: PUT /api/admin/quizzes/:id ──────────────────────────── */
async function updateQuiz(req, res) {
  const quizId = parseInt(req.params.id, 10);
  const { title, passScore = 70 } = req.body;
  try {
    await pool.query('UPDATE quizzes SET title = ?, pass_score = ? WHERE id = ?', [title || null, passScore, quizId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[quiz/update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── ADMIN: DELETE /api/admin/quizzes/:id ───────────────────────── */
async function deleteQuiz(req, res) {
  const quizId = parseInt(req.params.id, 10);
  try {
    // quiz_attempts không cascade (giữ lịch sử làm bài) → chặn với 409 thay vì để FK nổ thành 500
    const [attempts] = await pool.query('SELECT id FROM quiz_attempts WHERE quiz_id = ? LIMIT 1', [quizId]);
    if (attempts.length) {
      return res.status(409).json({ message: 'Không thể xóa: đã có học viên làm quiz này, cần giữ lại lịch sử làm bài của họ.' });
    }
    await pool.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
    return res.json({ ok: true });
  } catch (err) {
    // Có lượt làm bài chen vào giữa SELECT và DELETE → vẫn trả 409, không để thành 500
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'Không thể xóa: đã có học viên làm quiz này, cần giữ lại lịch sử làm bài của họ.' });
    }
    console.error('[quiz/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── ADMIN: POST /api/admin/quizzes/:id/questions ───────────────── */
// body: { question, type, options: [{text, isCorrect}] }
async function addQuestion(req, res) {
  const quizId = parseInt(req.params.id, 10);
  const { question, type = 'single', options = [] } = req.body;
  if (!question?.trim()) return res.status(400).json({ message: 'Câu hỏi không được để trống' });
  const invalidOptions = optionsError(type, options);
  if (invalidOptions) return res.status(400).json({ message: invalidOptions });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ maxPos }]] = await conn.query(
      'SELECT COALESCE(MAX(position), -1) AS maxPos FROM quiz_questions WHERE quiz_id = ?',
      [quizId],
    );
    const [qRes] = await conn.query(
      'INSERT INTO quiz_questions (quiz_id, question, type, position) VALUES (?, ?, ?, ?)',
      [quizId, question.trim(), type, maxPos + 1],
    );
    for (const opt of options) {
      await conn.query(
        'INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
        [qRes.insertId, opt.text, opt.isCorrect ? 1 : 0],
      );
    }
    await conn.commit();
    return res.status(201).json({ questionId: qRes.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('[quiz/addQuestion]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally { conn.release(); }
}

/* ── ADMIN: PUT /api/admin/quiz-questions/:id ───────────────────── */
async function updateQuestion(req, res) {
  const questionId = parseInt(req.params.id, 10);
  const { question, type = 'single', options = [] } = req.body;
  if (!question?.trim()) return res.status(400).json({ message: 'Câu hỏi không được để trống' });
  const invalidOptions = optionsError(type, options);
  if (invalidOptions) return res.status(400).json({ message: invalidOptions });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE quiz_questions SET question = ?, type = ? WHERE id = ?', [question.trim(), type, questionId]);
    await conn.query('DELETE FROM quiz_options WHERE question_id = ?', [questionId]);
    for (const opt of options) {
      await conn.query(
        'INSERT INTO quiz_options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
        [questionId, opt.text, opt.isCorrect ? 1 : 0],
      );
    }
    await conn.commit();
    return res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error('[quiz/updateQuestion]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally { conn.release(); }
}

/* ── ADMIN: DELETE /api/admin/quiz-questions/:id ────────────────── */
async function deleteQuestion(req, res) {
  const questionId = parseInt(req.params.id, 10);
  try {
    await pool.query('DELETE FROM quiz_questions WHERE id = ?', [questionId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[quiz/deleteQuestion]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── USER: GET /api/lessons/:id/quiz ────────────────────────────── */
async function getQuizForUser(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  const userId   = req.user.id;
  try {
    const [[quiz]] = await pool.query(
      'SELECT id, title, pass_score FROM quizzes WHERE lesson_id = ? LIMIT 1',
      [lessonId],
    );
    if (!quiz) return res.json({ quiz: null });

    const questions = await loadQuestionsWithOptions(quiz.id, false);

    const [[latestAttempt]] = await pool.query(
      `SELECT id, score, passed, submitted_at FROM quiz_attempts
       WHERE quiz_id = ? AND user_id = ?
       ORDER BY submitted_at DESC LIMIT 1`,
      [quiz.id, userId],
    );

    return res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passScore: quiz.pass_score,
        questions,
        latestAttempt: latestAttempt ?? null,
      },
    });
  } catch (err) {
    console.error('[quiz/getForUser]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── USER: POST /api/quizzes/:id/attempt ────────────────────────── */
// body: { answers: [{ questionId, optionIds: [..] }] } — optionId (một số) vẫn được nhận
async function submitAttempt(req, res) {
  const quizId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

  try {
    const [[quizRow]] = await pool.query(
      'SELECT pass_score, lesson_id FROM quizzes WHERE id = ? LIMIT 1',
      [quizId],
    );
    if (!quizRow) return res.status(404).json({ message: 'Quiz không tồn tại' });

    // Kết quả trả về chứa đáp án đúng, và lượt làm chặn việc xóa bài học → chỉ học viên của khóa mới được nộp.
    // Admin / giảng viên sở hữu được chấm thử nhưng không lưu lượt làm.
    const [[access]] = await pool.query(
      `SELECT c.instructor_id AS ownerId,
              (SELECT e.id FROM enrollments e WHERE e.course_id = c.id AND e.user_id = ? LIMIT 1) AS enrollmentId
       FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`,
      [userId, quizRow.lesson_id],
    );
    const isStaff = req.user.role === 'ADMIN' || (req.user.role === 'INSTRUCTOR' && access.ownerId === userId);
    if (!access.enrollmentId && !isStaff) {
      return res.status(403).json({ message: 'Bạn chưa đăng ký khóa học này' });
    }

    const [allRows] = await pool.query(
      `SELECT q.id AS questionId, o.id AS optionId, o.is_correct
       FROM quiz_questions q
       JOIN quiz_options o ON o.question_id = q.id
       WHERE q.quiz_id = ?`,
      [quizId],
    );
    if (!allRows.length) return res.status(400).json({ message: 'Quiz chưa có câu hỏi' });

    // Build correct-answer map
    const correctMap = {};
    const validOptions = {};
    for (const r of allRows) {
      if (!correctMap[r.questionId]) { correctMap[r.questionId] = new Set(); validOptions[r.questionId] = new Set(); }
      validOptions[r.questionId].add(r.optionId);
      if (r.is_correct) correctMap[r.questionId].add(r.optionId);
    }

    const questionIds = Object.keys(correctMap).map(Number);
    let correctCount = 0;
    const results = [];
    const picks = []; // { questionId, optionId } đã kiểm tra thuộc đúng câu hỏi

    for (const qId of questionIds) {
      const userAnswer = answers.find(a => a.questionId === qId);
      const rawIds = Array.isArray(userAnswer?.optionIds) ? userAnswer.optionIds : [userAnswer?.optionId];
      const chosen = new Set(rawIds.filter((id) => validOptions[qId].has(id)));
      chosen.forEach((optionId) => picks.push({ questionId: qId, optionId }));

      // Đúng khi chọn ĐÚNG VÀ ĐỦ tập đáp án đúng (câu nhiều đáp án không được tính khi mới chọn trúng 1)
      const expected  = correctMap[qId];
      const isCorrect = chosen.size > 0 && chosen.size === expected.size && [...chosen].every((id) => expected.has(id));
      if (isCorrect) correctCount++;
      results.push({ questionId: qId, isCorrect, correctOptionIds: [...expected] });
    }

    const total   = questionIds.length;
    const score   = Math.round((correctCount / total) * 100);
    const passed  = score >= quizRow.pass_score;

    if (!access.enrollmentId) {
      return res.json({ score, passed, total, correct: correctCount, results, staffPreview: true });
    }

    // Persist attempt
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [aRes] = await conn.query(
        'INSERT INTO quiz_attempts (quiz_id, user_id, score, passed) VALUES (?, ?, ?, ?)',
        [quizId, userId, score, passed ? 1 : 0],
      );
      for (const { questionId, optionId } of picks) {
        await conn.query(
          'INSERT INTO quiz_attempt_answers (attempt_id, question_id, option_id) VALUES (?, ?, ?)',
          [aRes.insertId, questionId, optionId],
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback(); throw e;
    } finally { conn.release(); }

    // If passed → mark lesson complete + recalculate enrollment progress
    if (passed) {
      try {
        if (!(await unmetRequirement(userId, quizRow.lesson_id))) await completeLesson(userId, quizRow.lesson_id);
      } catch (markErr) {
        console.error('[quiz/submitAttempt markComplete]', markErr);
      }
    }

    return res.json({ score, passed, total, correct: correctCount, results });
  } catch (err) {
    console.error('[quiz/submitAttempt]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = {
  getQuizAdmin, createQuiz, updateQuiz, deleteQuiz,
  addQuestion, updateQuestion, deleteQuestion,
  getQuizForUser, submitAttempt,
};
