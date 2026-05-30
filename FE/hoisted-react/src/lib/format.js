/** Định dạng tiền VND, trả về "Free" khi giá = 0. */
export function formatVND(n) {
  if (n === 0) return 'Free';
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

/** Hh:mm hoặc h:mm tùy độ dài (8.5h → "8h 30m"). */
export function formatHours(h) {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Phần trăm gọn, ép kẹp [0..100] và làm tròn. */
export const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));
