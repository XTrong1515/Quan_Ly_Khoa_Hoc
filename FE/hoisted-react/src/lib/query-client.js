import { QueryClient } from '@tanstack/react-query';

/**
 * networkMode 'always': mặc định ('online') TanStack Query TẠM DỪNG query khi trình duyệt báo mất mạng —
 * lúc đó isLoading và isError đều false, nên trang hiện "404 không tìm thấy" / "không có kết quả" giả.
 * Chạy luôn thì request lỗi mạng đi vào nhánh lỗi có nút "Thử lại" như mọi lỗi khác.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { networkMode: 'always' } },
});
