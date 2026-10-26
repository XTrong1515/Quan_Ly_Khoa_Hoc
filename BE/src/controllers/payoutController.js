const pool = require('../config/db');
const revenue = require('../services/revenue');
const { defaultCommission } = require('../services/orders');
const { createNotification } = require('./notificationController');

/* ══════════════════════ Giảng viên ══════════════════════ */

/* GET /api/instructor/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD */
async function myRevenue(req, res) {
  const { from, to } = revenue.parseRange(req.query);
  try {
    const [[me]] = await pool.query('SELECT commission_rate, bank_name, bank_account_number, bank_account_name FROM users WHERE id = ?', [req.user.id]);
    const [summary, series, courses, [payouts]] = await Promise.all([
      revenue.balanceOf(req.user.id),
      revenue.dailySeries(req.user.id, from, to),
      revenue.byCourse(req.user.id, from, to),
      pool.query(
        `SELECT id, amount, status, period_from AS periodFrom, period_to AS periodTo, bank_ref AS bankRef, note,
                paid_at AS paidAt, created_at AS createdAt
         FROM instructor_payouts WHERE instructor_id = ? ORDER BY id DESC LIMIT 50`,
        [req.user.id],
      ),
    ]);
    return res.json({
      range: { from, to },
      commissionRate: me.commission_rate === null ? defaultCommission() : Number(me.commission_rate),
      summary,
      series,
      courses,
      payouts: payouts.map((p) => ({ ...p, amount: revenue.money(p.amount) })),
      bankReady: Boolean(me.bank_name && me.bank_account_number && me.bank_account_name),
    });
  } catch (err) {
    console.error('[instructor/revenue]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* GET /api/instructor/profile */
async function getProfile(req, res) {
  try {
    const [[u]] = await pool.query(
      `SELECT full_name AS name, email, headline, bio, bank_name AS bankName,
              bank_account_number AS bankAccountNumber, bank_account_name AS bankAccountName
       FROM users WHERE id = ?`,
      [req.user.id],
    );
    return res.json({ profile: u });
  } catch (err) {
    console.error('[instructor/profile]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* PUT /api/instructor/profile  { headline, bio, bankName, bankAccountNumber, bankAccountName } */
async function updateProfile(req, res) {
  const b = req.body ?? {};
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
  const headline = str(b.headline, 255);
  const bio = str(b.bio, 3000);
  const bankName = str(b.bankName, 100);
  const bankAccountNumber = typeof b.bankAccountNumber === 'string' ? b.bankAccountNumber.replace(/\s+/g, '') : null;
  const bankAccountName = str(b.bankAccountName, 100);

  if (bankAccountNumber && !/^\d{6,20}$/.test(bankAccountNumber)) {
    return res.status(400).json({ message: 'Số tài khoản chỉ gồm 6–20 chữ số' });
  }
  try {
    await pool.query(
      `UPDATE users SET headline = ?, bio = ?, bank_name = ?, bank_account_number = ?, bank_account_name = ? WHERE id = ?`,
      [headline || null, bio || null, bankName || null, bankAccountNumber || null, bankAccountName ? bankAccountName.toUpperCase() : null, req.user.id],
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[instructor/profile:update]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* ══════════════════════ Admin — đối soát & chi trả ══════════════════════ */

const bankLine = (u) => (u.bank_name && u.bank_account_number && u.bank_account_name
  ? `${u.bank_name} · ${u.bank_account_number} · ${u.bank_account_name}` : null);

/* GET /api/admin/payouts/summary — số dư từng giảng viên */
async function payoutSummary(req, res) {
  try {
    const [instructors] = await pool.query(
      `SELECT id, full_name AS name, email, commission_rate, bank_name, bank_account_number, bank_account_name
       FROM users WHERE role = 'INSTRUCTOR' ORDER BY full_name`,
    );
    const map = await revenue.balances(instructors.map((i) => i.id));
    const rows = instructors.map((i) => ({
      id: i.id, name: i.name, email: i.email,
      commissionRate: i.commission_rate === null ? defaultCommission() : Number(i.commission_rate),
      customRate: i.commission_rate !== null,
      bank: bankLine(i),
      ...map.get(i.id),
    })).sort((a, b) => b.balance - a.balance);

    const totals = rows.reduce((t, r) => ({
      gross: t.gross + r.gross, earned: t.earned + r.earned, paidOut: t.paidOut + r.paidOut,
      pending: t.pending + r.pending, balance: t.balance + r.balance,
    }), { gross: 0, earned: 0, paidOut: 0, pending: 0, balance: 0 });
    totals.platformShare = totals.gross - totals.earned;

    return res.json({ defaultCommission: defaultCommission(), totals, instructors: rows });
  } catch (err) {
    console.error('[admin/payouts/summary]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* GET /api/admin/payouts?status=PENDING|PAID */
async function listPayouts(req, res) {
  const status = ['PENDING', 'PAID'].includes(req.query.status) ? req.query.status : null;
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.instructor_id AS instructorId, u.full_name AS instructorName, u.email,
              p.amount, p.status, p.period_from AS periodFrom, p.period_to AS periodTo,
              p.bank_snapshot AS bank, p.bank_ref AS bankRef, p.note, p.paid_at AS paidAt, p.created_at AS createdAt
       FROM instructor_payouts p JOIN users u ON u.id = p.instructor_id
       ${status ? 'WHERE p.status = ?' : ''}
       ORDER BY p.status = 'PENDING' DESC, p.id DESC LIMIT 200`,
      status ? [status] : [],
    );
    return res.json({ payouts: rows.map((r) => ({ ...r, amount: revenue.money(r.amount) })) });
  } catch (err) {
    console.error('[admin/payouts/list]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* POST /api/admin/payouts  { instructorId, amount, periodFrom?, periodTo?, note? } */
async function createPayout(req, res) {
  const instructorId = parseInt(req.body?.instructorId, 10);
  const amount = Math.round(Number(req.body?.amount));
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const periodFrom = iso.test(req.body?.periodFrom ?? '') ? req.body.periodFrom : null;
  const periodTo = iso.test(req.body?.periodTo ?? '') ? req.body.periodTo : null;
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : null;
  if (!Number.isInteger(instructorId)) return res.status(400).json({ message: 'Thiếu giảng viên' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Số tiền phải lớn hơn 0' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Khóa dòng giảng viên → 2 admin tạo payout cùng lúc không vượt quá số dư
    const [[u]] = await conn.query(
      "SELECT id, full_name, bank_name, bank_account_number, bank_account_name FROM users WHERE id = ? AND role = 'INSTRUCTOR' FOR UPDATE",
      [instructorId],
    );
    if (!u) { await conn.rollback(); return res.status(404).json({ message: 'Không tìm thấy giảng viên' }); }
    const bank = bankLine(u);
    if (!bank) { await conn.rollback(); return res.status(400).json({ message: 'Giảng viên chưa cập nhật tài khoản ngân hàng' }); }

    const { balance } = await revenue.balanceOf(instructorId, conn);
    if (amount > balance) {
      await conn.rollback();
      return res.status(400).json({ message: `Vượt số dư hiện có (${balance.toLocaleString('vi-VN')}đ)`, balance });
    }
    const [r] = await conn.query(
      `INSERT INTO instructor_payouts (instructor_id, amount, period_from, period_to, bank_snapshot, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [instructorId, amount, periodFrom, periodTo, bank, note, req.user.id],
    );
    await conn.commit();
    return res.status(201).json({ id: r.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('[admin/payouts/create]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
}

/* PUT /api/admin/payouts/:id/paid  { bankRef } */
async function markPayoutPaid(req, res) {
  const id = parseInt(req.params.id, 10);
  const bankRef = typeof req.body?.bankRef === 'string' ? req.body.bankRef.trim().slice(0, 100) : '';
  if (!bankRef) return res.status(400).json({ message: 'Nhập mã giao dịch chuyển khoản' });
  try {
    const [r] = await pool.query(
      "UPDATE instructor_payouts SET status = 'PAID', bank_ref = ?, paid_at = NOW(), paid_by = ? WHERE id = ? AND status = 'PENDING'",
      [bankRef, req.user.id, id],
    );
    if (!r.affectedRows) return res.status(409).json({ message: 'Khoản chi trả không ở trạng thái chờ' });
    const [[p]] = await pool.query('SELECT instructor_id, amount FROM instructor_payouts WHERE id = ?', [id]);
    await createNotification(p.instructor_id, {
      type: 'payout_paid',
      title: 'Đã chi trả doanh thu',
      body: `Hoisted đã chuyển ${revenue.money(p.amount).toLocaleString('vi-VN')}đ vào tài khoản của bạn (mã GD ${bankRef}).`,
      link: '/instructor/revenue',
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/payouts/paid]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* DELETE /api/admin/payouts/:id — hủy khoản chưa chi */
async function cancelPayout(req, res) {
  try {
    const [r] = await pool.query("DELETE FROM instructor_payouts WHERE id = ? AND status = 'PENDING'", [parseInt(req.params.id, 10)]);
    if (!r.affectedRows) return res.status(409).json({ message: 'Chỉ hủy được khoản đang chờ' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin/payouts/cancel]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

/* PUT /api/admin/users/:id/commission  { rate: 0–100 | null } — tỷ lệ riêng cho 1 giảng viên */
async function setCommission(req, res) {
  const id = parseInt(req.params.id, 10);
  const raw = req.body?.rate;
  const rate = raw === null || raw === '' ? null : Number(raw);
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
    return res.status(400).json({ message: 'Tỷ lệ hoa hồng từ 0 đến 100 (%)' });
  }
  try {
    const [r] = await pool.query("UPDATE users SET commission_rate = ? WHERE id = ? AND role = 'INSTRUCTOR'", [rate, id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
    return res.json({ ok: true, rate });
  } catch (err) {
    console.error('[admin/users/commission]', err);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

module.exports = {
  myRevenue, getProfile, updateProfile,
  payoutSummary, listPayouts, createPayout, markPayoutPaid, cancelPayout, setCommission,
};
