const pool = require('../config/db');

/* ── Helper — tạo notification ───────────────────────────────── */
async function createNotification(userId, { type, title, body, link }) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title || null, body || null, link || null],
    );
  } catch (err) {
    console.error('[notification/create]', err);
  }
}

/* ── GET /api/notifications ───────────────────────────────────── */
async function listNotifications(req, res) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, body, link, is_read AS isRead, created_at AS createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId],
    );
    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId],
    );
    return res.json({ notifications: rows, unreadCount: Number(unread) });
  } catch (err) {
    console.error('[notifications/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── PUT /api/notifications/:id/read ─────────────────────────── */
async function markRead(req, res) {
  const userId = req.user.id;
  const id     = parseInt(req.params.id, 10);
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[notifications/markRead]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ── PUT /api/notifications/read-all ─────────────────────────── */
async function markAllRead(req, res) {
  const userId = req.user.id;
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId],
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[notifications/markAllRead]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = { createNotification, listNotifications, markRead, markAllRead };
