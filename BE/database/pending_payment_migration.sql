-- ============================================================
-- Migration: Pending payment expiry (24h) for orders
-- Chạy: mysql -u root -p course_mng < BE/database/pending_payment_migration.sql
-- An toàn để chạy lại nhiều lần (idempotent) — dùng procedure tạm để
-- kiểm tra information_schema trước khi ALTER, vì "IF NOT EXISTS" trên
-- ADD COLUMN / ADD INDEX không được hỗ trợ trên server này.
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS _migrate_pending_payment $$
CREATE PROCEDURE _migrate_pending_payment()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'expires_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN expires_at TIMESTAMP NULL AFTER created_at;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_status_expires'
  ) THEN
    ALTER TABLE orders ADD INDEX idx_status_expires (status, expires_at);
  END IF;
END $$

DELIMITER ;

CALL _migrate_pending_payment();
DROP PROCEDURE _migrate_pending_payment;

-- Backfill: existing pending orders get a 24h window from creation
UPDATE orders
  SET expires_at = DATE_ADD(created_at, INTERVAL 24 HOUR)
  WHERE status = 'PENDING' AND expires_at IS NULL;
