# Kết quả kiểm thử tải — 16:37:25 26/10/2026

Công cụ: autocannon · 15 s / kịch bản · server NODE_ENV=production, 1 tiến trình Node, pool MySQL 10 kết nối · hash mật khẩu: @node-rs/bcrypt (native, thread pool) · dữ liệu: 10 khóa học (sao từ DB dev) · máy chạy: win32 x64, Node v22.16.0

| Kịch bản | Endpoint | Kết nối đồng thời | Req/s | p50 (ms) | p90 (ms) | p99 (ms) | Lỗi | Non-2xx |
|---|---|---|---|---|---|---|---|---|
| Trang chủ | `/api/home` | 50 | 599 | 63 | 133 | 236 | 0 | 0 |
| Trang chủ | `/api/home` | 200 | 915 | 209 | 244 | 312 | 0 | 0 |
| Danh sách khóa học | `/api/courses` | 50 | 1353 | 33 | 42 | 94 | 0 | 0 |
| Danh sách khóa học | `/api/courses` | 200 | 1263 | 140 | 207 | 339 | 0 | 0 |
| Chi tiết khóa học | `/api/courses/javascript-the-hard-parts` | 50 | 993 | 47 | 58 | 89 | 0 | 0 |
| Chi tiết khóa học | `/api/courses/javascript-the-hard-parts` | 200 | 1027 | 192 | 209 | 225 | 0 | 0 |
| Vào bài học (đã mua) | `/api/lessons/:id` | 50 | 757 | 62 | 72 | 193 | 0 | 0 |
| Vào bài học (đã mua) | `/api/lessons/:id` | 200 | 790 | 247 | 263 | 330 | 0 | 0 |
| Đăng nhập (bcrypt 12) | `/api/auth/login` | 20 | 15 | 1252 | 1361 | 1402 | 0 | 0 |
| Trang chủ khi có 20 lượt đăng nhập song song | `/api/home` | 50 | 271 | 145 | 333 | 528 | 0 | 0 |

Ghi chú: đăng nhập chậm có chủ đích — bcrypt cost 12 (~250 ms CPU / lần) để chống dò mật khẩu offline; giới hạn tần suất đăng nhập được tắt riêng cho bài đo này.
