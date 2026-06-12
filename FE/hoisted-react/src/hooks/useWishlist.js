import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, apiMessage } from '@/lib/api';
import { useAuth } from '@/store/auth';

export function useWishlistIds() {
  const { role } = useAuth();
  return useQuery({
    queryKey: ['wishlist-ids'],
    queryFn: () => api.get('/api/wishlists/me/ids').then(r => r.data.courseIds ?? []),
    enabled: role !== 'guest',
    staleTime: 60_000,
  });
}

export function useWishlistToggle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, isWishlisted }) =>
      isWishlisted
        ? api.delete(`/api/wishlists/${courseId}`)
        : api.post('/api/wishlists', { courseId }),
    onMutate: async ({ courseId, isWishlisted }) => {
      await qc.cancelQueries({ queryKey: ['wishlist-ids'] });
      const prev = qc.getQueryData(['wishlist-ids']) ?? [];
      qc.setQueryData(['wishlist-ids'],
        isWishlisted ? prev.filter(id => id !== courseId) : [...prev, courseId],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['wishlist-ids'], ctx.prev);
      toast.error(apiMessage(_err, 'Không thể cập nhật wishlist'));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['wishlist-ids'] }),
    onSuccess: (_data, { isWishlisted }) => {
      toast.success(isWishlisted ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích');
    },
  });
}
