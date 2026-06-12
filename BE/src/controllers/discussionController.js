const pool = require('../config/db');

/* ── GET /api/lessons/:id/discussions ─────────────────────────── */
// Returns top-level comments, each with nested replies
async function listDiscussions(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit    = 20;
  const offset   = (page - 1) * limit;

  try {
    // Top-level comments (parent_id IS NULL), newest first
    const [tops] = await pool.query(
      `SELECT d.id, d.content, d.created_at, d.updated_at,
              u.id AS userId, u.full_name AS userName, u.avatar_url AS userAvatar
       FROM lesson_discussions d
       JOIN users u ON u.id = d.user_id
       WHERE d.lesson_id = ? AND d.parent_id IS NULL
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [lessonId, limit, offset],
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM lesson_discussions WHERE lesson_id = ? AND parent_id IS NULL',
      [lessonId],
    );

    if (!tops.length) {
      return res.json({ discussions: [], total: Number(total), page });
    }

    // Fetch replies for these top-level comments in one query
    const topIds = tops.map(t => t.id);
    const [replies] = await pool.query(
      `SELECT d.id, d.parent_id, d.content, d.created_at, d.updated_at,
              u.id AS userId, u.full_name AS userName, u.avatar_url AS userAvatar
       FROM lesson_discussions d
       JOIN users u ON u.id = d.user_id
       WHERE d.parent_id IN (?)
       ORDER BY d.created_at ASC`,
      [topIds],
    );

    const replyMap = {};
    for (const r of replies) {
      if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
      replyMap[r.parent_id].push(formatComment(r));
    }

    const discussions = tops.map(t => ({ ...formatComment(t), replies: replyMap[t.id] ?? [] }));

    return res.json({ discussions, total: Number(total), page });
  } catch (err) {
    console.error('[discussions/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── POST /api/lessons/:id/discussions ────────────────────────── */
async function createDiscussion(req, res) {
  const lessonId = parseInt(req.params.id, 10);
  const userId   = req.user.id;
  const { content, parentId = null } = req.body;

  if (!content?.trim()) return res.status(400).json({ message: 'Nội dung không được để trống' });

  try {
    // Validate parentId belongs to the same lesson
    if (parentId) {
      const [[parent]] = await pool.query(
        'SELECT id FROM lesson_discussions WHERE id = ? AND lesson_id = ? AND parent_id IS NULL LIMIT 1',
        [parentId, lessonId],
      );
      if (!parent) return res.status(400).json({ message: 'Comment cha không hợp lệ' });
    }

    const [result] = await pool.query(
      'INSERT INTO lesson_discussions (lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [lessonId, userId, parentId || null, content.trim()],
    );

    const [[row]] = await pool.query(
      `SELECT d.id, d.parent_id, d.content, d.created_at, d.updated_at,
              u.id AS userId, u.full_name AS userName, u.avatar_url AS userAvatar
       FROM lesson_discussions d JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`,
      [result.insertId],
    );

    return res.status(201).json({ discussion: { ...formatComment(row), replies: [] } });
  } catch (err) {
    console.error('[discussions/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── PUT /api/discussions/:id ─────────────────────────────────── */
async function updateDiscussion(req, res) {
  const discussionId = parseInt(req.params.id, 10);
  const userId       = req.user.id;
  const { content }  = req.body;

  if (!content?.trim()) return res.status(400).json({ message: 'Nội dung không được để trống' });

  try {
    const [[row]] = await pool.query(
      'SELECT user_id FROM lesson_discussions WHERE id = ? LIMIT 1',
      [discussionId],
    );
    if (!row) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (row.user_id !== userId) return res.status(403).json({ message: 'Không có quyền sửa bình luận này' });

    await pool.query('UPDATE lesson_discussions SET content = ? WHERE id = ?', [content.trim(), discussionId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[discussions/update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── DELETE /api/discussions/:id ─────────────────────────────── */
async function deleteDiscussion(req, res) {
  const discussionId = parseInt(req.params.id, 10);
  const userId       = req.user.id;
  const isAdmin      = req.user.role === 'ADMIN';

  try {
    const [[row]] = await pool.query(
      'SELECT user_id FROM lesson_discussions WHERE id = ? LIMIT 1',
      [discussionId],
    );
    if (!row) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
    if (!isAdmin && row.user_id !== userId) {
      return res.status(403).json({ message: 'Không có quyền xóa bình luận này' });
    }

    await pool.query('DELETE FROM lesson_discussions WHERE id = ?', [discussionId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[discussions/delete]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

function formatComment(row) {
  return {
    id:         row.id,
    parentId:   row.parent_id ?? null,
    content:    row.content,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
    author: {
      id:     row.userId,
      name:   row.userName,
      avatar: row.userAvatar ?? null,
    },
  };
}

module.exports = { listDiscussions, createDiscussion, updateDiscussion, deleteDiscussion };
