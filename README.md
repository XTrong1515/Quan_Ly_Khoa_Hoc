# Hoisted — Website khóa học & tài liệu JavaScript trực tuyến tích hợp AI

Đồ án tốt nghiệp · Khoa CNTT, Trường ĐH Tài nguyên và Môi trường TP.HCM · GVHD: ThS. Cao Hữu Thanh Vũ · SV: Trầm Xuân Trọng (1050080081)

Nền tảng e-commerce tài sản số cho khóa học JavaScript: bán & phân quyền truy cập video / tài liệu, bài tập lập trình chấm tự động, trợ lý AI tư vấn lộ trình, khu vực giảng viên và đối soát doanh thu.

## Tính năng theo tác nhân

| Tác nhân | Chức năng chính |
|---|---|
| **Học viên** | Tìm / xem / mua khóa học (VNPay), học video bảo mật (link có hạn + watermark), tài liệu PDF, quiz, **bài tập code chấm tự động**, thảo luận, wishlist, **trợ lý AI** gợi ý khóa học & lộ trình |
| **Giảng viên** | Đăng ký làm giảng viên (admin duyệt), tạo khóa học → gửi duyệt, soạn bài học (Markdown) / quiz / bài tập, upload video & PDF lên storage private, **AI soạn nội dung bài học & câu hỏi quiz**, xem **doanh thu** & lịch sử chi trả, khai báo tài khoản nhận tiền |
| **Quản trị viên** | Duyệt đơn giảng viên, duyệt / từ chối khóa học, quản lý người dùng & vai trò, đơn hàng, đánh giá, danh mục, dashboard doanh thu, **đối soát & chi trả** cho giảng viên, tỷ lệ hoa hồng |

## Công nghệ

- **FE:** React 18 + Vite, TanStack Query, Zustand, Tailwind CSS, CodeMirror 6, Recharts — `FE/hoisted-react/`
- **BE:** Node.js 22 + Express, MySQL 8 (mysql2, SQL thuần với prepared statement), JWT access/refresh — `BE/`
- **Object storage:** S3-compatible — MinIO khi dev (Cloudflare R2 / AWS S3 khi deploy, chỉ đổi biến `S3_*`)
- **Chấm code:** sandbox `isolated-vm` (V8 isolate) — Judge0 là runner tùy chọn cùng interface
- **AI:** Google Gemini (`@google/genai`) qua lớp trừu tượng `services/llm.js` (chuỗi model dự phòng, circuit breaker)
- **Thanh toán:** VNPay (sandbox)

## Cài đặt

Yêu cầu: Node.js 22, MySQL 8. Tùy chọn: Go ≥ 1.24 (build MinIO), khóa Gemini API.

```bash
# 1. Backend
cd BE
npm install
cp .env.example .env          # điền DB_*, JWT_*, (VNPay, Gemini, S3) — xem chú thích trong file

# 2. CSDL — chọn 1 trong 2:
npm run db:setup              # DB mới, trống, từ database/full_schema.sql (29 bảng)
npm run db:restore -- backups/<file>.sql   # hoặc khôi phục bản sao lưu có sẵn dữ liệu demo

# 3. (DB đang chạy bản cũ) nâng cấp cấu trúc — các script đều chạy lại an toàn
node database/instructor_migration.js
node database/media_migration.js
node database/exercise_migration.js
node database/ai_migration.js
node database/revenue_migration.js
node database/application_migration.js
node database/hls_migration.js

# 4. Dữ liệu demo (dev)
node database/seed_instructors.js
node --no-node-snapshot database/seed_exercises.js
node --no-node-snapshot database/seed_demo.js

# 5. Object storage (MinIO local) — terminal riêng
go install github.com/minio/minio@latest   # 1 lần
npm run storage                             # API :9000 · console :9001

# 6. Chạy
npm run dev                   # API → http://localhost:3001
cd ../FE/hoisted-react && npm install && npm run dev   # → http://localhost:5173
```

Kiểm tra kết nối dịch vụ: `npm run check:services` (storage, sandbox, Judge0, Gemini).

## Tài khoản demo (sau bước 4)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Học viên | `demo.hocvien@hoisted.dev` | `Demo@12345` |
| Giảng viên | `will.sentance@hoisted.dev` (và 7 giảng viên khác `@hoisted.dev`) | `Instructor@123` |
| Quản trị viên | tài khoản ADMIN có sẵn trong DB | — |

## Kiểm thử & số liệu

| Lệnh | Nội dung | Kết quả mới nhất |
|---|---|---|
| `npm test` | 208 test API (Jest + Supertest) trên DB riêng `<DB_NAME>_test` | 208/208 đạt |
| `npm run test:report` | Sinh bảng test case → `BE/tests/report/TEST-CASES.md` | 9 phân hệ |
| `npm run load-test` | Kiểm thử tải (autocannon) → `BE/tests/load/` | ~760–1.400 req/s, 0 lỗi; xem `SUMMARY.md` |
| `npm run ai:eval` | 30 câu đánh giá trợ lý với Gemini thật → `BE/tests/ai-eval/LATEST.md` | 29/30, 0 khóa học bịa |
| `npm run lint` (FE) | ESLint, 0 cảnh báo | đạt |

## Bảo mật (tóm tắt)

- Mật khẩu bcrypt cost 12 (native, không chặn event loop); ≥ 8 ký tự; giới hạn đăng nhập sai 10 lần / 15 phút / (IP + email)
- JWT access 15 phút + refresh 30 ngày (secret riêng, lưu & thu hồi trong DB)
- Phân quyền ở BE: `requireRole`, `requireOwnership` (chống IDOR — trả 404), `requireEnrollment`
- Video / PDF trong bucket private, chỉ cấp presigned URL ngắn hạn cho người có quyền
- Video tự mã hóa **HLS AES-128** sau khi upload (ffmpeg chạy nền): mỗi video 1 khóa riêng, khóa lưu trong DB đã bọc bằng `HLS_MASTER_KEY`, chỉ cấp qua `/api/lessons/:id/hls/key` cho người có quyền; các đoạn `.ts` là presigned URL ngắn hạn
- Sandbox chấm code: isolate riêng, giới hạn RAM / thời gian, không có `require` / `process` / mạng
- Callback thanh toán kiểm tra chữ ký VNPay, xử lý idempotent (1 đơn chỉ chuyển PAID 1 lần)
- Nội dung do giảng viên soạn hiển thị qua Markdown / DOMPurify (chống XSS lưu trữ)
- `helmet`, CORS theo origin FE, prepared statement 100%, rate limit cho chạy code & AI

## Sao lưu dữ liệu

```bash
cd BE
npm run db:backup             # → BE/backups/<db>-<thời điểm>.sql (không đưa lên git)
npm run db:export-schema      # cập nhật database/full_schema.sql sau khi đổi cấu trúc
```

## Hạn chế & hướng phát triển

- HLS AES-128 chống tải / chia sẻ link, nhưng khóa vẫn phải giao cho trình duyệt người xem → không chống được người cố tình trích khóa hay quay màn hình (cần DRM Widevine/FairPlay — dịch vụ trả phí); watermark email giúp truy vết
- Mã hóa video chạy tuần tự trong cùng tiến trình API → khi nhiều giảng viên upload cùng lúc nên tách worker riêng (BullMQ + Redis)
- Chấm code chỉ hỗ trợ JavaScript thuần; mở rộng đa ngôn ngữ bằng Judge0 tự host
- Chi trả giảng viên thủ công (chuyển khoản + ghi nhận); split payment tự động cần tài khoản merchant riêng
- Gemini free tier hay quá tải — hệ thống tự chuyển model, nên dùng gói trả phí khi chạy thật
- 1 tiến trình Node bão hòa ở ~1.000 req/s → mở rộng bằng nhiều tiến trình / cache
