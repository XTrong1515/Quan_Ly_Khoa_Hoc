/** Định dạng số tiền VND: 0 → "0đ" (doanh thu, số dư, tổng đơn đều có thể bằng 0). Giá khóa học dùng formatPrice. */
export function formatVND(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';
}

/** Giá khóa học: 0 → "Miễn phí", còn lại như formatVND. API có thể trả DECIMAL dạng chuỗi ("0.00"). */
export function formatPrice(n) {
  return Number(n) === 0 ? 'Miễn phí' : formatVND(n);
}

/** Thời lượng từ số giờ (8.5 → "8h 30m", 0.1 → "6m"); tính theo tổng phút để không ra "60m" / "1h 60m". */
export function formatHours(h) {
  const total = Math.round((Number(h) || 0) * 60);
  if (!total) return '—'; // khóa chưa nhập thời lượng bài học
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}m`; // khóa ngắn: "6m" thay vì "0h 6m"
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Nhãn cấp độ cho mọi nơi hiển thị — nhận enum ("ADVANCED") hoặc giá trị cũ trên URL ("Advanced"). */
const LEVEL_TEXT = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };
export const levelLabel = (level) => LEVEL_TEXT[String(level ?? '').toUpperCase()] ?? level ?? '';

/** Số gọn: 950 → "950", 1250 → "1,3k", 22108 → "22,1k". */
export function compactCount(n) {
  const v = Number(n) || 0;
  return v >= 1000 ? `${(v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}k` : String(v);
}

/** Khóa đã có đánh giá thật chưa — rating từ API là chuỗi DECIMAL ("0.00" vẫn truthy). */
export const hasRating = (course) => Number(course?.review_count) > 0 && Number(course?.rating) > 0;

/** Phần trăm gọn, ép kẹp [0..100] và làm tròn. */
export const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));
