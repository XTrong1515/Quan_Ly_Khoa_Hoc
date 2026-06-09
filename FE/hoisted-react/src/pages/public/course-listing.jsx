import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { CourseCard } from '@/components/course-card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const LEVELS   = ['Beginner', 'Intermediate', 'Advanced'];
const RATINGS  = [{ label: '≥ 4.5★', value: 4.5 }, { label: '≥ 4★', value: 4 }, { label: '≥ 3★', value: 3 }];
const SORT_OPS = [
  { value: 'newest',      label: 'Mới nhất' },
  { value: 'bestselling', label: 'Bán chạy nhất' },
  { value: 'rating',      label: 'Đánh giá cao' },
  { value: 'price_asc',   label: 'Giá thấp → cao' },
  { value: 'price_desc',  label: 'Giá cao → thấp' },
];

function useCourses(params) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: () => api.get('/api/courses', { params }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

function useCategories() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => api.get('/api/home').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.categories ?? [],
  });
}

export default function CourseListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search,    setSearch]    = useState(searchParams.get('search') ?? '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [category,  setCategory]  = useState(() => searchParams.getAll('category'));
  const [level,     setLevel]     = useState(() => searchParams.getAll('level'));
  const [minRating, setMinRating] = useState(searchParams.get('minRating') ?? '');
  const [sort,      setSort]      = useState(searchParams.get('sort') ?? 'newest');
  const [page,      setPage]      = useState(Number(searchParams.get('page') ?? 1));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const queryParams = {
    search, sort, page, limit: 12,
    ...(category.length ? { category: category.join(',') } : {}),
    ...(level.length    ? { level: level.join(',') }       : {}),
    ...(minRating       ? { minRating }                    : {}),
  };

  const { data, isLoading, isFetching } = useCourses(queryParams);
  const { data: categories = [] }       = useCategories();

  // Sync URL params
  useEffect(() => {
    const p = new URLSearchParams();
    if (search)    p.set('search', search);
    if (sort !== 'newest') p.set('sort', sort);
    if (page > 1)  p.set('page', String(page));
    category.forEach((c) => p.append('category', c));
    level.forEach((l) => p.append('level', l));
    if (minRating) p.set('minRating', minRating);
    setSearchParams(p, { replace: true });
  }, [search, sort, page, category, level, minRating]); // eslint-disable-line

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const toggleFilter = useCallback((setter) => (value) => {
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    setPage(1);
  }, []);

  const clearAll = () => {
    setCategory([]); setLevel([]); setMinRating(''); setSearch(''); setSearchInput(''); setPage(1);
  };

  const hasFilters = category.length || level.length || minRating || search;
  const courses    = data?.courses ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="px-8 py-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow mb-1">// khóa học</p>
          <h1 className="display text-[32px]">Tất cả khóa học</h1>
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="lg:hidden flex items-center gap-2 h-9 px-3 rounded-lg border border-line text-sm text-ink-2 hover:bg-bg-2">
          <SlidersHorizontal className="w-4 h-4" /> Bộ lọc
        </button>
      </div>

      <div className="flex gap-7">
        {/* Sidebar */}
        <aside className={cn(
          'w-[220px] shrink-0 hidden lg:block',
          sidebarOpen && '!block fixed inset-0 z-40 bg-bg p-6 overflow-y-auto',
        )}>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-ink-3 hover:text-ink lg:hidden">
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[12px] font-semibold text-ink-3 uppercase tracking-wide">Bộ lọc</span>
            {hasFilters && (
              <button onClick={clearAll} className="font-mono text-[11.5px] text-accent hover:underline">
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Category */}
          <FilterSection title="Danh mục">
            {categories.map((c) => (
              <FilterCheckbox
                key={c.slug} label={c.name}
                checked={category.includes(c.slug)}
                onChange={() => toggleFilter(setCategory)(c.slug)}
              />
            ))}
          </FilterSection>

          {/* Level */}
          <FilterSection title="Cấp độ">
            {LEVELS.map((l) => (
              <FilterCheckbox
                key={l} label={l}
                checked={level.includes(l)}
                onChange={() => toggleFilter(setLevel)(l)}
              />
            ))}
          </FilterSection>

          {/* Rating */}
          <FilterSection title="Đánh giá">
            {RATINGS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 py-1 cursor-pointer group">
                <input
                  type="radio" name="rating"
                  checked={minRating === String(r.value)}
                  onChange={() => { setMinRating(String(r.value)); setPage(1); }}
                  className="accent-accent"
                />
                <span className="text-[13px] text-ink-2 group-hover:text-ink">{r.label}</span>
              </label>
            ))}
            {minRating && (
              <button onClick={() => { setMinRating(''); setPage(1); }}
                className="text-[11.5px] text-accent font-mono mt-1">Bỏ chọn</button>
            )}
          </FilterSection>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex gap-3 mb-5">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-ink-3" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input pl-9 h-[38px] text-[13.5px] w-full"
                placeholder="Tìm khóa học, JS, React…"
              />
            </form>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="input h-[38px] text-[13px] pr-8 pl-3 cursor-pointer min-w-[160px]">
              {SORT_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Active filters */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {category.map((c) => (
                <ActiveChip key={c} label={categories.find((x) => x.slug === c)?.name ?? c}
                  onRemove={() => { setCategory((p) => p.filter((v) => v !== c)); setPage(1); }} />
              ))}
              {level.map((l) => (
                <ActiveChip key={l} label={l}
                  onRemove={() => { setLevel((p) => p.filter((v) => v !== l)); setPage(1); }} />
              ))}
              {minRating && (
                <ActiveChip label={`≥ ${minRating}★`} onRemove={() => { setMinRating(''); setPage(1); }} />
              )}
              {search && (
                <ActiveChip label={`"${search}"`} onRemove={() => { setSearch(''); setSearchInput(''); setPage(1); }} />
              )}
            </div>
          )}

          {/* Results info */}
          <p className="font-mono text-[12.5px] text-ink-3 mb-4">
            {isFetching && !isLoading ? '↻ ' : ''}{total} kết quả
          </p>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-3 animate-pulse">
                  <div className="aspect-video rounded-[10px] bg-bg-3 mb-3" />
                  <div className="px-1 pb-2 space-y-2">
                    <div className="h-3 bg-bg-3 rounded w-full" />
                    <div className="h-3 bg-bg-3 rounded w-2/3" />
                    <div className="h-2.5 bg-bg-3 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-mono text-ink-3 mb-3">// không tìm thấy kết quả</p>
              <p className="text-ink-2 mb-4">Thử thay đổi từ khóa hoặc bộ lọc.</p>
              <Button variant="ghost" onClick={clearAll}>Xóa bộ lọc</Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i + 1 : getPageNum(i, page, totalPages);
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn(
                      'w-8 h-8 rounded-lg border text-[13px] font-mono transition',
                      pg === page
                        ? 'border-accent bg-accent text-accent-ink font-bold'
                        : 'border-line text-ink-2 hover:bg-bg-2',
                    )}>
                    {pg}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[11.5px] font-semibold text-ink-3 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-accent" />
      <span className={cn('text-[13px] transition', checked ? 'text-ink' : 'text-ink-2 group-hover:text-ink')}>
        {label}
      </span>
    </label>
  );
}

function ActiveChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-md bg-accent/15 text-accent font-mono text-[12px]">
      {label}
      <button onClick={onRemove} className="hover:text-ink"><X className="w-3 h-3" /></button>
    </span>
  );
}

function getPageNum(index, current, total) {
  if (total <= 7) return index + 1;
  if (current <= 4) return index + 1;
  if (current >= total - 3) return total - 6 + index;
  return current - 3 + index;
}
