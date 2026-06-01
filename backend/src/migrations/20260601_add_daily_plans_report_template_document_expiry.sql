-- Migration: daily planned tasks, report template fields, and document expiry.
-- Base schema compared from: backend/src/config/mtms_1.sql
-- Current schema compared to: backend/src/config/database.sql
--
-- Run this after selecting the application database, for example:
-- USE job_management_system;

-- =========================
-- DOCUMENT EXPIRY
-- =========================
SET @database_name = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE documents ADD COLUMN expiry_date DATE NULL AFTER file_size',
    'SELECT ''documents.expiry_date already exists'' AS migration_notice'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'documents'
    AND COLUMN_NAME = 'expiry_date'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_documents_expiry_date ON documents(expiry_date)',
    'SELECT ''idx_documents_expiry_date already exists'' AS migration_notice'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'documents'
    AND INDEX_NAME = 'idx_documents_expiry_date'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =========================
-- DAILY PLANNED TASKS
-- =========================
CREATE TABLE IF NOT EXISTS daily_tasks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  parent_task_id BIGINT NULL,
  description TEXT NOT NULL,
  planned_time TIME NULL,
  is_completed TINYINT(1) DEFAULT 0,
  completed_at DATETIME NULL,
  created_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_tasks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE daily_tasks ADD COLUMN parent_task_id BIGINT NULL AFTER user_id',
    'SELECT ''daily_tasks.parent_task_id already exists'' AS migration_notice'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'daily_tasks'
    AND COLUMN_NAME = 'parent_task_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE daily_tasks ADD COLUMN planned_time TIME NULL AFTER description',
    'SELECT ''daily_tasks.planned_time already exists'' AS migration_notice'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'daily_tasks'
    AND COLUMN_NAME = 'planned_time'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_daily_tasks_user_date ON daily_tasks(user_id, created_date)',
    'SELECT ''idx_daily_tasks_user_date already exists'' AS migration_notice'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'daily_tasks'
    AND INDEX_NAME = 'idx_daily_tasks_user_date'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_daily_tasks_completed ON daily_tasks(is_completed)',
    'SELECT ''idx_daily_tasks_completed already exists'' AS migration_notice'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'daily_tasks'
    AND INDEX_NAME = 'idx_daily_tasks_completed'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_daily_tasks_parent ON daily_tasks(parent_task_id)',
    'SELECT ''idx_daily_tasks_parent already exists'' AS migration_notice'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'daily_tasks'
    AND INDEX_NAME = 'idx_daily_tasks_parent'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =========================
-- DAILY REPORT TEMPLATE
-- =========================
SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE task_daily_reports ADD COLUMN completed_tasks TEXT NULL AFTER activity_done',
    'SELECT ''task_daily_reports.completed_tasks already exists'' AS migration_notice'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'task_daily_reports'
    AND COLUMN_NAME = 'completed_tasks'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE task_daily_reports ADD COLUMN ongoing_tasks TEXT NULL AFTER completed_tasks',
    'SELECT ''task_daily_reports.ongoing_tasks already exists'' AS migration_notice'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'task_daily_reports'
    AND COLUMN_NAME = 'ongoing_tasks'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE task_daily_reports ADD COLUMN next_tasks TEXT NULL AFTER ongoing_tasks',
    'SELECT ''task_daily_reports.next_tasks already exists'' AS migration_notice'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @database_name
    AND TABLE_NAME = 'task_daily_reports'
    AND COLUMN_NAME = 'next_tasks'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =========================
-- DEFAULT DOCUMENT CATEGORIES
-- =========================
SET @admin_user_id = (
  SELECT users.id
  FROM users
  JOIN roles ON roles.id = users.role_id
  WHERE roles.name = 'admin'
  ORDER BY users.id ASC
  LIMIT 1
);

INSERT INTO document_categories (name, description, created_by)
SELECT 'Approval Documents', 'Official approval and authorization files.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Approval Documents');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Contracts', 'Client, supplier, and project contracts.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Contracts');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Invoices', 'Invoices and billing documents.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Invoices');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Reports', 'Formal reports and project submissions.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Reports');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Client Documents', 'Files supplied by clients.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Client Documents');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Field Photos', 'Field images and site evidence.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Field Photos');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Meeting Notes', 'Meeting minutes and notes.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Meeting Notes');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Permits', 'Permits and compliance documents.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Permits');

INSERT INTO document_categories (name, description, created_by)
SELECT 'Other', 'General project documents.', @admin_user_id
WHERE @admin_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document_categories WHERE name = 'Other');
