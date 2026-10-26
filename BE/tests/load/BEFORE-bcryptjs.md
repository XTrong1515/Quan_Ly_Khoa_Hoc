# Kết quả kiểm thử tải — 16:31:16 26/10/2026

Công cụ: autocannon · 15 s / kịch bản · server NODE_ENV=production, 1 tiến trình Node, pool MySQL 10 kết nối · hash mật khẩu: bcryptjs · dữ liệu: 10 khóa học (sao từ DB dev) · máy chạy: win32 x64, Node v22.16.0

| Kịch bản | Endpoint | Kết nối đồng thời | Req/s | p50 (ms) | p90 (ms) | p99 (ms) | Lỗi | Non-2xx |
|---|---|---|---|---|---|---|---|---|
| Trang chủ | `/api/home` | 50 | 792 | 50 | 65 | 140 | 0 | 0 |
| Trang chủ | `/api/home` | 200 | 865 | 206 | 307 | 523 | 0 | 0 |
| Danh sách khóa học | `/api/courses` | 50 | 1302 | 33 | 47 | 98 | 0 | 0 |
| Danh sách khóa học | `/api/courses` | 200 | 1423 | 135 | 157 | 204 | 0 | 0 |
| Chi tiết khóa học | `/api/courses/javascript-the-hard-parts` | 50 | 1048 | 45 | 54 | 88 | 0 | 0 |
| Chi tiết khóa học | `/api/courses/javascript-the-hard-parts` | 200 | 1072 | 180 | 199 | 280 | 0 | 0 |
| Vào bài học (đã mua) | `/api/lessons/:id` | 50 | 797 | 61 | 67 | 89 | 0 | 0 |
| Vào bài học (đã mua) | `/api/lessons/:id` | 200 | 780 | 242 | 304 | 370 | 0 | 0 |
| Đăng nhập (bcrypt 12) | `/api/auth/login` | 20 | 3 | 4939 | 4948 | 5553 | 0 | 0 |
| Trang chủ khi có 20 lượt đăng nhập song song | `/api/home` | 50 | 18 | 271 | 6063 | 6124 | 0 | 0 |

Ghi chú: đăng nhập chậm có chủ đích — bcrypt cost 12 (~250 ms CPU / lần) để chống dò mật khẩu offline; giới hạn tần suất đăng nhập được tắt riêng cho bài đo này.
