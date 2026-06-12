const pool = require('../config/db');

/* ── helpers ─────────────────────────────────────────────────────── */
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
    await pool.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
    return res.json({ ok: true });
  } catch (err) {
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
  if (options.length < 2) return res.status(400).json({ message: 'Phải có ít nhất 2 đáp án' });

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
  if (options.length < 2) return res.status(400).json({ message: 'Phải có ít nhất 2 đáp án' });

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
// body: { answers: [{questionId, optionId}] }
async function submitAttempt(req, res) {
  const quizId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const { answers = [] } = req.body;

  try {
    const [[quizRow]] = await pool.query(
      'SELECT pass_score, lesson_id FROM quizzes WHERE id = ? LIMIT 1',
      [quizId],
    );
    if (!quizRow) return res.status(404).json({ message: 'Quiz không tồn tại' });

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
    for (const r of allRows) {
      if (!correctMap[r.questionId]) correctMap[r.questionId] = new Set();
      if (r.is_correct) correctMap[r.questionId].add(r.optionId);
    }

    const questionIds = Object.keys(correctMap).map(Number);
    let correctCount = 0;
    const results = [];

    for (const qId of questionIds) {
      const userAnswer  = answers.find(a => a.questionId === qId);
      const isCorrect   = userAnswer?.optionId && correctMap[qId].has(userAnswer.optionId);
      if (isCorrect) correctCount++;
      results.push({ questionId: qId, isCorrect: !!isCorrect, correctOptionIds: [...correctMap[qId]] });
    }

    const total   = questionIds.length;
    const score   = Math.round((correctCount / total) * 100);
    const passed  = score >= quizRow.pass_score;

    // Persist attempt
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [aRes] = await conn.query(
        'INSERT INTO quiz_attempts (quiz_id, user_id, score, passed) VALUES (?, ?, ?, ?)',
        [quizId, userId, score, passed ? 1 : 0],
      );
      for (const a of answers) {
        if (a.questionId && a.optionId) {
          await conn.query(
            'INSERT INTO quiz_attempt_answers (attempt_id, question_id, option_id) VALUES (?, ?, ?)',
            [aRes.insertId, a.questionId, a.optionId],
          );
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback(); throw e;
    } finally { conn.release(); }

    // If passed → mark lesson complete + recalculate enrollment progress
    if (passed) {
      try {
        const [[enroll]] = await pool.query(
          `SELECT e.id, e.course_id FROM enrollments e
           JOIN lessons l ON l.course_id = e.course_id
           WHERE e.user_id = ? AND l.id = ? LIMIT 1`,
          [userId, quizRow.lesson_id],
        );
        if (enroll) {
          await pool.query(
            `INSERT INTO lesson_progress (enrollment_id, lesson_id, is_completed, completed_at)
             VALUES (?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE
               is_completed = 1, completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()`,
            [enroll.id, quizRow.lesson_id],
          );
          const [[cnt]] = await pool.query(
            `SELECT
               (SELECT COUNT(*) FROM lessons WHERE course_id = ?) AS total,
               (SELECT COUNT(*) FROM lesson_progress WHERE enrollment_id = ? AND is_completed = 1) AS completed`,
            [enroll.course_id, enroll.id],
          );
          const pct = cnt.total > 0 ? Math.round((cnt.completed / cnt.total) * 100) : 0;
          await pool.query(
            `UPDATE enrollments SET progress_percent = ?${pct === 100 ? ', completed_at = NOW()' : ''} WHERE id = ?`,
            [pct, enroll.id],
          );
        }
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
