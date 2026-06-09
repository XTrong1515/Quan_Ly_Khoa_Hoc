-- ============================================================
-- Migration: align existing DB with updated schema
-- Dùng khi cài fresh hoặc reset DB.
-- Nếu DB đang chạy → chạy migrate.js thay vì file này:
--   node database/migrate.js
--
-- File này KHÔNG dùng được trong MySQL Workbench nếu các cột
-- đã tồn tại (sẽ báo "Duplicate column name").
-- ============================================================

-- categories: add icon and color columns
ALTER TABLE categories ADD COLUMN icon  VARCHAR(50);
ALTER TABLE categories ADD COLUMN color VARCHAR(50);

-- courses: add glyph, thumb, rating, student_count, review_count
ALTER TABLE courses ADD COLUMN glyph         VARCHAR(10);
ALTER TABLE courses ADD COLUMN thumb         VARCHAR(50);
ALTER TABLE courses ADD COLUMN rating        DECIMAL(3,2) DEFAULT 0;
ALTER TABLE courses ADD COLUMN student_count INT DEFAULT 0;
ALTER TABLE courses ADD COLUMN review_count  INT DEFAULT 0;

-- Copy data from old columns
UPDATE courses SET glyph         = thumbnail_glyph WHERE glyph IS NULL;
UPDATE courses SET rating        = avg_rating       WHERE rating = 0 AND avg_rating IS NOT NULL;
UPDATE courses SET student_count = total_students   WHERE student_count = 0 AND total_students IS NOT NULL;

-- Seed category icon + color
UPDATE categories SET icon = '{}', color = '#F7DF1E' WHERE slug = 'js-core';
UPDATE categories SET icon = '⟳',  color = '#34D399' WHERE slug = 'async';
UPDATE categories SET icon = 'Rx', color = '#818CF8' WHERE slug = 'react';
UPDATE categories SET icon = 'TS', color = '#38BDF8' WHERE slug = 'ts';
UPDATE categories SET icon = 'Nx', color = '#F43F5E' WHERE slug = 'node';
UPDATE categories SET icon = '✓',  color = '#A78BFA' WHERE slug = 'testing';

-- Seed course thumb + review_count
UPDATE courses SET thumb = 'yellow', review_count = 847  WHERE slug = 'javascript-the-hard-parts';
UPDATE courses SET thumb = 'indigo', review_count = 523  WHERE slug = 'react-performance-deep-dive';
UPDATE courses SET thumb = 'green',  review_count = 312  WHERE slug = 'async-patterns-event-loop';
UPDATE courses SET thumb = 'sky',    review_count = 619  WHERE slug = 'typescript-for-js-devs';
UPDATE courses SET thumb = 'rose',   review_count = 287  WHERE slug = 'nodejs-internals';
UPDATE courses SET thumb = 'violet', review_count = 1024 WHERE slug = 'vanilla-js-patterns';
