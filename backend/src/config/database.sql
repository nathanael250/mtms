CREATE DATABASE IF NOT EXISTS job_management_system;
USE job_management_system;

-- =========================
-- ROLES
-- =========================
CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO roles (name) VALUES ('admin'), ('staff');


-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT
);


-- =========================
-- JOBS / PROJECTS
-- =========================
CREATE TABLE jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    approval_document VARCHAR(255),

    created_by BIGINT NOT NULL,

    status ENUM(
        'pending',
        'ongoing',
        'completed_pending_approval',
        'completed',
        'rejected',
        'cancelled'
    ) DEFAULT 'pending',

    start_date DATE,
    end_date DATE,

    marked_completed_by BIGINT NULL,
    marked_completed_at DATETIME NULL,
    completion_note TEXT,

    approved_by BIGINT NULL,
    approved_at DATETIME NULL,
    approval_comment TEXT,

    completed_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_jobs_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_jobs_marked_completed_by
        FOREIGN KEY (marked_completed_by) REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_jobs_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================
-- TASKS
-- =========================
CREATE TABLE tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    job_id BIGINT NOT NULL,
    parent_task_id BIGINT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    assigned_by BIGINT NOT NULL,
    assigned_to BIGINT NOT NULL,

    status ENUM(
        'assigned',
        'ongoing',
        'completed',
        'cancelled'
    ) DEFAULT 'assigned',

    start_date DATE,
    due_date DATE,

    completed_by BIGINT NULL,
    completed_at DATETIME NULL,
    completion_note TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tasks_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tasks_parent
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_tasks_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tasks_assigned_to
        FOREIGN KEY (assigned_to) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tasks_completed_by
        FOREIGN KEY (completed_by) REFERENCES users(id)
        ON DELETE SET NULL
);


-- =========================
-- DAILY TASK REPORTS
-- =========================
CREATE TABLE task_daily_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    task_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    report_date DATE NOT NULL,
    activity_done TEXT NOT NULL,
    location VARCHAR(255),
    comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reports_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reports_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- REPORT MENTIONS / TAGS
-- Example: @StoreKeeper please prepare a big stand tomorrow
-- =========================
CREATE TABLE report_mentions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    report_id BIGINT NOT NULL,
    mentioned_by BIGINT NOT NULL,
    mentioned_user_id BIGINT NOT NULL,

    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'resolved') DEFAULT 'unread',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_mention_report
        FOREIGN KEY (report_id) REFERENCES task_daily_reports(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mention_by
        FOREIGN KEY (mentioned_by) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mention_user
        FOREIGN KEY (mentioned_user_id) REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- ATTACHMENTS
-- Can be used for jobs, tasks, reports
-- =========================
CREATE TABLE attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    related_type ENUM('job', 'task', 'report') NOT NULL,
    related_id BIGINT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),

    uploaded_by BIGINT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attachments_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- DOCUMENT CATEGORIES
-- =========================
CREATE TABLE document_categories (
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
);

-- =========================
-- GOOGLE DRIVE SETTINGS
-- =========================
CREATE TABLE google_drive_settings (
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
);


-- =========================
-- DOCUMENT LIBRARY
-- =========================
CREATE TABLE documents (
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

    status ENUM(
        'pending_approval',
        'approved',
        'rejected'
    ) DEFAULT 'pending_approval',

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
);


-- =========================
-- ACTIVITY LOGS
-- Admin can use this to see job progress
-- =========================
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    job_id BIGINT NULL,
    task_id BIGINT NULL,
    user_id BIGINT NOT NULL,

    action VARCHAR(100) NOT NULL,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_logs_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_logs_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- CONTACT CATEGORIES
-- =========================
CREATE TABLE contact_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO contact_categories (name)
VALUES 
('photographer'),
('videographer'),
('client'),
('supplier'),
('driver'),
('designer'),
('other');


-- =========================
-- CONTACTS
-- =========================
CREATE TABLE contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),

    category_id BIGINT NOT NULL,
    custom_category VARCHAR(100),

    company_name VARCHAR(150),
    address VARCHAR(255),
    notes TEXT,

    created_by BIGINT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_contacts_category
        FOREIGN KEY (category_id) REFERENCES contact_categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_contacts_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- JOB CONTACTS
-- Optional: connect contacts to specific jobs
-- =========================
CREATE TABLE job_contacts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    job_id BIGINT NOT NULL,
    contact_id BIGINT NOT NULL,

    role_description VARCHAR(150),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_job_contacts_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_contacts_contact
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
        ON DELETE CASCADE
);


-- =========================
-- USEFUL INDEXES
-- =========================
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_reports_date ON task_daily_reports(report_date);
CREATE INDEX idx_report_mentions_status ON report_mentions(status);
CREATE INDEX idx_contacts_name ON contacts(full_name);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_document_categories_status ON document_categories(status);
