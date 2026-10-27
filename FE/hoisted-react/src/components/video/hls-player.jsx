import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { api, BASE_URL } from '@/lib/api';

/*
 * Phát video HLS mã hóa AES-128 bằng hls.js (tải động — chỉ trang có video HLS mới tải thư viện).
 * - Playlist + khóa đi qua API của mình → gắn Authorization; đoạn .ts là presigned URL của storage
 *   → KHÔNG gắn header (sai chữ ký + không lộ token sang domain khác).
 * - Lỗi mạng nghiêm trọng (link đoạn hết hạn / token hết hạn) → refresh token nếu cần, tải lại playlist
 *   và phát tiếp tại chỗ cũ; tối đa 1 lần / 10 s, quá thì báo onError.
 * - Trình duyệt không hỗ trợ MSE → onUnsupported (trang cha phát bản MP4 dự phòng).
 * API ref giống ReactPlayer phần đang dùng: seekTo(seconds).
 */
function currentToken() {
  try {
    return JSON.parse(localStorage.getItem('hoisted.auth') ?? '{}')?.state?.token ?? null;
  } catch {
    return null;
  }
}

export const HlsPlayer = forwardRef(function HlsPlayer(
  { src, onReady, onProgress, onEnded, onError, onUnsupported }, ref,
) {
  const videoRef = useRef(null);
  const callbacks = useRef({});
  useEffect(() => { callbacks.current = { onError, onUnsupported }; });

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => { if (videoRef.current) videoRef.current.currentTime = seconds; },
  }), []);

  useEffect(() => {
    let hls = null;
    let cancelled = false;
    let lastRecovery = 0;

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) { callbacks.current.onUnsupported?.(); return; }

      const create = (startPosition) => {
        hls = new Hls({
          startPosition,
          xhrSetup(xhr, url) {
            const token = currentToken();
            if (token && url.startsWith(`${BASE_URL}/`)) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          },
        });
        hls.on(Hls.Events.ERROR, async (_e, data) => {
          if (!data.fatal || cancelled) return;
          if (Date.now() - lastRecovery < 10_000) { callbacks.current.onError?.(data); return; }
          lastRecovery = Date.now();
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; }
          const at = videoRef.current?.currentTime ?? -1;
          if (data.response?.code === 401) await api.get('/api/auth/me').catch(() => {}); // interceptor refresh token
          if (cancelled) return;
          hls.destroy();
          create(at > 0 ? at : -1);
        });
        hls.loadSource(src);
        hls.attachMedia(videoRef.current);
      };
      create(-1);
    }).catch(() => { if (!cancelled) callbacks.current.onUnsupported?.(); });

    return () => { cancelled = true; hls?.destroy(); };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full bg-black"
      controls
      playsInline
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      onLoadedMetadata={onReady}
      onTimeUpdate={(e) => onProgress?.({ playedSeconds: e.currentTarget.currentTime })}
      onEnded={onEnded}
    />
  );
});
