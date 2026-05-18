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
    "CREATE INDEX idx_documents_status ON documents(status)",
    "CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by)",
    "CREATE INDEX idx_document_categories_status ON document_categories(status)",
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
