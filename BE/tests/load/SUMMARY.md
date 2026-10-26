# Kiểm thử tải — tóm tắt cho báo cáo (26/10/2026)

Chạy: `cd BE && npm run load-test` · autocannon, 15 s / kịch bản · server 1 tiến trình Node (NODE_ENV=production), pool MySQL 10 kết nối · Windows 11 x64, Node 22 · dữ liệu: 10 khóa học sao từ DB dev.
Chi tiết từng lần chạy: `BEFORE-bcryptjs.md`, `AFTER-native-bcrypt.md`, `results/*.json`. Số liệu dao động ~±25% giữa các lần chạy trên máy cá nhân → nên lấy nhiều lần.

## 1. Năng lực các endpoint đọc (sau tối ưu)

| Endpoint | 50 kết nối | 200 kết nối | Lỗi |
|---|---|---|---|
| `GET /api/courses` (danh sách) | ~1.300–1.360 req/s · p99 ~100 ms | ~1.260–1.420 req/s · p99 200–340 ms | 0 |
| `GET /api/courses/:slug` (chi tiết) | ~1.000 req/s · p99 ~90 ms | ~1.000–1.070 req/s · p99 225–330 ms | 0 |
| `GET /api/home` | ~600–940 req/s · p99 110–240 ms | ~870–930 req/s · p99 310–520 ms | 0 |
| `GET /api/lessons/:id` (đã mua, có kiểm tra quyền) | ~760–800 req/s · p99 90–190 ms | ~780–790 req/s · p99 330–370 ms | 0 |

Nhận xét: từ 50 → 200 kết nối throughput gần như không đổi, độ trễ tăng tuyến tính → 1 tiến trình Node đã bão hòa (request xếp hàng), không phát sinh lỗi. Hướng mở rộng: chạy nhiều tiến trình (PM2 cluster / nhiều container sau load balancer), cache trang chủ/danh mục.

## 2. Điểm nghẽn tìm được & tối ưu: hash mật khẩu

bcryptjs (JavaScript thuần) tính bcrypt cost 12 **trên luồng chính** của Node → khi nhiều người đăng nhập, toàn bộ server bị chặn.
Đổi sang `@node-rs/bcrypt` (native, chạy trên thread pool libuv) — cùng định dạng hash `$2a$/$2b$`, không phải đổi dữ liệu (`src/utils/hash.js`).

| Chỉ số | bcryptjs (trước) | @node-rs/bcrypt (sau) | Thay đổi |
|---|---|---|---|
| Đăng nhập, 20 kết nối — throughput | 3 req/s | 15 req/s | ×5 |
| Đăng nhập — p50 | 4.939 ms | 1.252–1.338 ms | −73% |
| Trang chủ khi có 20 lượt đăng nhập song song — throughput | 18 req/s | 271–470 req/s | ×15–26 |
| Trang chủ khi có 20 lượt đăng nhập song song — p99 | 6.124 ms | 193–528 ms | −91–97% |

Ghi chú: đăng nhập vẫn "chậm" (~1,3 s khi 20 người cùng lúc) là có chủ đích — bcrypt cost 12 để chống dò mật khẩu offline; ngoài ra có giới hạn 10 lần sai / 15 phút / (IP + email). Giới hạn tần suất được tắt riêng khi đo.
