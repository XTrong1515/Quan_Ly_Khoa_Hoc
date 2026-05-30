/**
 * Mock data — thay bằng API thật sau.
 * Trong production: dùng React Query để fetch từ backend (xem TODO trong từng page).
 */
export const COURSES = [
  { id: 1, title: 'JavaScript: The Hard Parts', glyph: 'JS', thumb: 'yellow',
    instructor: 'Will Sentance', level: 'Advanced', hours: 18.5, lessons: 64,
    price: 599000, originalPrice: 899000, rating: 4.9, students: 12438,
    tag: 'Bestseller', category: 'JS Core',
    description: 'Mổ xẻ execution context, closures, prototype chain, event loop.' },
  { id: 2, title: 'React Performance Deep-dive', glyph: 'Rx', thumb: 'indigo',
    instructor: 'Khang Phạm', level: 'Advanced', hours: 12.0, lessons: 48,
    price: 749000, originalPrice: 1199000, rating: 4.8, students: 8142,
    tag: 'Hot', category: 'React' },
  { id: 3, title: 'Async Patterns & Event Loop', glyph: '⟳', thumb: 'green',
    instructor: 'Lina Trần', level: 'Intermediate', hours: 9.5, lessons: 32,
    price: 449000, originalPrice: 699000, rating: 4.9, students: 5728,
    tag: 'New', category: 'JS Core' },
  { id: 4, title: 'TypeScript for JS Devs', glyph: 'TS', thumb: 'sky',
    instructor: 'Đặng Quang', level: 'Intermediate', hours: 14.0, lessons: 52,
    price: 549000, originalPrice: 899000, rating: 4.7, students: 9341,
    tag: null, category: 'Types' },
  { id: 5, title: 'Node.js Internals', glyph: 'Nx', thumb: 'rose',
    instructor: 'Mike Hughes', level: 'Advanced', hours: 16.0, lessons: 58,
    price: 699000, originalPrice: 1099000, rating: 4.8, students: 4204,
    tag: null, category: 'Backend' },
  { id: 6, title: 'Vanilla JS Patterns', glyph: '{}', thumb: 'violet',
    instructor: 'Hà Trang', level: 'Beginner', hours: 7.5, lessons: 26,
    price: 0, originalPrice: 0, rating: 4.6, students: 22108,
    tag: 'Free', category: 'JS Core' },
];

export const CATEGORIES = [
  { name: 'JavaScript Core', slug: 'js-core', count: 24, color: '#F7DF1E', icon: '{}' },
  { name: 'Asynchronous',   slug: 'async',   count: 8,  color: '#34D399', icon: '⟳'  },
  { name: 'React',          slug: 'react',   count: 16, color: '#818CF8', icon: 'Rx' },
  { name: 'TypeScript',     slug: 'ts',      count: 11, color: '#38BDF8', icon: 'TS' },
  { name: 'Node.js',        slug: 'node',    count: 9,  color: '#F43F5E', icon: 'Nx' },
  { name: 'Testing',        slug: 'testing', count: 6,  color: '#A78BFA', icon: '✓'  },
];
