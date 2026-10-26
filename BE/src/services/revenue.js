/**
 * Số liệu doanh thu giảng viên — dùng chung cho trang giảng viên và trang đối soát của admin,
 * nên hai bên luôn khớp nhau. Chỉ tính đơn PAID; số liệu lấy từ order_items đã chụp lúc thanh toán.
 *
 *   earned   = Σ instructor_earning (đơn PAID)
 *   paidOut  = Σ payout PAID       pending = Σ payout PENDING
 *   balance  = earned − paidOut − pending   (số còn có thể chi trả)
 */
const pool = require('../config/db');

const money = (v) => Math.round(Number(v ?? 0));

async function balances(instructorIds, conn = pool) {
  if (!instructorIds.length) return new Map();
  const [earned] = await conn.query(
    `SELECT oi.instructor_id AS id, SUM(oi.price) AS gross, SUM(oi.instructor_earning) AS earned, COUNT(*) AS sales
     FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.status = 'PAID'
     WHERE oi.instructor_id IN (?) GROUP BY oi.instructor_id`,
    [instructorIds],
  );
  const [payouts] = await conn.query(
    `SELECT instructor_id AS id,
            SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END)    AS paidOut,
            SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END) AS pending
     FROM instructor_payouts WHERE instructor_id IN (?) GROUP BY instructor_id`,
    [instructorIds],
  );
  const e = new Map(earned.map((r) => [r.id, r]));
  const p = new Map(payouts.map((r) => [r.id, r]));
  return new Map(instructorIds.map((id) => {
    const row = {
      gross: money(e.get(id)?.gross), earned: money(e.get(id)?.earned), sales: Number(e.get(id)?.sales ?? 0),
      paidOut: money(p.get(id)?.paidOut), pending: money(p.get(id)?.pending),
    };
    row.balance = row.earned - row.paidOut - row.pending;
    return [id, row];
  }));
}

const balanceOf = async (instructorId, conn) => (await balances([instructorId], conn)).get(instructorId);

/** Doanh thu theo ngày trong khoảng [from, to] (YYYY-MM-DD), có điền các ngày không bán được = 0. */
async function dailySeries(instructorId, from, to) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(o.paid_at, '%Y-%m-%d') AS day, SUM(oi.price) AS gross, SUM(oi.instructor_earning) AS earned, COUNT(*) AS sales
     FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.status = 'PAID'
     WHERE oi.instructor_id = ? AND o.paid_at >= ? AND o.paid_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY day ORDER BY day`,
    [instructorId, from, to],
  );
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const r = byDay.get(day);
    out.push({ day, gross: money(r?.gross), earned: money(r?.earned), sales: Number(r?.sales ?? 0) });
  }
  return out;
}

async function byCourse(instructorId, from, to) {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.slug, COUNT(*) AS sales, SUM(oi.price) AS gross, SUM(oi.instructor_earning) AS earned
     FROM order_items oi
     JOIN orders o  ON o.id = oi.order_id AND o.status = 'PAID'
     JOIN courses c ON c.id = oi.course_id
     WHERE oi.instructor_id = ? AND o.paid_at >= ? AND o.paid_at < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY c.id ORDER BY earned DESC`,
    [instructorId, from, to],
  );
  return rows.map((r) => ({ ...r, sales: Number(r.sales), gross: money(r.gross), earned: money(r.earned) }));
}

/** Khoảng ngày hợp lệ từ query (?from=&to=), mặc định 30 ngày gần nhất, tối đa 366 ngày. */
function parseRange(query) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date().toISOString().slice(0, 10);
  const to = iso.test(query.to ?? '') ? query.to : today;
  const defFrom = new Date(`${to}T00:00:00Z`); defFrom.setUTCDate(defFrom.getUTCDate() - 29);
  let from = iso.test(query.from ?? '') ? query.from : defFrom.toISOString().slice(0, 10);
  if (from > to) from = to;
  const maxFrom = new Date(`${to}T00:00:00Z`); maxFrom.setUTCDate(maxFrom.getUTCDate() - 365);
  if (from < maxFrom.toISOString().slice(0, 10)) from = maxFrom.toISOString().slice(0, 10);
  return { from, to };
}

module.exports = { balances, balanceOf, dailySeries, byCourse, parseRange, money };
