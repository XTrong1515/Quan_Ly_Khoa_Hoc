/**
 * Hash mật khẩu (bcrypt) — một chỗ duy nhất để chọn cài đặt.
 *
 * Ưu tiên @node-rs/bcrypt (native, chạy trên thread pool của libuv): bcryptjs (JavaScript thuần) tính hash
 * NGAY TRÊN luồng chính → khi nhiều người đăng nhập cùng lúc, cả server bị nghẽn
 * (đo được: trang chủ 800 → 18 req/s khi có 20 lượt đăng nhập song song — xem tests/load/).
 * Hai thư viện cùng định dạng $2a$/$2b$ nên đổi qua lại không cần đổi dữ liệu.
 * PASSWORD_HASHER=bcryptjs để ép dùng bản JS (vd máy không có bản build native).
 */
let impl;
let implementation;

if (process.env.PASSWORD_HASHER !== 'bcryptjs') {
  try {
    impl = require('@node-rs/bcrypt');
    implementation = '@node-rs/bcrypt (native, thread pool)';
  } catch {
    impl = null;
  }
}
if (!impl) {
  impl = require('bcryptjs');
  implementation = 'bcryptjs (JavaScript, luồng chính)';
}

const hash = (password, rounds) => impl.hash(password, rounds);
const compare = (password, hashed) => impl.compare(password, hashed);

module.exports = { hash, compare, implementation };
