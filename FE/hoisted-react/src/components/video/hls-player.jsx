import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { api, BASE_URL } from '@/lib/api';

/*
 * Phát video HLS mã hóa AES-128 bằng hls.js (tải động — chỉ trang có video HLS mới tải thư viện, bản light).
 * - Playlist + khóa đi qua API của mình → gắn Authorization; đoạn .ts là presigned URL của storage
 *   → KHÔNG gắn header (sai chữ ký + không lộ token sang domain khác).
 * - Lỗi mạng nghiêm trọng (link đoạn hết hạn / token hết hạn) → refresh token nếu cần, tải lại playlist
 *   và phát tiếp tại chỗ cũ; tối đa 1 lần / 10 s, quá thì báo onError.
 * - Trình duyệt không hỗ trợ MSE → onUnsupported (trang cha báo không phát được; không còn MP4 dự phòng).
 * API ref: seekTo(seconds).
 */

// Thuộc tính chung của mọi trình phát: không nút tải về, không phát lên thiết bị khác, không picture-in-picture
const PROTECTED_VIDEO = {
  className: 'w-full h-full bg-black',
  controls: true,
  playsInline: true,
  controlsList: 'nodownload noremoteplayback',
  disablePictureInPicture: true,
  onContextMenu: (e) => e.preventDefault(),
};

/**
 * Phát file MP4 qua link presigned ngắn hạn — dùng khi video chưa mã hóa HLS xong và cho bài xem thử.
 * Link hết hạn giữa chừng → onError để trang cha xin link mới.
 */
export const Mp4Player = forwardRef(function Mp4Player(
  { src, autoPlay = false, onReady, onProgress, onEnded, onError }, ref,
) {
  const videoRef = useRef(null);
  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => { if (videoRef.current) videoRef.current.currentTime = seconds; },
  }), []);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={autoPlay}
      {...PROTECTED_VIDEO}
      onLoadedMetadata={onReady}
      onTimeUpdate={(e) => onProgress?.({ playedSeconds: e.currentTarget.currentTime })}
      onEnded={onEnded}
      onError={onError}
    />
  );
});
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
    // Số lần tự phục hồi liên tiếp chưa tải được đoạn video nào. Trước đây chặn theo thời gian (< 10 s),
    // nhưng mỗi vòng thử của hls.js dài hơn 10 s → storage chết thì thử lại mãi, màn hình đen không báo lỗi.
    let recoveries = 0;
    const MAX_RECOVERIES = 2;

    // Bản light (≈ 370 kB thay vì ≈ 600 kB): đủ HLS + giải mã AES-128; bỏ phụ đề, audio phụ, DRM/EME — Hoisted không dùng
    import('hls.js/light').then(({ default: Hls }) => {
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
        hls.on(Hls.Events.FRAG_LOADED, () => { recoveries = 0; });
        hls.on(Hls.Events.ERROR, async (_e, data) => {
          if (!data.fatal || cancelled) return;
          if (recoveries >= MAX_RECOVERIES) { callbacks.current.onError?.(data); return; }
          recoveries += 1;
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
      {...PROTECTED_VIDEO}
      onLoadedMetadata={onReady}
      onTimeUpdate={(e) => onProgress?.({ playedSeconds: e.currentTarget.currentTime })}
      onEnded={onEnded}
    />
  );
});
