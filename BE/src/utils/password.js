/**
 * Quy tắc mật khẩu dùng chung cho đăng ký / đặt lại / đổi mật khẩu / admin tạo tài khoản.
 * Khớp với FE (≥ 8 ký tự). Tối đa 72 byte vì bcrypt bỏ qua phần vượt quá — không báo lỗi.
 * Trả thông báo lỗi hoặc null nếu hợp lệ.
 */
function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Mật khẩu quá dài (tối đa 72 byte)';
  return null;
}

module.exports = { passwordError };
