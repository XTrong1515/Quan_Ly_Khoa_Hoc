import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, ChevronLeft, ChevronRight, X,
  LayoutGrid, Loader2, Check,
} from 'lucide-react';
import { CourseCard } from '@/components/course-card.jsx';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
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

  // `q` is the alias the homepage search/links use — honor both
  const initialSearch = searchParams.get('search') ?? searchParams.get('q') ?? '';
  const [search,      setSearch]      = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
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
  const activeFilterCount = category.length + level.length + (minRating ? 1 : 0);

  const filterPanel = (
    <>
      <div className="flex items-center justify-between mb-5">
        <span className="flex items-center gap-2 font-mono text-[12px] font-semibold text-ink-3 uppercase tracking-[0.08em]">
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" /> Bộ lọc
          {activeFilterCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-ink text-[10px] font-bold grid place-items-center">
              {activeFilterCount}
            </span>
          )}
        </span>
        {hasFilters && (
          <button onClick={clearAll} className="font-mono text-[11.5px] text-accent hover:underline cursor-pointer">
            Xóa tất cả
          </button>
        )}
      </div>

      <FilterSection title="Danh mục">
        {categories.map((c) => (
          <FilterCheckbox
            key={c.slug}
            label={c.name}
            count={c.count}
            checked={category.includes(c.slug)}
            onChange={() => toggleFilter(setCategory)(c.slug)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Cấp độ">
        {LEVELS.map((l) => (
          <FilterCheckbox
            key={l}
            label={l}
            checked={level.includes(l)}
            onChange={() => toggleFilter(setLevel)(l)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Đánh giá">
        <div className="flex flex-wrap gap-1.5">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={() => { setMinRating(minRating === String(r.value) ? '' : String(r.value)); setPage(1); }}
              aria-pressed={minRating === String(r.value)}
              className={cn(
                'h-8 px-3 rounded-lg border font-mono text-[12px] transition-colors cursor-pointer',
                minRating === String(r.value)
                  ? 'border-accent bg-accent/15 text-accent font-semibold'
                  : 'border-line text-ink-2 hover:border-accent/40 hover:text-ink',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </FilterSection>
    </>
  );

  return (
    <>
      <Seo
        title="Tất cả khóa học JavaScript, React, Node.js — Hoisted"
        description="Thư viện khóa học lập trình của Hoisted: JavaScript core, React, Node.js, TypeScript. Lọc theo chủ đề, cấp độ và đánh giá — học thử miễn phí trước khi mua."
      />

      {/* ── Catalog hero ─────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 50% 70% at 30% 0%, rgb(var(--accent) / .10) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 90% 100%, rgb(99 102 241 / .08) 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 pt-12 pb-10">
          <p className="eyebrow mb-2">
            <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ khóa-học</span>
          </p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="display text-[32px] sm:text-[42px] mb-3">Thư viện khóa học</h1>
              <p className="text-[15px] text-ink-2 max-w-[440px] leading-[1.65]">
                {total > 0 ? (
                  <>
                    <strong className="text-ink font-mono">{total}</strong> khóa học về JS core, React,
                    Node và hơn thế — lọc theo đúng thứ bạn cần.
                  </>
                ) : (
                  'Khóa học về JS core, React, Node và hơn thế — lọc theo đúng thứ bạn cần.'
                )}
              </p>
            </div>

            {/* Command-bar search */}
            <form onSubmit={handleSearchSubmit} role="search" className="w-full lg:w-[420px]">
              <div className="relative flex items-center rounded-2xl border border-line bg-bg-1/80 backdrop-blur p-1.5 shadow-lg shadow-black/5 focus-within:border-accent/50 transition-colors">
                <Search className="ml-3 w-4 h-4 text-ink-3 pointer-events-none flex-shrink-0" aria-hidden="true" />
                <label htmlFor="catalog-search" className="sr-only">Tìm khóa học</label>
                <input
                  id="catalog-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm khóa học, JS, React…"
                  className="flex-1 h-10 bg-transparent border-0 outline-none px-3 text-sm font-medium text-ink placeholder:text-ink-3 min-w-0"
                />
                <Button type="submit" className="rounded-xl">Tìm</Button>
              </div>
            </form>
          </div>

          {/* Category quick-rail */}
          {categories.length > 0 && (
            <div className="flex gap-2 mt-7 overflow-x-auto pb-1 -mb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => { setCategory([]); setPage(1); }}
                aria-pressed={category.length === 0}
                className={cn(
                  'h-8 px-3.5 rounded-full border font-mono text-[12px] whitespace-nowrap transition-colors cursor-pointer flex-shrink-0',
                  category.length === 0
                    ? 'border-accent bg-accent text-accent-ink font-semibold'
                    : 'border-line text-ink-2 hover:border-accent/40 hover:text-ink',
                )}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => toggleFilter(setCategory)(c.slug)}
                  aria-pressed={category.includes(c.slug)}
                  className={cn(
                    'h-8 px-3.5 rounded-full border font-mono text-[12px] whitespace-nowrap transition-colors cursor-pointer flex-shrink-0',
                    category.includes(c.slug)
                      ? 'border-accent bg-accent text-accent-ink font-semibold'
                      : 'border-line text-ink-2 hover:border-accent/40 hover:text-ink',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-8">
        <div className="flex gap-8">
          {/* ── Filter panel (desktop) ─────────────────────────────── */}
          <aside className="w-[230px] shrink-0 hidden lg:block" aria-label="Bộ lọc khóa học">
            <div className="sticky top-20 card p-5">
              {filterPanel}
            </div>
          </aside>

          {/* ── Filter drawer (mobile) ─────────────────────────────── */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] bg-bg border-r border-line p-6 overflow-y-auto shadow-2xl">
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Đóng bộ lọc"
                  className="absolute top-4 right-4 w-9 h-9 rounded-lg border border-line text-ink-3 hover:text-ink hover:bg-bg-2 grid place-items-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                {filterPanel}
                <Button className="w-full justify-center mt-4" onClick={() => setSidebarOpen(false)}>
                  Xem {total} kết quả
                </Button>
              </div>
            </div>
          )}

          {/* ── Results ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="flex items-center gap-2 font-mono text-[12.5px] text-ink-3" aria-live="polite">
                {isFetching && !isLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none text-accent" aria-hidden="true" />
                )}
                <span><b className="text-ink">{total}</b> kết quả</span>
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 h-9 px-3 rounded-lg border border-line text-sm text-ink-2 hover:bg-bg-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> Bộ lọc
                  {activeFilterCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-ink text-[10px] font-bold grid place-items-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <label htmlFor="sort-select" className="sr-only">Sắp xếp</label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="input h-9 text-[13px] pr-8 pl-3 cursor-pointer min-w-[160px] !w-auto"
                >
                  {SORT_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Active filters */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
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

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-3 animate-pulse motion-reduce:animate-none">
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
              <div className="card py-20 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-60" aria-hidden="true" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-4">
                    <LayoutGrid className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="font-display font-semibold text-[17px] mb-1.5">Không tìm thấy khóa học nào</p>
                  <p className="text-sm text-ink-2 mb-5">Thử từ khóa khác, hoặc bỏ bớt bộ lọc đang bật.</p>
                  <Button variant="ghost" onClick={clearAll}>Xóa bộ lọc</Button>
                </div>
              </div>
            ) : (
              <div className={cn(
                'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity duration-200',
                isFetching && !isLoading && 'opacity-60',
              )}>
                {courses.map((c, i) => (
                  <Reveal key={c.id} delay={(i % 3) * 50}>
                    <CourseCard course={c} />
                  </Reveal>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Phân trang">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Trang trước"
                  className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 hover:border-accent/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pg = totalPages <= 7 ? i + 1 : getPageNum(i, page, totalPages);
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      aria-current={pg === page ? 'page' : undefined}
                      className={cn(
                        'w-9 h-9 rounded-xl border text-[13px] font-mono transition-colors cursor-pointer',
                        pg === page
                          ? 'border-accent bg-accent text-accent-ink font-bold shadow-[0_4px_16px_rgb(var(--accent)/0.3)]'
                          : 'border-line text-ink-2 hover:bg-bg-2 hover:border-accent/40',
                      )}
                    >
                      {pg}
                    </button>
                  );
                })}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Trang sau"
                  className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 hover:border-accent/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FilterSection({ title, children }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] mb-2.5">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterCheckbox({ label, count, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group select-none">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <span
        className={cn(
          'w-[18px] h-[18px] rounded-md border grid place-items-center flex-shrink-0 transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60',
          checked ? 'border-accent bg-accent text-accent-ink' : 'border-line group-hover:border-accent/50',
        )}
        aria-hidden="true"
      >
        {checked && <Check className="w-3 h-3" strokeWidth={3} />}
      </span>
      <span className={cn('flex-1 text-[13px] transition-colors', checked ? 'text-ink font-medium' : 'text-ink-2 group-hover:text-ink')}>
        {label}
      </span>
      {count != null && <span className="font-mono text-[11px] text-ink-3">{count}</span>}
    </label>
  );
}

function ActiveChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-[28px] pl-3 pr-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent font-mono text-[12px]">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className="w-5 h-5 rounded-full hover:bg-accent/20 grid place-items-center cursor-pointer transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function getPageNum(index, current, total) {
  if (total <= 7) return index + 1;
  if (current <= 4) return index + 1;
  if (current >= total - 3) return total - 6 + index;
  return current - 3 + index;
}
