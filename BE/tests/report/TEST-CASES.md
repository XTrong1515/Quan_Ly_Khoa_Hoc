# Bảng test case tự động — 11:06:53 27/10/2026

Jest + Supertest trên DB riêng `<DB_NAME>_test` · 226 test · **226 đạt** · 0 không đạt · 10 bộ test.
Dịch vụ ngoài được giả lập (Gemini SDK, HEAD/DELETE object storage, fetch Judge0, gửi email); sandbox isolated-vm và MySQL chạy thật.

## Tổng hợp theo phân hệ

| Mã | Phân hệ | Số test | Đạt |
|---|---|---|---|
| AI | Trợ lý AI | 26 | 26 |
| APP | Đơn đăng ký giảng viên | 12 | 12 |
| AUTH | Xác thực | 17 | 17 |
| ROLE | Phân quyền | 17 | 17 |
| EXE | Bài tập lập trình & sandbox | 37 | 37 |
| HLS | Video HLS mã hóa AES-128 | 17 | 17 |
| INS | Giảng viên & duyệt khóa học | 39 | 39 |
| MED | Video & tài liệu (object storage) | 25 | 25 |
| PAY | Thanh toán & doanh thu giảng viên | 19 | 19 |
| SEC | Bảo mật | 17 | 17 |

## Chi tiết

| Mã TC | Phân hệ | Nhóm | Kịch bản & kết quả mong đợi | Kết quả | Thời gian (ms) |
|---|---|---|---|---|---|
| AI-01 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | stream từng đoạn và trả token đã dùng | ✅ Đạt | 1 |
| AI-02 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | model chính quá tải (503) → tự chuyển model dự phòng | ✅ Đạt | 1 |
| AI-03 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | circuit breaker: model vừa quá tải bị bỏ qua ở request sau (không chờ lại) | ✅ Đạt | 1 |
| AI-04 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | lỗi mạng (fetch failed) → thử model khác | ✅ Đạt | 0 |
| AI-05 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | lỗi giữa chừng khi đã gửi chữ cho người dùng → KHÔNG đổi model (tránh câu trả lời ghép) | ✅ Đạt | 1 |
| AI-06 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | mọi model đều quá tải → OVERLOADED với thông báo thân thiện | ✅ Đạt | 0 |
| AI-07 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | lỗi không thể thử lại (400) → không đổi model | ✅ Đạt | 6 |
| AI-08 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | generateJson: JSON hỏng lần đầu → gọi lại; hỏng mãi → BAD_OUTPUT | ✅ Đạt | 0 |
| AI-09 | Trợ lý AI | Prompt trợ lý — grounding & guardrails | catalog chỉ gồm khóa PUBLISHED; prompt có câu từ chối cố định và khóa học viên đã mua | ✅ Đạt | 2 |
| AI-10 | Trợ lý AI | Prompt trợ lý — grounding & guardrails | chỉ giữ khóa học có thật — slug AI bịa ra bị loại | ✅ Đạt | 0 |
| AI-11 | Trợ lý AI | POST /api/ai/chat — SSE | khách chưa đăng nhập → 401 | ✅ Đạt | 7 |
| AI-12 | Trợ lý AI | POST /api/ai/chat — SSE | tin nhắn rỗng → 400 | ✅ Đạt | 4 |
| AI-13 | Trợ lý AI | POST /api/ai/chat — SSE | tin nhắn quá 1000 ký tự → 400 | ✅ Đạt | 2 |
| AI-14 | Trợ lý AI | POST /api/ai/chat — SSE | chưa cấu hình API key → 503 | ✅ Đạt | 3 |
| AI-15 | Trợ lý AI | POST /api/ai/chat — SSE | stream meta → delta → done; done chỉ chứa khóa học có thật; lưu cả 2 tin nhắn | ✅ Đạt | 10 |
| AI-16 | Trợ lý AI | POST /api/ai/chat — SSE | hỏi tiếp trong cùng hội thoại → gửi kèm lịch sử cho AI | ✅ Đạt | 6 |
| AI-17 | Trợ lý AI | POST /api/ai/chat — SSE | lịch sử hội thoại: chỉ chủ sở hữu xem / xóa được | ✅ Đạt | 43 |
| AI-18 | Trợ lý AI | POST /api/ai/chat — SSE | AI lỗi → event error với thông báo thân thiện, vẫn kết thúc stream | ✅ Đạt | 8 |
| AI-19 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | giảng viên khác → 404; tham số sai → 400 | ✅ Đạt | 9 |
| AI-20 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | loại câu sai luật (một đáp án nhưng 2 đáp án đúng), trả bản nháp — không lưu DB | ✅ Đạt | 7 |
| AI-21 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | AI trả rác liên tục → 502 | ✅ Đạt | 3 |
| AI-22 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | prompt chỉ nhận nội dung bài học dạng text (bỏ thẻ HTML / script) | ✅ Đạt | 0 |
| AI-23 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | xáo trộn đáp án (LLM hay đặt đáp án đúng ở đầu) | ✅ Đạt | 0 |
| AI-24 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | AI soạn nội dung bài học: trả bản nháp Markdown (bỏ khối bọc ngoài), không lưu DB | ✅ Đạt | 4 |
| AI-25 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | AI soạn nội dung: giảng viên khác → 404; độ dài lạ / dàn ý quá dài → 400; AI trả quá ngắn → 502 | ✅ Đạt | 13 |
| AI-26 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | validator giữ đúng số câu yêu cầu | ✅ Đạt | 0 |
| APP-01 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | khách chưa đăng nhập → 401 | ✅ Đạt | 5 |
| APP-02 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | giới thiệu quá ngắn → 400 | ✅ Đạt | 14 |
| APP-03 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | thiếu chuyên môn → 400 | ✅ Đạt | 5 |
| APP-04 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | link không phải http(s) → 400 | ✅ Đạt | 5 |
| APP-05 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | link sai định dạng → 400 | ✅ Đạt | 4 |
| APP-06 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | nộp đơn → PENDING, admin được báo; không nộp được đơn thứ 2 khi đang chờ | ✅ Đạt | 20 |
| APP-07 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | giảng viên / admin không nộp đơn → 409 | ✅ Đạt | 9 |
| APP-08 | Đơn đăng ký giảng viên | Admin duyệt đơn | duyệt → role INSTRUCTOR, chép headline/bio sang hồ sơ, người nộp được báo; vào được khu giảng viên | ✅ Đạt | 27 |
| APP-09 | Đơn đăng ký giảng viên | Admin duyệt đơn | refresh token cấp access token mới mang role INSTRUCTOR (không cần đăng nhập lại) | ✅ Đạt | 30 |
| APP-10 | Đơn đăng ký giảng viên | Admin duyệt đơn | từ chối bắt buộc có lý do; người nộp thấy lý do và nộp lại được | ✅ Đạt | 25 |
| APP-11 | Đơn đăng ký giảng viên | Admin duyệt đơn | duyệt 2 lần / duyệt đơn đã từ chối → 409 | ✅ Đạt | 24 |
| APP-12 | Đơn đăng ký giảng viên | Admin duyệt đơn | danh sách + số đơn chờ; chỉ admin | ✅ Đạt | 9 |
| AUTH-01 | Xác thực | GET /health | trả về ok | ✅ Đạt | 3 |
| AUTH-02 | Xác thực | POST /api/auth/register | tạo tài khoản mới với role USER | ✅ Đạt | 204 |
| AUTH-03 | Xác thực | POST /api/auth/register | lưu mật khẩu dạng hash bcrypt, không lưu plaintext | ✅ Đạt | 1 |
| AUTH-04 | Xác thực | POST /api/auth/register | từ chối email đã tồn tại (409) | ✅ Đạt | 3 |
| AUTH-05 | Xác thực | POST /api/auth/register | từ chối khi thiếu thông tin (400) | ✅ Đạt | 2 |
| AUTH-06 | Xác thực | POST /api/auth/login | đăng nhập đúng trả về token và thông tin user | ✅ Đạt | 14 |
| AUTH-07 | Xác thực | POST /api/auth/login | không phân biệt hoa thường của email | ✅ Đạt | 8 |
| AUTH-08 | Xác thực | POST /api/auth/login | sai mật khẩu → 401 | ✅ Đạt | 5 |
| AUTH-09 | Xác thực | POST /api/auth/login | email không tồn tại → 401 với cùng thông báo (không lộ email nào có thật) | ✅ Đạt | 7 |
| AUTH-10 | Xác thực | POST /api/auth/login | tài khoản bị khóa → 403 | ✅ Đạt | 4 |
| AUTH-11 | Xác thực | GET /api/auth/me | có token hợp lệ → trả về user | ✅ Đạt | 5 |
| AUTH-12 | Xác thực | GET /api/auth/me | không có token → 401 | ✅ Đạt | 1 |
| AUTH-13 | Xác thực | GET /api/auth/me | token bị sửa → 401 | ✅ Đạt | 5 |
| AUTH-14 | Xác thực | POST /api/auth/refresh & logout | refresh token hợp lệ → cấp access token mới | ✅ Đạt | 10 |
| AUTH-15 | Xác thực | POST /api/auth/refresh & logout | access token không dùng thay refresh token được (khác secret) | ✅ Đạt | 4 |
| AUTH-16 | Xác thực | POST /api/auth/refresh & logout | sau khi logout, refresh token bị thu hồi | ✅ Đạt | 13 |
| AUTH-17 | Xác thực | POST /api/auth/refresh & logout | user bị khóa sau khi đăng nhập không refresh được | ✅ Đạt | 10 |
| ROLE-01 | Phân quyền | Phân quyền khu vực admin | get /api/admin/dashboard — khách chưa đăng nhập → 401 | ✅ Đạt | 3 |
| ROLE-02 | Phân quyền | Phân quyền khu vực admin | get /api/admin/users — khách chưa đăng nhập → 401 | ✅ Đạt | 2 |
| ROLE-03 | Phân quyền | Phân quyền khu vực admin | get /api/admin/orders — khách chưa đăng nhập → 401 | ✅ Đạt | 1 |
| ROLE-04 | Phân quyền | Phân quyền khu vực admin | get /api/admin/courses — khách chưa đăng nhập → 401 | ✅ Đạt | 2 |
| ROLE-05 | Phân quyền | Phân quyền khu vực admin | post /api/admin/categories — khách chưa đăng nhập → 401 | ✅ Đạt | 1 |
| ROLE-06 | Phân quyền | Phân quyền khu vực admin | post /api/admin/upload/image — khách chưa đăng nhập → 401 | ✅ Đạt | 2 |
| ROLE-07 | Phân quyền | Phân quyền khu vực admin | get /api/admin/dashboard — USER → 403 | ✅ Đạt | 13 |
| ROLE-08 | Phân quyền | Phân quyền khu vực admin | get /api/admin/users — USER → 403 | ✅ Đạt | 5 |
| ROLE-09 | Phân quyền | Phân quyền khu vực admin | get /api/admin/orders — USER → 403 | ✅ Đạt | 4 |
| ROLE-10 | Phân quyền | Phân quyền khu vực admin | get /api/admin/courses — USER → 403 | ✅ Đạt | 4 |
| ROLE-11 | Phân quyền | Phân quyền khu vực admin | post /api/admin/categories — USER → 403 | ✅ Đạt | 4 |
| ROLE-12 | Phân quyền | Phân quyền khu vực admin | post /api/admin/upload/image — USER → 403 | ✅ Đạt | 4 |
| ROLE-13 | Phân quyền | Phân quyền khu vực admin | ADMIN truy cập được dashboard | ✅ Đạt | 15 |
| ROLE-14 | Phân quyền | Route yêu cầu đăng nhập | get /api/orders/me — khách → 401 | ✅ Đạt | 2 |
| ROLE-15 | Phân quyền | Route yêu cầu đăng nhập | get /api/transactions/me — khách → 401 | ✅ Đạt | 1 |
| ROLE-16 | Phân quyền | Route yêu cầu đăng nhập | get /api/wishlists/me — khách → 401 | ✅ Đạt | 1 |
| ROLE-17 | Phân quyền | Route yêu cầu đăng nhập | get /api/notifications — khách → 401 | ✅ Đạt | 2 |
| EXE-01 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | code đúng → function sum(a, b) { return a + b } | ✅ Đạt | 5 |
| EXE-02 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | arrow function → const sum = (a, b) => a + b | ✅ Đạt | 2 |
| EXE-03 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | async function → async function sum(a, b) { return a + b } | ✅ Đạt | 2 |
| EXE-04 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | kết quả sai → function sum(a, b) { return a - b } | ✅ Đạt | 3 |
| EXE-05 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | throw lỗi → function sum() { throw new Error("boom") } | ✅ Đạt | 4 |
| EXE-06 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | sai tên hàm → function add(a, b) { return a + b } | ✅ Đạt | 2 |
| EXE-07 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | lỗi cú pháp → function sum(a, b { return a + b } | ✅ Đạt | 2 |
| EXE-08 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | vòng lặp vô hạn → function sum() { while (true) {} } | ✅ Đạt | 317 |
| EXE-09 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | vòng lặp ở top-level → while (true) {} | ✅ Đạt | 315 |
| EXE-10 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | Promise không resolve → function sum() { return new Promise(() => {}) } | ✅ Đạt | 356 |
| EXE-11 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | tràn bộ nhớ → function sum() { const a = []; while (true) a.push(new Array(1e6).fill(1)) } | ✅ Đạt | 46 |
| EXE-12 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | đệ quy vô hạn → function sum(a) { return sum(a) } | ✅ Đạt | 7 |
| EXE-13 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | không có require / process / fetch / setTimeout, không thoát được qua constructor | ✅ Đạt | 3 |
| EXE-14 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | mỗi test chạy trong context mới — biến toàn cục không rò giữa các test | ✅ Đạt | 3 |
| EXE-15 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | so sánh object không phụ thuộc thứ tự key; mảng phải đúng thứ tự | ✅ Đạt | 4 |
| EXE-16 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | ghi lại console.log để hiển thị cho học viên | ✅ Đạt | 2 |
| EXE-17 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | quá thời gian ở test đầu → bỏ qua các test sau | ✅ Đạt | 309 |
| EXE-18 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | server vẫn phục vụ request khác trong lúc đang chấm bài có vòng lặp vô hạn | ✅ Đạt | 1517 |
| EXE-19 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | tên hàm không hợp lệ → 400 | ✅ Đạt | 15 |
| EXE-20 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | input không phải mảng → 400 | ✅ Đạt | 5 |
| EXE-21 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | JSON sai → 400 | ✅ Đạt | 4 |
| EXE-22 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | toàn test ẩn → 400 | ✅ Đạt | 4 |
| EXE-23 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | không có test → 400 | ✅ Đạt | 4 |
| EXE-24 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | giới hạn thời gian lạ → 400 | ✅ Đạt | 5 |
| EXE-25 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | giảng viên khác không soạn / xem được → 404 | ✅ Đạt | 8 |
| EXE-26 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | lưu bài tập; lưu lại thì thay toàn bộ test case | ✅ Đạt | 19 |
| EXE-27 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | kiểm tra đề: lời giải đúng → ACCEPTED; đề sai expected → báo test sai | ✅ Đạt | 16 |
| EXE-28 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | đề bài không chứa lời giải và test ẩn | ✅ Đạt | 7 |
| EXE-29 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | chưa mua → 403 | ✅ Đạt | 7 |
| EXE-30 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | chạy thử: chỉ chạy test công khai, không lưu | ✅ Đạt | 8 |
| EXE-31 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | nộp sai test ẩn: test ẩn chỉ báo đạt/không, không lộ input/expected | ✅ Đạt | 9 |
| EXE-32 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | nộp đúng → ACCEPTED, lưu bài nộp, hoàn thành bài học và cập nhật % tiến độ | ✅ Đạt | 19 |
| EXE-33 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | code rỗng hoặc quá 20.000 ký tự → 400 | ✅ Đạt | 17 |
| EXE-34 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | giảng viên sở hữu nộp thử được nhưng không tính tiến độ | ✅ Đạt | 8 |
| EXE-35 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | xóa bài tập → học viên thấy exercise = null | ✅ Đạt | 10 |
| EXE-36 | Bài tập lập trình & sandbox | Giới hạn tần suất chạy code | vượt giới hạn → 429 | ✅ Đạt | 9 |
| EXE-37 | Bài tập lập trình & sandbox | Judge0 runner (fetch giả lập) | gửi theo lô, đọc kết quả sau marker, phân loại trạng thái | ✅ Đạt | 4 |
| HLS-01 | Video HLS mã hóa AES-128 | Khóa video — bọc bằng master key | seal → open trả lại đúng 16 byte, mỗi lần seal ra chuỗi khác nhau | ✅ Đạt | 2 |
| HLS-02 | Video HLS mã hóa AES-128 | Khóa video — bọc bằng master key | chuỗi bị sửa → không mở được (GCM xác thực) | ✅ Đạt | 16 |
| HLS-03 | Video HLS mã hóa AES-128 | rewritePlaylist | khóa → URI tương đối "key", đoạn → URL do hàm ký sinh ra, giữ nguyên các thẻ khác | ✅ Đạt | 0 |
| HLS-04 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | upload playlist + các đoạn .ts vào thư mục hls của bài học | ✅ Đạt | 0 |
| HLS-05 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | đoạn .ts đã mã hóa: không đọc được trực tiếp, giải mã bằng khóa + IV thì ra MPEG-TS hợp lệ | ✅ Đạt | 1 |
| HLS-06 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | playlist không chứa đường dẫn khóa trên đĩa server | ✅ Đạt | 0 |
| HLS-07 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | chi tiết bài học trả hlsUrl khi READY (vẫn kèm MP4 có hạn làm dự phòng) | ✅ Đạt | 13 |
| HLS-08 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | học viên đã mua: playlist với đoạn là presigned URL, không cache | ✅ Đạt | 6 |
| HLS-09 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | học viên đã mua: khóa đúng 16 byte, không cache | ✅ Đạt | 4 |
| HLS-10 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | chưa mua → 403, chưa đăng nhập → 401 (cả playlist lẫn khóa) | ✅ Đạt | 10 |
| HLS-11 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | giảng viên sở hữu xem được; giảng viên khác thì không | ✅ Đạt | 5 |
| HLS-12 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | video bị thay trong lúc mã hóa → bỏ kết quả, không ghi đè | ✅ Đạt | 108 |
| HLS-13 | Video HLS mã hóa AES-128 | WebM VP9/Opus | được chuyển mã sang H.264 (không chép thẳng VP9 vào .ts — trình duyệt không phát được) | ✅ Đạt | 432 |
| HLS-14 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | file trên storage không phải video → FAILED kèm lý do, không để lại file rác | ✅ Đạt | 33 |
| HLS-15 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | POST /lessons/:id/hls: chủ khóa học → 202 PROCESSING; giảng viên khác → 404; chưa có video → 400 | ✅ Đạt | 18 |
| HLS-16 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | đang PROCESSING → chi tiết bài học không trả hlsUrl (FE phát MP4), playlist 404 | ✅ Đạt | 8 |
| HLS-17 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | gỡ video → xóa thư mục HLS và reset trạng thái | ✅ Đạt | 5 |
| INS-01 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | khách → 401 | ✅ Đạt | 3 |
| INS-02 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | USER → 403 | ✅ Đạt | 3 |
| INS-03 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | ADMIN → 403 | ✅ Đạt | 3 |
| INS-04 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | USER không upload ảnh được qua /api/instructor/upload | ✅ Đạt | 2 |
| INS-05 | Giảng viên & duyệt khóa học | Giảng viên tạo & quản lý khóa học của mình | tạo khóa học: luôn là DRAFT, gán đúng chủ — bỏ qua status/instructorId/tag gửi lên | ✅ Đạt | 10 |
| INS-06 | Giảng viên & duyệt khóa học | Giảng viên tạo & quản lý khóa học của mình | dashboard trả số liệu dạng number | ✅ Đạt | 6 |
| INS-07 | Giảng viên & duyệt khóa học | Giảng viên tạo & quản lý khóa học của mình | danh sách chỉ gồm khóa học của chính mình | ✅ Đạt | 7 |
| INS-08 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | chủ khóa học thao tác được bình thường | ✅ Đạt | 5 |
| INS-09 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | get () => `/api/instructor/courses/${course.id}` → 404 | ✅ Đạt | 3 |
| INS-10 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/courses/${course.id}` → 404 | ✅ Đạt | 3 |
| INS-11 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/courses/${course.id}` → 404 | ✅ Đạt | 3 |
| INS-12 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | post () => `/api/instructor/courses/${course.id}/submit` → 404 | ✅ Đạt | 3 |
| INS-13 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | get () => `/api/instructor/courses/${course.id}/lessons` → 404 | ✅ Đạt | 6 |
| INS-14 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | post () => `/api/instructor/courses/${course.id}/lessons` → 404 | ✅ Đạt | 3 |
| INS-15 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/lessons/${lesson.id}` → 404 | ✅ Đạt | 3 |
| INS-16 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/lessons/${lesson.id}` → 404 | ✅ Đạt | 2 |
| INS-17 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | get () => `/api/instructor/lessons/${lesson.id}/quiz` → 404 | ✅ Đạt | 2 |
| INS-18 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/quizzes/${quizId}` → 404 | ✅ Đạt | 2 |
| INS-19 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/quizzes/${quizId}` → 404 | ✅ Đạt | 3 |
| INS-20 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | post () => `/api/instructor/quizzes/${quizId}/questions` → 404 | ✅ Đạt | 2 |
| INS-21 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/quiz-questions/${questionId}` → 404 | ✅ Đạt | 2 |
| INS-22 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/quiz-questions/${questionId}` → 404 | ✅ Đạt | 2 |
| INS-23 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | dữ liệu của A không bị thay đổi sau các request trên | ✅ Đạt | 1 |
| INS-24 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | sắp xếp bài học có lẫn bài của người khác → 404 | ✅ Đạt | 7 |
| INS-25 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | gán bài học vào section của khóa học khác → 400 | ✅ Đạt | 6 |
| INS-26 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | khóa học chưa có bài học → không gửi duyệt được | ✅ Đạt | 5 |
| INS-27 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | gửi duyệt → PENDING_REVIEW, admin nhận thông báo, khóa chỉnh sửa, chưa hiện công khai | ✅ Đạt | 19 |
| INS-28 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | admin duyệt → PUBLISHED, hiện công khai kèm thông tin giảng viên, giảng viên được báo | ✅ Đạt | 15 |
| INS-29 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | từ chối bắt buộc có lý do; giảng viên thấy lý do; gửi lại thì lý do được xóa | ✅ Đạt | 19 |
| INS-30 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | duyệt khóa học không ở trạng thái chờ duyệt → 409 | ✅ Đạt | 5 |
| INS-31 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | chỉ ADMIN được duyệt | ✅ Đạt | 4 |
| INS-32 | Giảng viên & duyệt khóa học | Khóa học đã xuất bản | không đổi được giá / tên | ✅ Đạt | 3 |
| INS-33 | Giảng viên & duyệt khóa học | Khóa học đã xuất bản | gửi lại nguyên giá cũ + đổi mô tả ngắn → được | ✅ Đạt | 5 |
| INS-34 | Giảng viên & duyệt khóa học | Khóa học đã xuất bản | không xóa được | ✅ Đạt | 3 |
| INS-35 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | đổi role USER → INSTRUCTOR | ✅ Đạt | 5 |
| INS-36 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | role không hợp lệ → 400 | ✅ Đạt | 4 |
| INS-37 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | gán khóa học cho giảng viên → đồng bộ instructor_name; gán cho USER → 400 | ✅ Đạt | 9 |
| INS-38 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | lọc khóa học chờ duyệt + đếm pendingReview | ✅ Đạt | 5 |
| INS-39 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | kéo-thả sắp xếp khóa học hoạt động (trước đây route bị /:id chặn) | ✅ Đạt | 6 |
| MED-01 | Video & tài liệu (object storage) | Trang khóa học công khai không lộ link video | GET /api/courses/:slug không trả video_url của bất kỳ bài nào | ✅ Đạt | 8 |
| MED-02 | Video & tài liệu (object storage) | Trang khóa học công khai không lộ link video | bài xem thử lấy link qua /preview; bài trả phí bị chặn | ✅ Đạt | 5 |
| MED-03 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | chủ khóa học nhận URL có chữ ký, key nằm trong thư mục bài học, hết hạn 15 phút | ✅ Đạt | 21 |
| MED-04 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | sai định dạng video → 400 | ✅ Đạt | 6 |
| MED-05 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | PDF giả làm video → 400 | ✅ Đạt | 7 |
| MED-06 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | file .exe làm tài liệu → 400 | ✅ Đạt | 16 |
| MED-07 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | quá dung lượng → 400 | ✅ Đạt | 4 |
| MED-08 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | size không hợp lệ → 400 | ✅ Đạt | 4 |
| MED-09 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | kind lạ → 400 | ✅ Đạt | 3 |
| MED-10 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | giảng viên khác → 404; học viên → 403 | ✅ Đạt | 6 |
| MED-11 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | admin dùng được qua /api/admin | ✅ Đạt | 5 |
| MED-12 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | key của bài học khác → 400 (không trỏ được sang file người khác) | ✅ Đạt | 5 |
| MED-13 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | key có ".." → 400 | ✅ Đạt | 3 |
| MED-14 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | file chưa có trên storage → 400 | ✅ Đạt | 3 |
| MED-15 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | file thật sai định dạng (đổi Content-Type khi upload) → 400 và bị xóa | ✅ Đạt | 3 |
| MED-16 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | hợp lệ → lưu video_key; thay video mới thì xóa file cũ | ✅ Đạt | 10 |
| MED-17 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | gắn PDF kèm tên file gốc | ✅ Đạt | 8 |
| MED-18 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | học viên đã mua: link presigned trỏ tới file trên storage, kèm thời điểm hết hạn | ✅ Đạt | 8 |
| MED-19 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | chưa mua → 403, không nhận được link | ✅ Đạt | 3 |
| MED-20 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | staffView chỉ bật cho admin / giảng viên sở hữu | ✅ Đạt | 13 |
| MED-21 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | giảng viên sở hữu và admin xem được dù không mua; giảng viên khác thì không | ✅ Đạt | 14 |
| MED-22 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | tài liệu PDF: link 5 phút, mở inline với tên file gốc | ✅ Đạt | 10 |
| MED-23 | Video & tài liệu (object storage) | Dọn file trên storage | gỡ video khỏi bài học → xóa object | ✅ Đạt | 6 |
| MED-24 | Video & tài liệu (object storage) | Dọn file trên storage | xóa bài học → xóa luôn file đính kèm | ✅ Đạt | 8 |
| MED-25 | Video & tài liệu (object storage) | Mục lục trong trình phát | bài học chưa gán section vẫn hiện (nhóm "Bài học khác" ở cuối), không mất khỏi điều hướng | ✅ Đạt | 7 |
| PAY-01 | Thanh toán & doanh thu giảng viên | Chia doanh thu | giảng viên nhận (100 − hoa hồng)%, làm tròn đồng; khóa không có giảng viên → nền tảng giữ 100% | ✅ Đạt | 1 |
| PAY-02 | Thanh toán & doanh thu giảng viên | markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID | chụp số liệu doanh thu, tạo enrollment, tăng số học viên | ✅ Đạt | 10 |
| PAY-03 | Thanh toán & doanh thu giảng viên | markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID | đổi tỷ lệ hoa hồng SAU khi bán không làm thay đổi doanh thu cũ | ✅ Đạt | 9 |
| PAY-04 | Thanh toán & doanh thu giảng viên | markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID | gọi 2 lần đồng thời → chỉ 1 lần xử lý (không trùng enrollment / số học viên) | ✅ Đạt | 10 |
| PAY-05 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | dev mock (VNPay chưa cấu hình) → PAID; gọi lại lần 2 không xử lý lại | ✅ Đạt | 18 |
| PAY-06 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | thông báo thanh toán có đúng mã đơn (trước đây hiển thị "#undefined") | ✅ Đạt | 67 |
| PAY-07 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | không có dev_mock khi VNPay chưa cấu hình → 400, đơn vẫn PENDING | ✅ Đạt | 8 |
| PAY-08 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | đơn của người khác → 403 | ✅ Đạt | 5 |
| PAY-09 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | VNPay ĐÃ cấu hình: gửi dev_mock=1 không còn bỏ qua được kiểm tra chữ ký | ✅ Đạt | 78 |
| PAY-10 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | thanh toán thất bại → FAILED; không ghi đè đơn đã PAID | ✅ Đạt | 7 |
| PAY-11 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | giảng viên thấy đúng doanh thu (bỏ đơn đã hủy), theo ngày và theo khóa | ✅ Đạt | 8 |
| PAY-12 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | giảng viên khác không thấy doanh thu của người này | ✅ Đạt | 5 |
| PAY-13 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | chưa có tài khoản ngân hàng → admin không tạo được khoản chi trả | ✅ Đạt | 4 |
| PAY-14 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | cập nhật tài khoản ngân hàng (kiểm tra số tài khoản) | ✅ Đạt | 11 |
| PAY-15 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | không chi trả vượt số dư; tạo → chờ → đã trả; số liệu 2 phía khớp nhau | ✅ Đạt | 42 |
| PAY-16 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | 2 admin tạo chi trả cùng lúc không vượt được số dư | ✅ Đạt | 8 |
| PAY-17 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | hủy khoản đang chờ; không hủy được khoản đã trả | ✅ Đạt | 7 |
| PAY-18 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | tỷ lệ hoa hồng riêng: 0–100 hoặc null; chỉ áp cho giảng viên | ✅ Đạt | 12 |
| PAY-19 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | chỉ admin xem đối soát; học viên / giảng viên → 403 | ✅ Đạt | 2 |
| SEC-01 | Bảo mật | Header bảo mật & CORS | helmet: nosniff, chống clickjacking, ẩn X-Powered-By; ảnh /uploads vẫn dùng được từ FE khác cổng | ✅ Đạt | 4 |
| SEC-02 | Bảo mật | Header bảo mật & CORS | CORS chỉ cho phép đúng origin của FE | ✅ Đạt | 3 |
| SEC-03 | Bảo mật | JWT — không giả mạo được | alg "none" (không chữ ký) → 401 | ✅ Đạt | 3 |
| SEC-04 | Bảo mật | JWT — không giả mạo được | ký bằng secret khác để tự nâng quyền ADMIN → 401 | ✅ Đạt | 5 |
| SEC-05 | Bảo mật | JWT — không giả mạo được | token hết hạn → 401 | ✅ Đạt | 3 |
| SEC-06 | Bảo mật | Đăng ký / mật khẩu | không tự gán role ADMIN khi đăng ký (mass assignment) | ✅ Đạt | 208 |
| SEC-07 | Bảo mật | Đăng ký / mật khẩu | mật khẩu quá ngắn → 400 | ✅ Đạt | 2 |
| SEC-08 | Bảo mật | Đăng ký / mật khẩu | mật khẩu quá 72 byte → 400 | ✅ Đạt | 2 |
| SEC-09 | Bảo mật | Đăng ký / mật khẩu | đổi mật khẩu yếu → 400 | ✅ Đạt | 5 |
| SEC-10 | Bảo mật | Đăng ký / mật khẩu | quên mật khẩu: email có hay không có tài khoản đều trả cùng thông báo (không dò được email) | ✅ Đạt | 10 |
| SEC-11 | Bảo mật | Đăng ký / mật khẩu | token đặt lại mật khẩu chỉ dùng 1 lần, và thu hồi mọi phiên đăng nhập cũ | ✅ Đạt | 414 |
| SEC-12 | Bảo mật | SQL injection | đăng nhập với email ' OR '1'='1 → 401, bảng users còn nguyên | ✅ Đạt | 3 |
| SEC-13 | Bảo mật | SQL injection | đăng nhập với email admin@test.local' --  → 401, bảng users còn nguyên | ✅ Đạt | 2 |
| SEC-14 | Bảo mật | SQL injection | đăng nhập với email "; DROP TABLE users; -- → 401, bảng users còn nguyên | ✅ Đạt | 3 |
| SEC-15 | Bảo mật | SQL injection | tìm kiếm khóa học với chuỗi injection → 200, không lỗi máy chủ | ✅ Đạt | 7 |
| SEC-16 | Bảo mật | Chống brute-force đăng nhập | sai mật khẩu quá 3 lần → 429, kể cả khi sau đó nhập đúng | ✅ Đạt | 23 |
| SEC-17 | Bảo mật | Chống brute-force đăng nhập | đăng nhập đúng (nhiều lần liên tiếp, cùng giây) không bị tính và không lỗi | ✅ Đạt | 25 |
