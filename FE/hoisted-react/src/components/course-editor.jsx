import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Edit2, Trash2, X, ChevronDown, ChevronUp,
  GripVertical, ImageIcon, Link2, Upload, ListChecks, Code2, Loader2,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExerciseEditorModal } from '@/components/exercise/exercise-editor-modal.jsx';
import { AiQuizGenerator } from '@/components/ai/ai-quiz-generator.jsx';
import { LessonContentEditor } from '@/components/ai/lesson-content-editor.jsx';

/*
 * Bộ soạn khóa học dùng chung cho Admin (/api/admin) và Giảng viên (/api/instructor).
 * Hai khu vực có cùng cấu trúc đường dẫn API nên component chỉ cần `apiBase`.
 */

/* ── Config ─────────────────────────────────────────────────────── */
export const THUMB_COLORS = {
  yellow: '#F7DF1E', indigo: '#6366F1', rose: '#F43F5E',
  green:  '#10B981', violet: '#8B5CF6', sky:  '#06B6D4',
};
export const LEVELS       = ['BEGINNER','INTERMEDIATE','ADVANCED'];
export const STATUSES     = ['DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','ARCHIVED'];
export const LEVEL_LABELS = { BEGINNER: 'Cơ bản', INTERMEDIATE: 'Trung cấp', ADVANCED: 'Nâng cao' };

const courseSchema = z.object({
  title:            z.string().min(3, 'Tối thiểu 3 ký tự'),
  slug:             z.string().min(3).regex(/^[a-z0-9-]+$/, 'Chỉ chữ thường, số, dấu gạch ngang'),
  shortDescription: z.string().optional(),
  price:            z.coerce.number().min(0),
  originalPrice:    z.coerce.number().min(0).optional(),
  level:            z.enum(['BEGINNER','INTERMEDIATE','ADVANCED']),
  categoryId:       z.coerce.number().min(1, 'Chọn danh mục'),
  instructorName:   z.string().optional(),
  glyph:            z.string().optional(),
  thumb:            z.string().optional(),
  tag:              z.string().optional(),
  status:           z.enum(['DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED','ARCHIVED']).optional(),
  thumbnailUrl:     z.string().optional(),
});

/* ── Course thumb badge ─────────────────────────────────────────── */
export function CourseBadge({ glyph, thumb, tag }) {
  const bg = THUMB_COLORS[thumb] ?? THUMB_COLORS.yellow;
  return (
    <div className="relative shrink-0">
      <div className="w-12 h-12 rounded-lg grid place-items-center font-mono font-bold text-[14px] text-bg select-none"
        style={{ background: bg }}>
        {glyph || 'JS'}
      </div>
      {tag && (
        <span className="absolute -top-1.5 -right-1.5 font-mono text-[8px] font-bold px-1 py-0.5 rounded bg-danger text-white uppercase">
          {tag}
        </span>
      )}
    </div>
  );
}

/* ── Curriculum panel ───────────────────────────────────────────── */
export function CurriculumPanel({ apiBase, courseId, courseTitle }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen]       = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [quizLesson, setQuizLesson] = useState(null);
  const [exerciseLesson, setExerciseLesson] = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const dragSrc = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['course-lessons', apiBase, courseId],
    queryFn: () => api.get(`${apiBase}/courses/${courseId}/lessons`).then(r => r.data),
    staleTime: 30_000,
  });
  const lessons  = data?.lessons  ?? [];
  const sections = data?.sections ?? [];

  const grouped = sections.length
    ? sections.map(s => ({ ...s, items: lessons.filter(l => l.section_id === s.id) }))
    : [{ id: null, title: null, items: lessons }];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${apiBase}/lessons/${id}`),
    onSuccess: () => { toast.success('Đã xóa bài học'); qc.invalidateQueries({ queryKey: ['course-lessons', apiBase, courseId] }); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa xóa được bài học. Thử lại sau giây lát.')),
  });

  const reorderMutation = useMutation({
    mutationFn: (items) => api.put(`${apiBase}/lessons/reorder`, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-lessons', apiBase, courseId] }),
    onError: (err) => toast.error(apiMessage(err, 'Chưa lưu được thứ tự bài học. Tải lại trang để xem thứ tự hiện tại.')),
  });

  const moveLesson = (lesson, dir) => {
    const idx = lessons.findIndex(l => l.id === lesson.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= lessons.length) return;
    reorderMutation.mutate([
      { id: lesson.id,           order_index: lessons[swapIdx].order_index },
      { id: lessons[swapIdx].id, order_index: lesson.order_index },
    ]);
  };

  const handleDrop = (sectionItems, srcIdx, dstIdx) => {
    setDragOver(null);
    dragSrc.current = null;
    if (srcIdx === dstIdx) return;
    const newOrder = [...sectionItems];
    const [moved] = newOrder.splice(srcIdx, 1);
    newOrder.splice(dstIdx, 0, moved);
    const sortedIndices = [...sectionItems].map(l => l.order_index).sort((a, b) => a - b);
    const updates = newOrder.map((l, i) => ({ id: l.id, order_index: sortedIndices[i] }));
    reorderMutation.mutate(updates);
  };

  return (
    <div className="mt-4">
      {/* Curriculum header */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
          // Curriculum · {courseTitle}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddOpen(v => !v)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-accent hover:underline">
            <Plus className="w-3 h-3" /> Bài học
          </button>
        </div>
      </div>

      {/* Add lesson form */}
      {addOpen && (
        <LessonForm
          apiBase={apiBase} courseId={courseId} sections={sections}
          onCancel={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['course-lessons', apiBase, courseId] }); }}
        />
      )}

      {/* Edit lesson form */}
      {editLesson && (
        <LessonForm
          apiBase={apiBase} courseId={courseId} sections={sections} initial={editLesson}
          onCancel={() => setEditLesson(null)}
          onSaved={() => { setEditLesson(null); qc.invalidateQueries({ queryKey: ['course-lessons', apiBase, courseId] }); }}
        />
      )}

      {isLoading && <p className="font-mono text-[12px] text-ink-3 py-2">Đang tải...</p>}

      {/* Sections */}
      <div className="border border-line rounded-lg overflow-hidden bg-bg">
        {grouped.map((section) => (
          <div key={section.id ?? 'root'}>
            {section.title && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-2 border-b border-line">
                <GripVertical className="w-3.5 h-3.5 text-ink-3" />
                <span className="font-mono text-[12px] font-semibold text-ink">{section.title}</span>
                <span className="font-mono text-[10px] text-ink-3 ml-auto">{section.items.length} bài</span>
              </div>
            )}
            {section.items.map((l, idx) => (
              <div key={l.id}
                draggable
                onDragStart={() => { dragSrc.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(section.items, dragSrc.current, idx)}
                onDragEnd={() => { setDragOver(null); dragSrc.current = null; }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0 transition-colors group',
                  dragOver === idx ? 'bg-accent/10 border-accent/30' : 'hover:bg-bg-2',
                )}>
                <GripVertical className="w-3.5 h-3.5 text-ink-3 cursor-grab active:cursor-grabbing shrink-0" />
                <span className="font-mono text-[10px] text-ink-3 w-5 shrink-0">
                  {String(l.order_index).padStart(2, '0')}
                </span>
                <span className={cn('flex-1 text-[13px] truncate', l.is_preview ? 'text-accent' : 'text-ink')}>
                  {l.title}
                </span>
                {!!l.is_preview && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent uppercase shrink-0">
                    Preview
                  </span>
                )}
                {l.video_key && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-success/10 text-success uppercase shrink-0" title="Video lưu trên storage">
                    Video
                  </span>
                )}
                {l.attachment_key && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-indigo/10 text-indigo uppercase shrink-0" title={l.attachment_name ?? 'PDF'}>
                    PDF
                  </span>
                )}
                <span className="font-mono text-[10px] text-ink-3 shrink-0">{l.duration_minutes}m</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveLesson(l, -1)} disabled={idx === 0} title="Lên trên" aria-label="Chuyển bài học lên trên"
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 disabled:opacity-30 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveLesson(l, 1)} disabled={idx === section.items.length - 1} title="Xuống dưới" aria-label="Chuyển bài học xuống dưới"
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 disabled:opacity-30 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditLesson(l)} title="Sửa bài học" aria-label="Sửa bài học"
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setQuizLesson(l)} title="Quiz của bài học" aria-label={`Quiz của bài "${l.title}"`}
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 hover:text-accent transition-colors">
                    <ListChecks className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExerciseLesson(l)} title="Bài tập lập trình" aria-label={`Bài tập lập trình của bài "${l.title}"`}
                    className="p-1 rounded hover:bg-bg-3 text-ink-3 hover:text-accent transition-colors">
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Xóa bài học "${l.title}"?

Video, tài liệu, quiz, bài tập, thảo luận và tiến độ của học viên trong bài này sẽ bị xóa vĩnh viễn. Không xóa được nếu quiz của bài đã có học viên làm.`)) deleteMutation.mutate(l.id); }}
                    title="Xóa bài học" aria-label={`Xóa bài học "${l.title}"`}
                    className="p-1 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {section.items.length === 0 && (
              <p className="px-4 py-3 font-mono text-[11px] text-ink-3">// Chưa có bài học trong section này</p>
            )}
          </div>
        ))}

        {!isLoading && lessons.length === 0 && !grouped[0]?.title && (
          <p className="px-4 py-4 font-mono text-[12px] text-ink-3">// Chưa có bài học</p>
        )}
      </div>

      {exerciseLesson && (
        <ExerciseEditorModal apiBase={apiBase} lesson={exerciseLesson} onClose={() => setExerciseLesson(null)} />
      )}

      {quizLesson && (
        <QuizEditorModal
          apiBase={apiBase}
          lesson={quizLesson}
          onClose={() => setQuizLesson(null)}
        />
      )}
    </div>
  );
}

/* ── Lesson inline form ─────────────────────────────────────────── */
function LessonForm({ apiBase, courseId, sections, initial, onCancel, onSaved }) {
  const [title,     setTitle]     = useState(initial?.title          ?? '');
  const [videoUrl,  setVideoUrl]  = useState(initial?.video_url      ?? '');
  const [duration,  setDuration]  = useState(initial?.duration_minutes ?? 0);
  const [sectionId, setSectionId] = useState(initial?.section_id     ?? '');
  const [isPreview, setIsPreview] = useState(!!initial?.is_preview);
  const [content,   setContent]   = useState(initial?.content        ?? '');
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('Nhập tên bài học trước khi lưu'); return; }
    setSaving(true);
    try {
      const payload = { title, videoUrl, durationMinutes: +duration, sectionId: sectionId || null, isPreview, content };
      if (initial) {
        await api.put(`${apiBase}/lessons/${initial.id}`, payload);
        toast.success('Đã cập nhật bài học');
      } else {
        await api.post(`${apiBase}/courses/${courseId}/lessons`, payload);
        toast.success('Đã thêm bài học');
      }
      onSaved();
    } catch (err) {
      toast.error(apiMessage(err, 'Chưa lưu được bài học. Nội dung vẫn còn trong form — thử lại.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="mb-3 px-4 py-3 bg-bg-2 border border-line rounded-lg">
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[180px]">
        <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Tên bài học *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className={inputCls()} placeholder="Tên bài học" />
      </div>
      <div className="w-[220px]">
        <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Video URL</label>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
          className={inputCls()} placeholder="https://youtu.be/..." />
      </div>
      <div className="w-[70px]">
        <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Phút</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
          className={inputCls()} />
      </div>
      {sections.length > 0 && (
        <div className="w-[140px]">
          <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Section</label>
          <select value={sectionId} onChange={e => setSectionId(e.target.value)} className={inputCls()}>
            <option value="">-- Không --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
      )}
      <label className="flex items-center gap-1.5 text-[12px] text-ink-2 cursor-pointer mb-0.5">
        <input type="checkbox" checked={isPreview} onChange={e => setIsPreview(e.target.checked)}
          className="accent-accent" /> Cho xem thử miễn phí
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? '...' : 'Lưu'}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
      </div>
    </div>

    <LessonContentEditor apiBase={apiBase} lesson={initial} value={content} onChange={setContent} />

    {initial ? (
      <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-line">
        <MediaField apiBase={apiBase} courseId={courseId} lesson={initial} kind="video" />
        <MediaField apiBase={apiBase} courseId={courseId} lesson={initial} kind="attachment" />
      </div>
    ) : (
      <p className="mt-2 font-mono text-[10.5px] text-ink-3">// Lưu bài học trước, sau đó mở "Sửa" để tải video / tài liệu PDF lên.</p>
    )}
    </div>
  );
}

/* ── Upload video / PDF lên object storage (presigned PUT) ──────── */
const MEDIA_CFG = {
  video: {
    label: 'Video bài giảng', accept: 'video/mp4,video/webm', maxMB: 1024,
    hint: 'MP4 / WebM — lưu private, tự mã hóa HLS AES-128 sau khi tải lên. Ưu tiên hơn Video URL.',
  },
  attachment: {
    label: 'Tài liệu PDF', accept: 'application/pdf', maxMB: 50,
    hint: 'PDF — chỉ học viên đã mua mở được.',
  },
};

function MediaField({ apiBase, courseId, lesson, kind }) {
  const qc  = useQueryClient();
  const cfg = MEDIA_CFG[kind];
  const inputRef = useRef(null);
  const [current, setCurrent]   = useState(kind === 'video' ? lesson.video_key : lesson.attachment_key);
  const [name, setName]         = useState(kind === 'video' ? null : lesson.attachment_name);
  const [progress, setProgress] = useState(null); // null = không upload; 0..100
  const busy = progress !== null;

  const refresh = () => qc.invalidateQueries({ queryKey: ['course-lessons', apiBase, courseId] });

  const upload = async (file) => {
    if (!file) return;
    if (file.size > cfg.maxMB * 1024 * 1024) { toast.error(`File quá lớn — ${cfg.label.toLowerCase()} tối đa ${cfg.maxMB} MB`); return; }
    setProgress(0);
    try {
      const { data: slot } = await api.post(`${apiBase}/lessons/${lesson.id}/uploads`, {
        kind, contentType: file.type, size: file.size,
      });
      // axios thuần: KHÔNG gửi Authorization — header lạ làm sai chữ ký presigned URL
      await axios.put(slot.uploadUrl, file, {
        headers: slot.headers,
        onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      await api.put(`${apiBase}/lessons/${lesson.id}/media`, { kind, key: slot.key, filename: file.name });
      setCurrent(slot.key);
      setName(file.name);
      toast.success(`Đã tải lên ${cfg.label.toLowerCase()}`);
      refresh();
    } catch (err) {
      toast.error(apiMessage(err, `Chưa tải lên được ${cfg.label.toLowerCase()}. Kiểm tra kết nối rồi chọn lại file.`));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!window.confirm(`Gỡ ${cfg.label.toLowerCase()} khỏi bài học?`)) return;
    try {
      await api.delete(`${apiBase}/lessons/${lesson.id}/media/${kind}`);
      setCurrent(null); setName(null);
      toast.success(`Đã gỡ ${cfg.label.toLowerCase()}`);
      refresh();
    } catch (err) { toast.error(apiMessage(err, `Chưa gỡ được ${cfg.label.toLowerCase()}. Thử lại sau giây lát.`)); }
  };

  return (
    <div className="p-3 rounded-lg border border-line bg-bg">
      <p className="font-mono text-[9px] text-ink-3 uppercase tracking-widest mb-1.5">{cfg.label}</p>
      {current ? (
        <p className="text-[12px] text-success truncate mb-2" title={name ?? current}>
          ✓ {name ?? current.split('/').pop()}
        </p>
      ) : (
        <p className="text-[12px] text-ink-3 mb-2">Chưa có file</p>
      )}

      {busy ? (
        <div>
          <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="font-mono text-[10px] text-ink-3 mt-1">Đang tải lên… {progress}%</p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept={cfg.accept} className="hidden"
            onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent text-accent text-[11px] font-medium hover:bg-accent/10">
            <Upload className="w-3 h-3" /> {current ? 'Thay file' : 'Chọn file'}
          </button>
          {current && (
            <button type="button" onClick={remove}
              className="px-2.5 py-1 rounded-md text-[11px] text-ink-3 hover:text-danger hover:bg-danger/10">
              Gỡ
            </button>
          )}
        </div>
      )}
      {kind === 'video' && current && !busy && (
        <HlsStatus apiBase={apiBase} courseId={courseId} lessonId={lesson.id} />
      )}
      <p className="font-mono text-[9.5px] text-ink-3 mt-2 leading-snug">{cfg.hint}</p>
    </div>
  );
}

const HLS_LABEL = {
  PROCESSING: { text: 'Đang mã hóa HLS… (học viên tạm xem bản MP4)', cls: 'text-ink-3' },
  READY:      { text: '🔒 Đã mã hóa HLS AES-128', cls: 'text-success' },
  FAILED:     { text: 'Mã hóa HLS lỗi — học viên xem bản MP4', cls: 'text-danger' },
  NONE:       { text: 'Chưa mã hóa HLS', cls: 'text-ink-3' },
};

/** Trạng thái mã hóa video — dùng chung cache danh sách bài học, tự hỏi lại mỗi 4 s khi đang xử lý. */
function HlsStatus({ apiBase, courseId, lessonId }) {
  const qc = useQueryClient();
  const queryKey = ['course-lessons', apiBase, courseId];
  const { data } = useQuery({
    queryKey,
    queryFn: () => api.get(`${apiBase}/courses/${courseId}/lessons`).then(r => r.data),
    refetchInterval: (q) => (q.state.data?.lessons?.find(l => l.id === lessonId)?.hls_status === 'PROCESSING' ? 4000 : false),
  });
  const row = data?.lessons?.find(l => l.id === lessonId);
  const status = row?.hls_status ?? 'NONE';
  const label = HLS_LABEL[status] ?? HLS_LABEL.NONE;

  const retry = async () => {
    try {
      await api.post(`${apiBase}/lessons/${lessonId}/hls`);
      qc.invalidateQueries({ queryKey });
    } catch (err) { toast.error(apiMessage(err, 'Chưa khởi động lại được việc mã hóa video. Thử lại sau giây lát.')); }
  };

  return (
    <div className="mt-2 flex items-center gap-2 font-mono text-[10.5px]">
      {status === 'PROCESSING' && <Loader2 className="w-3 h-3 animate-spin text-ink-3" />}
      <span className={label.cls} title={status === 'FAILED' ? row?.hls_error ?? '' : undefined}>{label.text}</span>
      {(status === 'FAILED' || status === 'NONE') && (
        <button type="button" onClick={retry} className="text-accent hover:underline">Mã hóa lại</button>
      )}
    </div>
  );
}

/* ── Course form modal ──────────────────────────────────────────── */
const THUMB_MODES = [
  { key: 'default', label: 'Mặc định', icon: ImageIcon },
  { key: 'url',     label: 'Link URL',  icon: Link2    },
  { key: 'upload',  label: 'Tải lên',  icon: Upload   },
];

/**
 * variant='instructor': ẩn trường do admin quyết định (trạng thái, giảng viên, tag);
 * khóa học đã xuất bản thì khóa tên / slug / giá / danh mục (BE cũng chặn).
 */
export function CourseModal({ apiBase, variant = 'admin', mode, initial, categories, onClose, onSaved }) {
  const isAdmin = variant === 'admin';
  const locked  = !isAdmin && initial?.status === 'PUBLISHED';
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: mode === 'edit' && initial ? {
      title: initial.title, slug: initial.slug,
      shortDescription: initial.short_description ?? '',
      price: initial.price, originalPrice: initial.original_price ?? 0,
      level: initial.level, categoryId: initial.categoryId ?? initial.category_id,
      instructorName: initial.instructor_name ?? '',
      glyph: initial.glyph ?? '', thumb: initial.thumb ?? 'yellow',
      tag: initial.tag ?? '', status: initial.status,
      thumbnailUrl: initial.thumbnail_url ?? '',
    } : { level: 'BEGINNER', status: 'DRAFT', thumb: 'yellow', price: 0, thumbnailUrl: '' },
  });

  // Determine initial thumb mode when editing
  const initMode = mode === 'edit' && initial?.thumbnail_url
    ? (initial.thumbnail_url.startsWith('blob:') ? 'upload' : 'url')
    : 'default';
  const [thumbMode,    setThumbMode]    = useState(initMode);
  const [uploadPreview, setUploadPreview] = useState(initial?.thumbnail_url ?? null);
  const [uploading,    setUploading]    = useState(false);
  const fileInputRef = useRef(null);

  const autoSlug = (t) =>
    t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');

  const handleThumbModeChange = (next) => {
    setThumbMode(next);
    if (next === 'default') {
      setValue('thumbnailUrl', '');
      setUploadPreview(null);
    }
    if (next === 'url') {
      setUploadPreview(null);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setUploadPreview(localUrl);
    setValue('thumbnailUrl', ''); // clear until upload completes

    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post(`${apiBase}/upload/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('thumbnailUrl', data.url);
      setUploadPreview(data.url);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      toast.error(apiMessage(err, 'Chưa tải ảnh bìa lên được. Thử lại hoặc dán link ảnh.'));
      setUploadPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values) => {
    if (thumbMode === 'upload' && uploading) {
      toast.error('Ảnh bìa đang tải lên — đợi xong rồi lưu lại.');
      return;
    }
    // Clear thumbnailUrl when using default glyph/color mode
    const payload = {
      ...values,
      thumbnailUrl: thumbMode === 'default' ? null : (values.thumbnailUrl || null),
    };
    try {
      if (mode === 'create') {
        await api.post(`${apiBase}/courses`, payload);
        toast.success('Đã tạo khóa học');
      } else {
        await api.put(`${apiBase}/courses/${initial.id}`, payload);
        toast.success('Đã cập nhật khóa học');
      }
      onSaved();
    } catch (err) {
      toast.error(apiMessage(err, 'Chưa lưu được khóa học. Thử lại sau giây lát.'));
    }
  };

  const thumbVal     = watch('thumb') ?? 'yellow';
  const glyphVal     = watch('glyph') ?? '';
  const thumbUrlVal  = watch('thumbnailUrl') ?? '';
  const previewImg   = thumbMode === 'upload' ? uploadPreview : (thumbMode === 'url' ? thumbUrlVal : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,15,25,0.8)' }}>
      <div className="w-full max-w-[660px] bg-bg border border-line rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line sticky top-0 bg-bg z-10">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
            {mode === 'create' ? '// Tạo khóa học mới' : '// Chỉnh sửa khóa học'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5">
          {/* ── Thumbnail section ── */}
          <div className="mb-6 p-4 bg-bg-2 rounded-xl">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-3">Thumbnail</p>

            {/* Mode tabs */}
            <div className="flex gap-1 mb-4">
              {THUMB_MODES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key} type="button"
                  onClick={() => handleThumbModeChange(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    thumbMode === key
                      ? 'bg-accent text-bg'
                      : 'bg-bg border border-line text-ink-2 hover:bg-bg-3',
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Preview + controls */}
            <div className="flex items-start gap-4">
              {/* Preview box */}
              <div className="shrink-0 w-[120px]">
                {previewImg ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-bg-3 border border-line">
                    <img src={previewImg} className="w-full h-full object-cover" alt="preview" />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg grid place-items-center font-mono font-bold text-[18px] text-bg"
                    style={{ background: THUMB_COLORS[thumbVal] ?? THUMB_COLORS.yellow }}>
                    {glyphVal || 'JS'}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1">
                {thumbMode === 'default' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Glyph (vd: JS, Rx, TS)">
                      <input {...register('glyph')} className={inputCls()} placeholder="JS" />
                    </Field>
                    <Field label="Màu nền">
                      <select {...register('thumb')} className={inputCls()}>
                        {Object.keys(THUMB_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                )}

                {thumbMode === 'url' && (
                  <Field label="Đường dẫn ảnh (https://...)">
                    <input
                      {...register('thumbnailUrl')}
                      className={inputCls()}
                      placeholder="https://example.com/image.jpg"
                    />
                  </Field>
                )}

                {thumbMode === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors',
                        uploading
                          ? 'border-line text-ink-3 cursor-wait'
                          : 'border-accent text-accent hover:bg-accent/10',
                      )}>
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Đang upload...' : uploadPreview ? 'Chọn ảnh khác' : 'Chọn ảnh từ thiết bị'}
                    </button>
                    <p className="font-mono text-[10px] text-ink-3 mt-2">JPG, PNG, WebP — tối đa 5 MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {locked && (
              <p className="col-span-2 font-mono text-[11px] text-js bg-js/10 rounded-lg px-3 py-2">
                Khóa học đã xuất bản — không thể đổi tên, slug, giá, danh mục. Liên hệ quản trị viên nếu cần.
              </p>
            )}

            <Field label="Tên khóa học *" error={errors.title?.message} className="col-span-2">
              <input {...register('title', {
                onChange: e => { if (mode === 'create') setValue('slug', autoSlug(e.target.value)); }
              })} readOnly={locked} className={cn(inputCls(errors.title), locked && LOCKED_CLS)} placeholder="JavaScript: The Hard Parts" />
            </Field>

            <Field label="Slug *" error={errors.slug?.message}>
              <input {...register('slug')} readOnly={locked} className={cn(inputCls(errors.slug), locked && LOCKED_CLS)} placeholder="javascript-the-hard-parts" />
            </Field>

            {isAdmin && (
              <Field label="Tag">
                <input {...register('tag')} className={inputCls()} placeholder="vd: Mới cập nhật" />
              </Field>
            )}

            <Field label="Giá (VND) *" error={errors.price?.message}>
              <input type="number" {...register('price')} readOnly={locked} className={cn(inputCls(errors.price), locked && LOCKED_CLS)} />
            </Field>

            <Field label="Giá gốc (VND)">
              <input type="number" {...register('originalPrice')} readOnly={locked} className={cn(inputCls(), locked && LOCKED_CLS)} />
            </Field>

            <Field label="Danh mục *" error={errors.categoryId?.message}>
              {/* select bị disabled sẽ mất giá trị khi submit → chỉ chặn tương tác */}
              <select {...register('categoryId')} tabIndex={locked ? -1 : undefined} aria-disabled={locked}
                className={cn(inputCls(errors.categoryId), locked && cn(LOCKED_CLS, 'pointer-events-none'))}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Cấp độ *" error={errors.level?.message}>
              <select {...register('level')} className={inputCls(errors.level)}>
                {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </Field>

            {isAdmin && (
              <>
                <Field label="Giảng viên">
                  <input {...register('instructorName')} className={inputCls()} placeholder="Tên giảng viên" />
                </Field>

                <Field label="Trạng thái *" error={errors.status?.message}>
                  <select {...register('status')} className={inputCls(errors.status)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </>
            )}

            <Field label="Mô tả ngắn" className="col-span-2">
              <textarea {...register('shortDescription')} rows={2} className={cn(inputCls(), 'resize-none')}
                placeholder="Một câu nói rõ học xong khóa này làm được gì…" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-line">
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo khóa học' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
const LOCKED_CLS = 'opacity-60 cursor-not-allowed';

export const inputCls = (err) => cn(
  'w-full px-3 py-2 text-[13px] bg-bg border rounded-lg text-ink placeholder:text-ink-3 focus:outline-none transition-colors',
  err ? 'border-danger focus:border-danger' : 'border-line focus:border-accent',
);

export function Field({ label, error, children, className }) {
  return (
    <div className={className}>
      <label className="block font-mono text-[10px] text-ink-3 mb-1.5 uppercase tracking-widest">{label}</label>
      {children}
      {error && <p className="mt-1 font-mono text-[11px] text-danger">{error}</p>}
    </div>
  );
}

/* ── Quiz Editor Modal ──────────────────────────────────────────── */
const EMPTY_QUESTION = () => ({
  question: '', type: 'single',
  options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
});

export function QuizEditorModal({ apiBase, lesson, onClose }) {
  const qc = useQueryClient();
  const queryKey = ['course-quiz', apiBase, lesson.id];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get(`${apiBase}/lessons/${lesson.id}/quiz`).then(r => r.data),
  });

  const quiz = data?.quiz ?? null;

  // Settings form state
  const [title,     setTitle]     = useState('');
  const [passScore, setPassScore] = useState(70);
  const [savingSettings, setSavingSettings] = useState(false);

  // Question form state — null means closed
  const [qForm, setQForm] = useState(null);

  useEffect(() => {
    if (quiz) { setTitle(quiz.title ?? ''); setPassScore(quiz.passScore ?? 70); }
  }, [quiz]);

  const refresh = () => qc.invalidateQueries({ queryKey });

  /* Create quiz */
  const handleCreate = async () => {
    setSavingSettings(true);
    try {
      await api.post(`${apiBase}/lessons/${lesson.id}/quiz`, { title, passScore });
      toast.success('Đã tạo quiz');
      refresh();
    } catch (err) { toast.error(apiMessage(err, 'Chưa tạo được quiz. Thử lại sau giây lát.')); }
    finally { setSavingSettings(false); }
  };

  /* Update quiz settings */
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put(`${apiBase}/quizzes/${quiz.id}`, { title, passScore });
      toast.success('Đã lưu cài đặt quiz');
      refresh();
    } catch (err) { toast.error(apiMessage(err, 'Chưa lưu được cài đặt quiz. Thử lại sau giây lát.')); }
    finally { setSavingSettings(false); }
  };

  /* Delete quiz */
  const handleDeleteQuiz = async () => {
    if (!window.confirm('Xóa quiz này cùng toàn bộ câu hỏi? Không thể hoàn tác. Quiz đã có học viên làm thì không xóa được.')) return;
    try {
      await api.delete(`${apiBase}/quizzes/${quiz.id}`);
      toast.success('Đã xóa quiz');
      refresh();
    } catch (err) { toast.error(apiMessage(err, 'Chưa xóa được quiz. Thử lại sau giây lát.')); }
  };

  /* Save question (add or update) */
  const handleSaveQuestion = async () => {
    const { id, question, type, options } = qForm;
    if (!question.trim()) { toast.error('Nhập nội dung câu hỏi'); return; }
    if (options.length < 2) { toast.error('Câu hỏi cần ít nhất 2 đáp án'); return; }
    if (!options.some(o => o.isCorrect)) { toast.error('Đánh dấu ít nhất 1 đáp án đúng'); return; }
    if (options.some(o => !o.text.trim())) { toast.error('Điền nội dung cho mọi đáp án, hoặc xóa đáp án trống'); return; }
    try {
      if (id) {
        await api.put(`${apiBase}/quiz-questions/${id}`, { question, type, options });
        toast.success('Đã cập nhật câu hỏi');
      } else {
        await api.post(`${apiBase}/quizzes/${quiz.id}/questions`, { question, type, options });
        toast.success('Đã thêm câu hỏi');
      }
      setQForm(null);
      refresh();
    } catch (err) { toast.error(apiMessage(err, 'Chưa lưu được câu hỏi. Nội dung vẫn còn trong form — thử lại.')); }
  };

  /* Delete question */
  const handleDeleteQuestion = async (qId, qText) => {
    if (!window.confirm(`Xóa câu hỏi "${qText}"?`)) return;
    try {
      await api.delete(`${apiBase}/quiz-questions/${qId}`);
      toast.success('Đã xóa câu hỏi');
      refresh();
    } catch (err) { toast.error(apiMessage(err, 'Chưa xóa được câu hỏi. Thử lại sau giây lát.')); }
  };

  /* Option helpers */
  const setOptionText = (i, v) =>
    setQForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, text: v } : o) }));

  const setOptionCorrect = (i) =>
    setQForm(f => ({
      ...f,
      options: f.options.map((o, idx) =>
        f.type === 'single'
          ? { ...o, isCorrect: idx === i }
          : idx === i ? { ...o, isCorrect: !o.isCorrect } : o,
      ),
    }));

  const addOption = () =>
    setQForm(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }));

  const removeOption = (i) =>
    setQForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-bg border border-line rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
          <div>
            <p className="font-mono text-[9px] text-ink-3 uppercase tracking-widest mb-0.5">Quiz</p>
            <p className="font-semibold text-[14px] text-ink truncate max-w-[480px]">{lesson.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {isLoading && <p className="font-mono text-[12px] text-ink-3">Đang tải...</p>}

          {!isLoading && (
            <AiQuizGenerator apiBase={apiBase} lesson={lesson} quizId={quiz?.id ?? null} onAdded={refresh} />
          )}

          {!isLoading && !quiz && (
            /* ── Create quiz ── */
            <div className="space-y-3">
              <p className="font-mono text-[11px] text-ink-3">// Bài học này chưa có quiz</p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Tiêu đề (tuỳ chọn)</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="VD: Kiểm tra cuối bài" className={inputCls()} />
                </div>
                <div className="w-28">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Điểm đạt %</label>
                  <input type="number" min="1" max="100" value={passScore}
                    onChange={e => setPassScore(+e.target.value)} className={inputCls()} />
                </div>
                <Button size="sm" onClick={handleCreate} disabled={savingSettings}>Tạo quiz</Button>
              </div>
            </div>
          )}

          {!isLoading && quiz && (
            <>
              {/* ── Settings ── */}
              <div className="flex gap-3 items-end p-3 bg-bg-2 rounded-lg border border-line">
                <div className="flex-1">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Tiêu đề</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls()} />
                </div>
                <div className="w-24">
                  <label className="block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest">Điểm đạt %</label>
                  <input type="number" min="1" max="100" value={passScore}
                    onChange={e => setPassScore(+e.target.value)} className={inputCls()} />
                </div>
                <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>Lưu</Button>
                <button onClick={handleDeleteQuiz}
                  className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors" title="Xóa quiz">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* ── Questions list ── */}
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
                  // {quiz.questions.length} câu hỏi
                </p>

                {quiz.questions.map((q, qi) => (
                  <div key={q.id} className="border border-line rounded-lg p-3 bg-bg">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-ink flex-1">
                        <span className="font-mono text-ink-3 mr-1.5">{qi + 1}.</span>
                        {q.question}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => setQForm({ id: q.id, question: q.question, type: q.type, options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) })}
                          className="p-1 rounded hover:bg-bg-2 text-ink-3 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteQuestion(q.id, q.question)}
                          className="p-1 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {q.options.map(o => (
                        <div key={o.id} className={cn(
                          'flex items-center gap-2 text-[12px] px-2 py-1 rounded',
                          o.isCorrect ? 'text-success bg-success/10' : 'text-ink-3',
                        )}>
                          <span>{o.isCorrect ? '✓' : '○'}</span>
                          <span>{o.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* ── Add question button ── */}
                {!qForm && (
                  <button
                    onClick={() => setQForm(EMPTY_QUESTION())}
                    className="w-full py-2.5 border border-dashed border-line rounded-lg font-mono text-[11px] text-ink-3 hover:border-accent hover:text-accent transition-colors">
                    + Thêm câu hỏi
                  </button>
                )}
              </div>

              {/* ── Question form ── */}
              {qForm && (
                <div className="border border-accent/40 rounded-lg p-4 space-y-3 bg-bg">
                  <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
                    // {qForm.id ? 'Sửa câu hỏi' : 'Câu hỏi mới'}
                  </p>

                  <textarea value={qForm.question} onChange={e => setQForm(f => ({ ...f, question: e.target.value }))}
                    rows={2} placeholder="Nhập câu hỏi…"
                    className={cn(inputCls(), 'resize-none w-full')} />

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-ink-3 uppercase tracking-widest">Loại:</span>
                    {['single', 'multiple'].map(t => (
                      <label key={t} className="flex items-center gap-1.5 text-[12px] text-ink-2 cursor-pointer">
                        <input type="radio" name="qtype" checked={qForm.type === t}
                          onChange={() => setQForm(f => ({ ...f, type: t, options: f.options.map(o => ({ ...o, isCorrect: false })) }))}
                          className="accent-accent" />
                        {t === 'single' ? 'Một đáp án' : 'Nhiều đáp án'}
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {qForm.options.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type={qForm.type === 'single' ? 'radio' : 'checkbox'}
                          checked={o.isCorrect}
                          onChange={() => setOptionCorrect(i)}
                          className="accent-accent shrink-0"
                        />
                        <input value={o.text} onChange={e => setOptionText(i, e.target.value)}
                          placeholder={`Đáp án ${i + 1}`}
                          className={cn(inputCls(), 'flex-1')} />
                        {qForm.options.length > 2 && (
                          <button onClick={() => removeOption(i)}
                            className="p-1 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {qForm.options.length < 6 && (
                      <button onClick={addOption}
                        className="font-mono text-[11px] text-ink-3 hover:text-accent transition-colors">
                        + Thêm đáp án
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveQuestion}>Lưu câu hỏi</Button>
                    <Button size="sm" variant="ghost" onClick={() => setQForm(null)}>Hủy</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
