-- ============================================================
-- Migration: Thêm display_order cho courses (drag-to-reorder)
-- Chạy: mysql -u root -p course_mng < BE/database/courses_reorder_migration.sql
-- LƯU Ý: MySQL không hỗ trợ IF NOT EXISTS cho ADD COLUMN/INDEX
--        Script dùng INFORMATION_SCHEMA để kiểm tra trước khi thêm
-- ============================================================

-- Thêm cột display_order nếu chưa có
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'display_order') = 0,
  'ALTER TABLE courses ADD COLUMN display_order INT NOT NULL DEFAULT 0',
  'SELECT ''display_order already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Gán display_order ban đầu theo thứ tự id (chỉ những row chưa có giá trị)
UPDATE courses SET display_order = id WHERE display_order = 0;

-- Thêm index nếu chưa có
SET @idx = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND INDEX_NAME = 'idx_courses_display_order') = 0,
  'ALTER TABLE courses ADD INDEX idx_courses_display_order (display_order)',
  'SELECT ''index already exists'' AS info'
);
PREPARE stmt FROM @idx; EXECUTE stmt; DEALLOCATE PREPARE stmt;
