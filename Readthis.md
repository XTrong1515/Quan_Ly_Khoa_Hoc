# PLAN: Tính sở hữu khóa học (Course Ownership)

---

## Tóm tắt

Mỗi user chỉ truy cập được khóa học mà chính họ đã mua. User A mua khóa X → User A có enrollment; User B không mua → User B không có quyền truy cập. Đây là tính đảm bảo quan trọng nhất của hệ thống.

---

## Hiện trạng — cái đã hoạt động đúng ✅

| # | Chỗ kiểm tra | File | Chi tiết |
|---|---|---|---|
| 1 | Xem bài học | `BE/src/controllers/lessonController.js:45` | `GET /api/lessons/:id` → check `enrollments WHERE user_id=? AND course_id=?`, trả 403 nếu không có |
| 2 | Tải tài liệu | `lessonController.js:148` | `GET /api/lessons/:id/attachment` → cùng enrollment check |
| 3 | Tạo enrollment sau mua | `BE/src/controllers/orderController.js:190` | Sau `PAID`, INSERT vào `enrollments(user_id, course_id, order_id)` → đúng `user_id` của người mua |
| 4 | Chặn mua lại | `orderController.js:89` | Trước khi tạo order, check `enrollments WHERE user_id=? AND course_id IN (...)`, trả 400 nếu đã có |
| 5 | `isEnrolled` trên course detail | `BE/src/controllers/courseController.js:154` | Chỉ trả `true` cho đúng `req.user.id`, guest nhận `false` |
| 6 | FE course detail sidebar | `FE/.../course-detail.jsx:209` | Nếu `isEnrolled` → hiện "Tiếp tục học", ẩn nút Mua/Giỏ |
| 7 | My Learning page | `FE/.../my-learning.jsx:15` | Gọi `GET /api/enrollments/me` → chỉ trả khóa học của đúng user đang đăng nhập |
| 8 | Preview lesson | `lessonController.js:18` | Bài `is_preview=1` cho phép xem không cần enrollment (đúng thiết kế) |

**Kết luận**: Lõi ownership đã an toàn — backend enforce đúng. Dưới đây là các **gap về UX và tổ chức code** cần bổ sung.

---

## Các gap cần xử lý

### Gap 1 — Giỏ hàng không lọc khóa học đã sở hữu
**Vấn đề**: User đã mua khóa A, vẫn có thể add lại vào cart và thấy nó trong giỏ. Backend sẽ chặn ở bước checkout (trả lỗi 400), nhưng UX xấu — user bấm "Thanh toán" mới biết bị lỗi.

**File bị ảnh hưởng**: `FE/.../cart.jsx`

**Fix**: Khi user đã đăng nhập, CartPage fetch danh sách `enrolledCourseIds`, bôi đỏ + cảnh báo những course đã sở hữu, disable nút Checkout cho đến khi xóa hết.

---

### Gap 2 — Không có `requireEnrollment` middleware tập trung
**Vấn đề**: Enrollment check hiện viết inline trong `lessonController` (2 lần: lesson detail + attachment). Nếu sau này thêm endpoint mới (download subtitle, quiz, v.v.) sẽ dễ quên check.

**File bị ảnh hưởng**: `BE/src/middleware/` (cần tạo file mới), `BE/src/routes/lessons.js`

**Fix**: Tách logic thành middleware `requireEnrollment` dùng chung.

---

### Gap 3 — Không có luồng đăng ký khóa học miễn phí (price = 0)
**Vấn đề**: Mọi khóa học đều đi qua order → VNPay. Nếu `price = 0`, user vẫn phải tạo order → xử lý mock payment → mới có enrollment. Không thể "Đăng ký ngay" trực tiếp.

**Fix**: Thêm endpoint `POST /api/enrollments` cho free course (BE), thêm nút "Đăng ký miễn phí" trên course detail (FE).

---

### Gap 4 — FE `/learn` không có route guard phía client
**Vấn đề**: Nếu user gõ thẳng URL `/learn/5/23`, FE render `LessonPlayerPage`, gọi API, rồi nhận 403 và hiển thị lỗi. Không redirect, không giải thích tại sao.

**File bị ảnh hưởng**: `FE/.../router.jsx`, `FE/.../lesson-player.jsx`

**Fix**: Khi API lesson trả 403, FE redirect sang `/courses/:slug` kèm toast "Bạn chưa đăng ký khóa học này".

---

### Gap 5 — Admin không thể xem enrollment của từng user
**Vấn đề**: Trong admin panel, trang Users và Orders không liên kết được "user này đang học gì".

**File bị ảnh hưởng**: `BE/src/controllers/adminController.js`, `FE/.../admin/users.jsx`

**Fix** (nice-to-have, có thể làm sau): Thêm `GET /api/admin/users/:id/enrollments`.

---

## Kế hoạch triển khai (thứ tự ưu tiên)

### Bước 1 — Middleware `requireEnrollment` (BE)
**File**: `BE/src/middleware/enrollment.js` (tạo mới)

```
export requireEnrollment(req, res, next):
  lessonId = req.params.id
  userId = req.user.id
  query: SELECT l.course_id FROM lessons l WHERE l.id = lessonId
  query: SELECT id FROM enrollments WHERE user_id=userId AND course_id=courseId
  if not found → 403 { message: 'Bạn chưa đăng ký khóa học này' }
  else: req.enrollmentId = enrollRows[0].id; next()
```

**Sau đó**: refactor `lessonController.js` để dùng `req.enrollmentId` thay vì query lại, apply middleware vào route:
- `GET /api/lessons/:id` — thêm `requireEnrollment` (chỉ nếu lesson không phải preview)
- `GET /api/lessons/:id/attachment` — thêm `requireEnrollment`

---

### Bước 2 — Cart: cảnh báo khóa học đã sở hữu (FE)
**File**: `FE/.../pages/public/cart.jsx`

Logic:
```
1. Nếu user đã đăng nhập: fetch GET /api/enrollments/me
2. Tạo Set enrolledIds = new Set(enrollments.map(e => e.courseId))
3. Với mỗi course trong cart: nếu enrolledIds.has(course.id) → hiện badge "Đã sở hữu" màu warning, disable item
4. Nếu có bất kỳ course "Đã sở hữu" trong cart → disable nút Checkout, hiện message "Vui lòng xóa khóa học đã sở hữu"
```

Dùng `useQuery(['enrollments', 'ids'])` với `enabled: role !== 'guest'`.

---

### Bước 3 — Free course enrollment flow (BE + FE)
**BE — File**: `BE/src/controllers/enrollmentController.js` — thêm hàm `enrollFree`

```
POST /api/enrollments
body: { courseId }
- requireAuth
- check course tồn tại và price = 0 (hoặc price <= 0)
- check chưa enrolled
- INSERT enrollments(user_id, course_id, order_id=NULL)
- return { enrollmentId }
```

**FE — File**: `FE/.../pages/public/course-detail.jsx`

```
Nếu course.price === 0 VÀ !isEnrolled:
  → hiện Button "Đăng ký miễn phí" thay vì "Thêm vào giỏ"
  → onClick: mutation gọi POST /api/enrollments, sau đó invalidate ['course', slug]
```

---

### Bước 4 — Redirect 403 trên Lesson Player (FE)
**File**: `FE/.../pages/user/lesson-player.jsx`

```
const { data, isLoading, isError, error } = useQuery(...)

// Thêm:
useEffect(() => {
  if (isError && error?.response?.status === 403) {
    toast.error('Bạn chưa đăng ký khóa học này');
    navigate(`/courses/${data?.lesson?.courseSlug ?? ''}`);
  }
}, [isError, error]);
```

Cũng cần: `GET /api/lessons/:id` trả thêm `courseSlug` trong error payload 403 để FE biết redirect đi đâu, hoặc dùng courseId từ URL params.

---

### Bước 5 — Admin: xem enrollment theo user (BE + FE) *(nice-to-have)*
**BE**: `GET /api/admin/users/:id/enrollments` — trả list khóa học user đang học + progress
**FE**: `admin/users.jsx` — thêm modal/drawer "Xem khóa học" khi click vào user

---

## Acceptance Criteria

Sau khi hoàn thành Bước 1–4, verify các case sau:

| Case | Hành vi đúng |
|---|---|
| User B truy cập `/learn/5/23` (course của User A) | Backend 403 → FE redirect về course detail + toast |
| User A mua khóa X, vào `/learn`, xem bài học | 200 OK, video load |
| User A thêm khóa X đã mua vào giỏ | Cart hiện badge "Đã sở hữu", disable Checkout |
| User mua khóa free (price=0) | Button "Đăng ký miễn phí", không qua VNPay |
| Guest gõ `/learn/5/23` | `RequireAuth` redirect về `/login` trước khi tới LessonPlayer |
| User A mua lại khóa đã có qua API trực tiếp | Backend 400 "Bạn đã đăng ký rồi" |

---

## Ghi chú kỹ thuật

- `enrollments` table có `UNIQUE(user_id, course_id)` → DB-level guarantee, không thể có duplicate dù race condition
- `INSERT IGNORE INTO enrollments` trong `orderController.js:193` là idempotent — safe nếu `verifyPayment` được gọi 2 lần
- Không cần thêm bảng mới; schema hiện tại đủ để implement tất cả các bước trên
