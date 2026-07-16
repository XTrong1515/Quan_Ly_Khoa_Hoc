import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Edit2, Trash2, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ── Config ─────────────────────────────────────────────────────── */
const PRESET_COLORS = ['#F7DF1E', '#10B981', '#EF4444', '#6366F1', '#8B5CF6', '#F59E0B'];
const PRESET_GLYPHS = ['{}', 'C', 'Rx', 'TS', 'Nx', '✓', '⚙', '⌘'];

function useCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/api/admin/categories').then(r => r.data),
    staleTime: 30_000,
  });
}

const EMPTY_FORM = { name: '', slug: '', description: '', icon: '', color: '#6366F1', visible: true };

function autoSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

const inputCls = (err) => cn(
  'w-full px-3 py-2 text-[13px] bg-bg border rounded-lg text-ink placeholder:text-ink-3 focus:outline-none transition-colors',
  err ? 'border-danger' : 'border-line focus:border-accent',
);

/* ── Page ───────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null); // null | 'new' | id
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);

  const { data, isLoading } = useCategories();
  const categories  = data?.categories ?? [];
  const totalCourses = categories.reduce((s, c) => s + (c.courseCount ?? 0), 0);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/categories/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa danh mục');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      if (editingId !== 'new') closePanel();
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description ?? '', icon: cat.icon ?? '', color: cat.color ?? '#6366F1', visible: cat.visible !== false });
    setErrors({});
  };

  const openCreate = () => {
    setEditingId('new');
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const closePanel = () => { setEditingId(null); setForm(EMPTY_FORM); setErrors({}); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: typeof e === 'object' && 'target' in e ? e.target.value : e }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên là bắt buộc';
    if (!form.slug.trim()) e.slug = 'Slug là bắt buộc';
    if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Chỉ chữ thường, số, gạch ngang';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId === 'new') {
        await api.post('/api/admin/categories', form);
        toast.success('Đã tạo danh mục');
      } else {
        await api.put(`/api/admin/categories/${editingId}`, form);
        toast.success('Đã cập nhật danh mục');
      }
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      closePanel();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally { setSaving(false); }
  };

  return (
    <div className="p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/admin</span> <span className="text-ink-3">/ danh-mục</span></p>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[24px]">Quản lý danh mục</h1>
            {!isLoading && (
              <span className="font-mono text-[11px] text-ink-3">
                {categories.length} danh mục · {totalCourses} khóa
              </span>
            )}
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> Thêm danh mục
        </button>
      </div>

      {/* Two-panel layout */}
      <div className={cn('flex gap-6', editingId ? 'items-start' : '')}>
        {/* Left: drag list */}
        <div className={cn('min-w-0', editingId ? 'flex-1' : 'w-full')}>
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-3">
            // Drag để sắp xếp lại thứ tự hiển thị
          </p>

          {isLoading && (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="card h-16 animate-pulse bg-bg-3" />)}
            </div>
          )}

          {!isLoading && categories.length === 0 && (
            <div className="card py-16 text-center">
              <p className="font-mono text-ink-3 text-[13px]">// Chưa có danh mục nào</p>
            </div>
          )}

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id}
                className={cn(
                  'card flex items-center gap-3 px-4 py-3.5 transition-colors cursor-default',
                  editingId === cat.id ? 'border-accent/40 bg-accent/5' : 'hover:bg-bg-2',
                )}>
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-ink-3 shrink-0 cursor-grab active:cursor-grabbing" />

                {/* Icon */}
                <div className="w-10 h-10 rounded-lg grid place-items-center shrink-0 font-mono font-bold text-[15px] text-bg select-none"
                  style={{ background: cat.color || '#6366F1' }}>
                  {cat.icon || cat.name?.[0] || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[14px] text-ink">{cat.name}</p>
                    <span className="font-mono text-[10px] text-ink-3">/{cat.slug}</span>
                  </div>
                  {cat.description && (
                    <p className="font-mono text-[11px] text-ink-3 truncate mt-0.5">{cat.description}</p>
                  )}
                </div>

                {/* Course count */}
                <span className="font-mono text-[12px] text-ink-3 shrink-0">
                  {cat.courseCount ?? 0} khóa
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded hover:bg-bg-3 text-ink-3 transition-colors" title="Chỉnh sửa">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Xóa "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                    className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors" title="Xóa">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: edit panel */}
        {editingId && (
          <div className="w-[340px] shrink-0 card overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
                {editingId === 'new' ? '// Thêm mới' : '// Đang sửa'}
              </p>
              <button onClick={closePanel} className="p-1 rounded hover:bg-bg-2 text-ink-3 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingId !== 'new' && (
              <p className="px-5 pt-4 font-semibold text-[15px] text-ink">
                {categories.find(c => c.id === editingId)?.name}
              </p>
            )}

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">
                  Tên danh mục
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(f => ({
                    ...f,
                    name: e.target.value,
                    ...(editingId === 'new' ? { slug: autoSlug(e.target.value) } : {}),
                  }))}
                  className={inputCls(errors.name)}
                  placeholder="JavaScript Core"
                />
                {errors.name && <p className="mt-1 font-mono text-[11px] text-danger">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">
                  Slug (URL)
                </label>
                <input
                  value={form.slug}
                  onChange={set('slug')}
                  className={inputCls(errors.slug)}
                  placeholder="js-core"
                />
                {errors.slug && <p className="mt-1 font-mono text-[11px] text-danger">{errors.slug}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={3}
                  className={cn(inputCls(), 'resize-none')}
                  placeholder="Hoisting, execution context, closures, this binding."
                />
              </div>

              {/* Color swatches */}
              <div>
                <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">
                  Màu đại diện
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn(
                        'w-7 h-7 rounded-full transition-all',
                        form.color === c ? 'ring-2 ring-offset-2 ring-offset-bg ring-ink scale-110' : 'hover:scale-105',
                      )}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={set('color')}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                    title="Màu tùy chỉnh"
                  />
                </div>
              </div>

              {/* Glyph picker */}
              <div>
                <label className="block font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">
                  Glyph / Icon
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_GLYPHS.map(g => (
                    <button key={g} onClick={() => setForm(f => ({ ...f, icon: g }))}
                      className={cn(
                        'w-9 h-9 rounded-lg font-mono text-[13px] font-bold transition-colors border',
                        form.icon === g
                          ? 'bg-accent text-bg border-accent'
                          : 'bg-bg-2 text-ink border-line hover:border-ink-3',
                      )}>
                      {g}
                    </button>
                  ))}
                  <input
                    value={form.icon}
                    onChange={set('icon')}
                    className="w-16 px-2 py-2 text-[12px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                    placeholder="Tự nhập"
                  />
                </div>
              </div>

              {/* Visible toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[13px] text-ink font-medium">Hiển thị trên trang chủ</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, visible: !f.visible }))}
                  className={cn(
                    'relative w-10 h-5.5 rounded-full transition-colors',
                    form.visible ? 'bg-accent' : 'bg-bg-3',
                  )}
                  style={{ height: '22px' }}>
                  <span className={cn(
                    'absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform',
                    form.visible ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )} style={{ width: '18px', height: '18px' }} />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t border-line">
                <Button variant="ghost" onClick={closePanel} className="flex-1">Hủy</Button>
                <Button onClick={save} disabled={saving} className="flex-1">
                  {saving ? '...' : 'Lưu'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
