import fs from "fs/promises";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { env } from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "./database.sql");

let pool;

async function runSchema() {
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  const adminConnection = await mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    multipleStatements: true,
  });

  try {
    await adminConnection.query(schemaSql);
  } finally {
    await adminConnection.end();
  }
}

async function seedDefaultAdmin() {
  const [existingAdmin] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [env.defaultAdminEmail]
  );
  if (existingAdmin.length) {
    return;
  }

  const [roles] = await pool.query(
    "SELECT id FROM roles WHERE name = 'admin' LIMIT 1"
  );

  if (!roles.length) {
    return;
  }

  const hashedPassword = await bcrypt.hash(env.defaultAdminPassword, 10);

  await pool.query(
    `INSERT INTO users (role_id, full_name, email, password, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [
      roles[0].id,
      env.defaultAdminName,
      env.defaultAdminEmail,
      hashedPassword,
    ]
  );
}

async function ensureDocumentLibrarySchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS document_categories (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_by BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_document_categories_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT
    )`,
    `CREATE TABLE IF NOT EXISTS google_drive_settings (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      connected_email VARCHAR(150),
      root_folder_id VARCHAR(255),
      pending_folder_id VARCHAR(255),
      approved_folder_id VARCHAR(255),
      rejected_folder_id VARCHAR(255),
      status ENUM('connected', 'disconnected') DEFAULT 'disconnected',
      configured_by BIGINT,
      configured_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_google_drive_settings_configured_by
        FOREIGN KEY (configured_by) REFERENCES users(id)
        ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      job_id BIGINT NOT NULL,
      category_id BIGINT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      original_file_name VARCHAR(255) NOT NULL,
      google_drive_file_id VARCHAR(255) NOT NULL,
      google_drive_file_url TEXT,
      google_drive_folder_id VARCHAR(255),
      mime_type VARCHAR(150),
      file_size BIGINT,
      expiry_date DATE NULL,
      uploaded_by BIGINT NOT NULL,
      status ENUM('pending_approval', 'approved', 'rejected') DEFAULT 'pending_approval',
      reviewed_by BIGINT NULL,
      reviewed_at DATETIME NULL,
      review_comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_documents_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_documents_category
        FOREIGN KEY (category_id) REFERENCES document_categories(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_documents_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_documents_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL
    )`,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  for (const statement of [
    "ALTER TABLE documents ADD COLUMN expiry_date DATE NULL AFTER file_size",
    "CREATE INDEX idx_documents_expiry_date ON documents(expiry_date)",
    "CREATE INDEX idx_documents_status ON documents(status)",
    "CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by)",
    "CREATE INDEX idx_document_categories_status ON document_categories(status)",
  ]) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (!["ER_DUP_KEYNAME", "ER_DUP_FIELDNAME"].includes(error.code)) {
        throw error;
      }
    }
  }
}

async function seedDefaultDocumentCategories() {
  const [admins] = await pool.query(
    `SELECT users.id
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE roles.name = 'admin'
     ORDER BY users.id ASC
     LIMIT 1`
  );

  if (!admins.length) {
    return;
  }

  const categories = [
    ["Approval Documents", "Official approval and authorization files."],
    ["Contracts", "Client, supplier, and project contracts."],
    ["Invoices", "Invoices and billing documents."],
    ["Reports", "Formal reports and project submissions."],
    ["Client Documents", "Files supplied by clients."],
    ["Field Photos", "Field images and site evidence."],
    ["Meeting Notes", "Meeting minutes and notes."],
    ["Permits", "Permits and compliance documents."],
    ["Other", "General project documents."],
  ];

  for (const [name, description] of categories) {
    await pool.query(
      `INSERT INTO document_categories (name, description, created_by)
       SELECT ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM document_categories WHERE name = ?
       )`,
      [name, description, admins[0].id, name]
    );
  }
}

async function ensureDailyTaskSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS daily_tasks (
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
    )`
  );

  for (const statement of [
    "ALTER TABLE daily_tasks ADD COLUMN parent_task_id BIGINT NULL AFTER user_id",
    "ALTER TABLE daily_tasks ADD COLUMN planned_time TIME NULL AFTER description",
    "ALTER TABLE daily_tasks ADD COLUMN sort_order INT NULL",
    // Carry-over: the new task points back to the original, and the original to the new one.
    "ALTER TABLE daily_tasks ADD COLUMN carried_from_id BIGINT NULL",
    "ALTER TABLE daily_tasks ADD COLUMN carried_to_id BIGINT NULL",
    // Set by the employee, on the day itself, to continue this task on the next day.
    "ALTER TABLE daily_tasks ADD COLUMN carry_over TINYINT(1) NOT NULL DEFAULT 0",
  ]) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }

  for (const statement of [
    "CREATE INDEX idx_daily_tasks_user_date ON daily_tasks(user_id, created_date)",
    "CREATE INDEX idx_daily_tasks_completed ON daily_tasks(is_completed)",
    "CREATE INDEX idx_daily_tasks_parent ON daily_tasks(parent_task_id)",
  ]) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== "ER_DUP_KEYNAME") {
        throw error;
      }
    }
  }
}

async function ensureReportTemplateSchema() {
  for (const statement of [
    "ALTER TABLE task_daily_reports ADD COLUMN completed_tasks TEXT NULL AFTER activity_done",
    "ALTER TABLE task_daily_reports ADD COLUMN ongoing_tasks TEXT NULL AFTER completed_tasks",
    "ALTER TABLE task_daily_reports ADD COLUMN next_tasks TEXT NULL AFTER ongoing_tasks",
  ]) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }
}

async function ensureMentionFilesSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS mention_files (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      mention_id BIGINT NOT NULL,
      stage ENUM('tag', 'resolution') NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100) NULL,
      uploaded_by BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mention_files_mention (mention_id),
      CONSTRAINT fk_mention_files_mention
        FOREIGN KEY (mention_id) REFERENCES report_mentions(id) ON DELETE CASCADE,
      CONSTRAINT fk_mention_files_user
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  for (const statement of [
    "ALTER TABLE report_mentions ADD COLUMN resolution_message TEXT NULL",
    "ALTER TABLE report_mentions ADD COLUMN resolved_at DATETIME NULL",
    // Tags can also come from a planned (daily) task, which has no job report.
    "ALTER TABLE report_mentions MODIFY report_id BIGINT NULL",
    "ALTER TABLE report_mentions ADD COLUMN daily_task_id BIGINT NULL",
    "ALTER TABLE report_mentions ADD COLUMN source_title VARCHAR(255) NULL",
    // Admins appear in the "Ask for help" list only when this is switched on for them.
    "ALTER TABLE users ADD COLUMN can_receive_help TINYINT(1) NOT NULL DEFAULT 0",
  ]) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  }
}

async function ensureDailyPlanFeedbackSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS daily_task_comments (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      employee_id BIGINT NOT NULL,
      daily_task_id BIGINT NULL,
      plan_date DATE NOT NULL,
      author_id BIGINT NOT NULL,
      message TEXT NOT NULL,
      whatsapp_status VARCHAR(20) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_daily_task_comments_employee_date (employee_id, plan_date),
      CONSTRAINT fk_daily_task_comments_employee
        FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_task_comments_task
        FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_task_comments_author
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS daily_day_unlocks (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      plan_date DATE NOT NULL,
      unlocked_by BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_daily_day_unlocks_user_date (user_id, plan_date),
      CONSTRAINT fk_daily_day_unlocks_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_day_unlocks_admin
        FOREIGN KEY (unlocked_by) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS daily_day_report_files (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      report_date DATE NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_daily_day_report_files_user_date (user_id, report_date),
      CONSTRAINT fk_daily_day_report_files_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS daily_day_reports (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      report_date DATE NOT NULL,
      summary TEXT NOT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_daily_day_reports_user_date (user_id, report_date),
      CONSTRAINT fk_daily_day_reports_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
}

export async function initializeDatabase() {
  if (env.initDbOnStart) {
    await runSchema();
  }

  pool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  });

  await pool.query("SELECT 1");

  await ensureDocumentLibrarySchema();
  await ensureDailyTaskSchema();
  await ensureReportTemplateSchema();
  await ensureDailyPlanFeedbackSchema();
  await ensureMentionFilesSchema();

  if (env.seedAdminOnStart) {
    await seedDefaultAdmin();
  }

  await seedDefaultDocumentCategories();

  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool has not been initialized.");
  }
  return pool;
}
