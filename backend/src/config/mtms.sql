-- MySQL dump 10.13  Distrib 9.6.0, for macos26.3 (arm64)
--
-- Host: localhost    Database: job_management_system
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '3c81a188-3cca-11f1-aad0-d34af8fb0420:1-5605';

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_id` bigint DEFAULT NULL,
  `task_id` bigint DEFAULT NULL,
  `user_id` bigint NOT NULL,
  `action` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_logs_job` (`job_id`),
  KEY `fk_logs_task` (`task_id`),
  KEY `fk_logs_user` (`user_id`),
  CONSTRAINT `fk_logs_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_logs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
INSERT INTO `activity_logs` VALUES (1,1,NULL,1,'job_created','System Admin created job \"RBC Documentary\".','2026-04-27 09:31:36'),(2,1,1,1,'task_assigned','System Admin assigned task \"Preparing the job scedure\".','2026-04-27 09:32:14'),(3,1,NULL,1,'job_created','Nathan Admin created job Kigali Convention Centre Event Coverage.','2026-04-27 10:14:16'),(4,1,1,1,'task_assigned','Nathan Admin assigned Pre-production meeting to Aline Uwase.','2026-04-27 10:14:16'),(5,1,1,2,'task_completed','Aline Uwase completed Pre-production meeting.','2026-04-27 10:14:16'),(6,1,2,3,'report_added','Emmy Niyonzima added equipment preparation daily report.','2026-04-27 10:14:16'),(7,1,2,3,'mention_created','Emmy Niyonzima mentioned Patrick Habimana about the big camera stand.','2026-04-27 10:14:16'),(8,2,NULL,1,'job_created','Nathan Admin created Musanze Tourism Promotion Shoot.','2026-04-27 10:14:16'),(9,2,5,2,'task_completed','Aline Uwase completed location scouting in Musanze.','2026-04-27 10:14:16'),(10,2,6,5,'report_added','Diane Mukamana added drone video capture report.','2026-04-27 10:14:16'),(11,3,NULL,1,'job_created','Nathan Admin created Nyamata Community Project Documentation.','2026-04-27 10:14:16'),(12,3,10,3,'task_completed','Emmy Niyonzima completed final media organization.','2026-04-27 10:14:16'),(13,3,NULL,3,'job_marked_completed','Emmy Niyonzima marked Nyamata Community Project Documentation as ready for admin approval.','2026-04-27 10:14:16'),(14,4,NULL,1,'job_approved','System Admin approved completion for job \"Nyamata Community Project Documentation\".','2026-04-27 14:46:42'),(15,4,12,1,'task_assigned','System Admin assigned task \"aSHGDYasdjasD\".','2026-04-27 16:19:43'),(16,4,12,2,'task_started','NIYOGUSHIMWA Natanael started task \"aSHGDYasdjasD\".','2026-04-29 14:53:34'),(17,5,NULL,1,'job_created','System Admin created job \"Shooting RAB Project\".','2026-05-07 13:09:48'),(18,5,13,1,'task_assigned','System Admin assigned task \"Creating the script\".','2026-05-07 13:10:54'),(19,5,13,2,'task_started','NIYOGUSHIMWA Natanael started task \"Creating the script\".','2026-05-07 13:11:37'),(20,5,13,2,'report_added','NIYOGUSHIMWA Natanael added a daily report for task \"Creating the script\".','2026-05-07 13:16:06'),(21,5,13,2,'task_completed','NIYOGUSHIMWA Natanael completed task \"Creating the script\".','2026-05-07 13:39:04'),(22,4,NULL,2,'document_uploaded','NIYOGUSHIMWA Natanael uploaded document \"sdfasdfasd\" for approval.','2026-05-07 14:41:29'),(23,4,NULL,1,'document_approved','System Admin approved document \"sdfasdfasd\".','2026-05-07 14:45:34'),(24,5,14,1,'task_assigned','System Admin assigned task \"Interview from kigali leader\".','2026-05-08 16:06:52'),(25,5,NULL,1,'document_uploaded','System Admin uploaded document \"Contract on Rab project\" for approval.','2026-05-08 16:08:29'),(26,5,NULL,1,'document_approved','System Admin approved document \"Contract on Rab project\".','2026-05-08 16:09:19'),(27,5,14,2,'task_started','NIYOGUSHIMWA Natanael started task \"Interview from kigali leader\".','2026-05-08 16:09:58'),(28,5,14,2,'report_added','NIYOGUSHIMWA Natanael added a daily report for task \"Interview from kigali leader\".','2026-05-08 16:11:34'),(29,5,14,2,'task_completed','NIYOGUSHIMWA Natanael completed task \"Interview from kigali leader\".','2026-05-08 16:16:34'),(30,5,15,1,'task_assigned','System Admin assigned task \"Shooting musanze fammers\".','2026-05-08 16:21:55'),(31,5,15,2,'task_started','NIYOGUSHIMWA Natanael started task \"Shooting musanze fammers\".','2026-05-08 16:22:05'),(32,5,15,2,'report_added','NIYOGUSHIMWA Natanael added a daily report for task \"Shooting musanze fammers\".','2026-05-08 16:22:44'),(33,5,15,2,'mention_created','NIYOGUSHIMWA Natanael mentioned another staff member from task \"Shooting musanze fammers\".','2026-05-08 16:22:44'),(34,5,15,9,'mention_resolved','sam resolved a report mention.','2026-05-08 16:26:53');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attachments`
--

DROP TABLE IF EXISTS `attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `related_type` enum('job','task','report','request') NOT NULL,
  `related_id` bigint NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `uploaded_by` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_attachments_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_attachments_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachments`
--

LOCK TABLES `attachments` WRITE;
/*!40000 ALTER TABLE `attachments` DISABLE KEYS */;
INSERT INTO `attachments` VALUES (1,'job',1,'approval-kcc-event.pdf','/uploads/jobs/approval-kcc-event.pdf','application/pdf',1,'2026-04-27 10:14:14'),(2,'job',2,'approval-musanze-tourism.pdf','/uploads/jobs/approval-musanze-tourism.pdf','application/pdf',1,'2026-04-27 10:14:14'),(3,'job',3,'approval-nyamata-community.pdf','/uploads/jobs/approval-nyamata-community.pdf','application/pdf',1,'2026-04-27 10:14:14'),(4,'task',2,'equipment-checklist.xlsx','/uploads/tasks/equipment-checklist.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',3,'2026-04-27 10:14:14'),(5,'report',6,'musanze-drone-preview.jpg','/uploads/reports/musanze-drone-preview.jpg','image/jpeg',5,'2026-04-27 10:14:14'),(6,'task',13,'doc (1).pdf','uploads/tasks/1778161144216-718106420.pdf','application/pdf',2,'2026-05-07 13:39:04'),(7,'task',13,'Apple_Developer_Program_License_Agreement_854R8GJUBL.pdf','uploads/tasks/1778161144217-325355745.pdf','application/pdf',2,'2026-05-07 13:39:04'),(8,'task',14,'Apple_Developer_Program_License_Agreement_854R8GJUBL.pdf','uploads/tasks/1778256994704-696995051.pdf','application/pdf',2,'2026-05-08 16:16:34');
/*!40000 ALTER TABLE `attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_categories`
--

DROP TABLE IF EXISTS `contact_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_categories`
--

LOCK TABLES `contact_categories` WRITE;
/*!40000 ALTER TABLE `contact_categories` DISABLE KEYS */;
INSERT INTO `contact_categories` VALUES (1,'photographer','2026-04-27 08:57:05','2026-04-27 08:57:05'),(2,'videographer','2026-04-27 08:57:05','2026-04-27 08:57:05'),(3,'client','2026-04-27 08:57:05','2026-04-27 08:57:05'),(4,'supplier','2026-04-27 08:57:05','2026-04-27 08:57:05'),(5,'driver','2026-04-27 08:57:05','2026-04-27 08:57:05'),(6,'designer','2026-04-27 08:57:05','2026-04-27 08:57:05'),(7,'other','2026-04-27 08:57:05','2026-04-27 08:57:05');
/*!40000 ALTER TABLE `contact_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `category_id` bigint NOT NULL,
  `custom_category` varchar(100) DEFAULT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_by` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_contacts_category` (`category_id`),
  KEY `fk_contacts_created_by` (`created_by`),
  KEY `idx_contacts_name` (`full_name`),
  CONSTRAINT `fk_contacts_category` FOREIGN KEY (`category_id`) REFERENCES `contact_categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_contacts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
INSERT INTO `contacts` VALUES (1,'NIYOGUSHIMWA Natanael','0781796824','nathanaelniyogushimwa@gmail.com',2,NULL,'kadgroup.com','Kigali',NULL,1,'2026-04-27 09:32:31','2026-04-27 09:32:31'),(2,'Eric Nkurunziza','+250788200001','eric.nkurunziza@example.rw',3,NULL,'Kigali Events Ltd','Kigali, Rwanda','Client representative for event coverage projects.',1,'2026-04-27 10:14:14','2026-04-27 10:14:14'),(3,'Grace Mukeshimana','+250788200002','grace.mukeshimana@example.rw',1,NULL,'Freelance Photographer','Remera, Kigali','Available for outdoor photography jobs.',1,'2026-04-27 10:14:14','2026-04-27 10:14:14'),(4,'Bosco Tuyisenge','+250788200003','bosco.tuyisenge@example.rw',4,NULL,'Kigali Media Supplies','Kicukiro, Kigali','Supplier of camera stands and lighting tools.',1,'2026-04-27 10:14:14','2026-04-27 10:14:14'),(5,'Claudine Uwera','+250788200004','claudine.uwera@example.rw',2,NULL,'Vision Media Rwanda','Musanze, Rwanda','Videographer based in Northern Province.',1,'2026-04-27 10:14:14','2026-04-27 10:14:14'),(6,'Samuel Kwizera','+250788200005','samuel.kwizera@example.rw',7,'Tour Guide','Musanze Tours','Musanze, Rwanda','Local tour guide for tourism video projects.',1,'2026-04-27 10:14:14','2026-04-27 10:14:14');
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_categories`
--

DROP TABLE IF EXISTS `document_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_document_categories_created_by` (`created_by`),
  KEY `idx_document_categories_status` (`status`),
  CONSTRAINT `fk_document_categories_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_categories`
--

LOCK TABLES `document_categories` WRITE;
/*!40000 ALTER TABLE `document_categories` DISABLE KEYS */;
INSERT INTO `document_categories` VALUES (1,'Approval Documents','Official approval and authorization files.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(2,'Contracts','Client, supplier, and project contracts.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(3,'Invoices','Invoices and billing documents.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(6,'Field Photos','Field images and site evidence.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(7,'Meeting Notes','Meeting minutes and notes.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(8,'Permits','Permits and compliance documents.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(9,'Other','General project documents.','active',1,'2026-05-07 14:23:49','2026-05-07 14:23:49'),(10,'Reports','Formal reports and project submissions.','active',1,'2026-05-07 15:23:05','2026-05-07 15:23:05'),(11,'Contraact Doc','sdfgdfg','active',1,'2026-05-08 16:07:45','2026-05-08 16:07:45');
/*!40000 ALTER TABLE `document_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `original_file_name` varchar(255) NOT NULL,
  `google_drive_file_id` varchar(255) NOT NULL,
  `google_drive_file_url` text,
  `google_drive_folder_id` varchar(255) DEFAULT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `uploaded_by` bigint NOT NULL,
  `status` enum('pending_approval','approved','rejected') DEFAULT 'pending_approval',
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_documents_job` (`job_id`),
  KEY `fk_documents_category` (`category_id`),
  KEY `fk_documents_reviewed_by` (`reviewed_by`),
  KEY `idx_documents_status` (`status`),
  KEY `idx_documents_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_documents_category` FOREIGN KEY (`category_id`) REFERENCES `document_categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_documents_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_documents_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_documents_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES (1,4,9,'sdfasdfasd',NULL,'doc (1).pdf','local-1778164889208-964137584','/uploads/documents/1778164889199-844431701.pdf',NULL,'application/pdf',93462,2,'approved',1,'2026-05-07 16:45:34',NULL,'2026-05-07 14:41:29','2026-05-07 14:45:34'),(2,5,11,'Contract on Rab project',NULL,'Apple_Developer_Program_License_Agreement_854R8GJUBL.pdf','local-1778256509493-586627539','/uploads/documents/1778256509476-398471863.pdf',NULL,'application/pdf',727619,1,'approved',1,'2026-05-08 18:09:19',NULL,'2026-05-08 16:08:29','2026-05-08 16:09:19');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `google_drive_settings`
--

DROP TABLE IF EXISTS `google_drive_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `google_drive_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `connected_email` varchar(150) DEFAULT NULL,
  `root_folder_id` varchar(255) DEFAULT NULL,
  `pending_folder_id` varchar(255) DEFAULT NULL,
  `approved_folder_id` varchar(255) DEFAULT NULL,
  `rejected_folder_id` varchar(255) DEFAULT NULL,
  `status` enum('connected','disconnected') DEFAULT 'disconnected',
  `configured_by` bigint DEFAULT NULL,
  `configured_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_google_drive_settings_configured_by` (`configured_by`),
  CONSTRAINT `fk_google_drive_settings_configured_by` FOREIGN KEY (`configured_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `google_drive_settings`
--

LOCK TABLES `google_drive_settings` WRITE;
/*!40000 ALTER TABLE `google_drive_settings` DISABLE KEYS */;
INSERT INTO `google_drive_settings` VALUES (1,'movepromotion1@gmail.com',NULL,NULL,NULL,NULL,'connected',1,'2026-05-07 16:45:23','2026-05-07 14:45:23','2026-05-07 14:45:23');
/*!40000 ALTER TABLE `google_drive_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_contacts`
--

DROP TABLE IF EXISTS `job_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_contacts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_id` bigint NOT NULL,
  `contact_id` bigint NOT NULL,
  `role_description` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_job_contacts_job` (`job_id`),
  KEY `fk_job_contacts_contact` (`contact_id`),
  CONSTRAINT `fk_job_contacts_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_contacts_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_contacts`
--

LOCK TABLES `job_contacts` WRITE;
/*!40000 ALTER TABLE `job_contacts` DISABLE KEYS */;
INSERT INTO `job_contacts` VALUES (1,1,1,'Client representative','2026-04-27 10:14:14'),(2,1,3,'Equipment supplier','2026-04-27 10:14:14'),(3,2,5,'Local tour guide','2026-04-27 10:14:14'),(4,2,4,'Local videographer contact','2026-04-27 10:14:14'),(5,3,1,'Client communication contact','2026-04-27 10:14:14');
/*!40000 ALTER TABLE `job_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_code` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `approval_document` varchar(255) DEFAULT NULL,
  `created_by` bigint NOT NULL,
  `status` enum('pending','ongoing','completed_pending_approval','completed','rejected','cancelled') DEFAULT 'pending',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `marked_completed_by` bigint DEFAULT NULL,
  `marked_completed_at` datetime DEFAULT NULL,
  `completion_note` text,
  `approved_by` bigint DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approval_comment` text,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_code` (`job_code`),
  KEY `fk_jobs_created_by` (`created_by`),
  KEY `fk_jobs_marked_completed_by` (`marked_completed_by`),
  KEY `fk_jobs_approved_by` (`approved_by`),
  KEY `idx_jobs_status` (`status`),
  CONSTRAINT `fk_jobs_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_jobs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_jobs_marked_completed_by` FOREIGN KEY (`marked_completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES (1,'001','RBC Documentary','This is the ocumentary we have to make for rbc it is based on the project they have.','uploads/jobs/1777282296204-355562334.pdf',1,'ongoing','2026-04-27','2026-04-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 09:31:36','2026-04-27 09:32:14'),(2,'JOB-2026-0001','Kigali Convention Centre Event Coverage','Full photo and video coverage for a business conference at Kigali Convention Centre.','/uploads/jobs/approval-kcc-event.pdf',1,'ongoing','2026-04-20','2026-04-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(3,'JOB-2026-0002','Musanze Tourism Promotion Shoot','Create tourism promotional photos and videos around Musanze and Volcanoes National Park area.','/uploads/jobs/approval-musanze-tourism.pdf',1,'ongoing','2026-04-22','2026-05-05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(4,'JOB-2026-0003','Nyamata Community Project Documentation','Document community development activities in Nyamata, Bugesera District.','/uploads/jobs/approval-nyamata-community.pdf',1,'completed','2026-04-10','2026-04-25',NULL,NULL,NULL,1,'2026-04-27 16:46:42','Approved from dashboard.','2026-04-27 16:46:42','2026-04-27 10:14:13','2026-04-27 14:46:42'),(5,'019203','Shooting RAB Project','This is the project of shooting.','uploads/jobs/1778159388704-154480719.pdf',1,'ongoing','2026-05-07','2026-05-14',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-05-07 13:09:48','2026-05-07 13:10:54');
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_mentions`
--

DROP TABLE IF EXISTS `report_mentions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_mentions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `mentioned_by` bigint NOT NULL,
  `mentioned_user_id` bigint NOT NULL,
  `message` text NOT NULL,
  `status` enum('unread','read','resolved') DEFAULT 'unread',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mention_report` (`report_id`),
  KEY `fk_mention_by` (`mentioned_by`),
  KEY `fk_mention_user` (`mentioned_user_id`),
  CONSTRAINT `fk_mention_by` FOREIGN KEY (`mentioned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mention_report` FOREIGN KEY (`report_id`) REFERENCES `task_daily_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mention_user` FOREIGN KEY (`mentioned_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_mentions`
--

LOCK TABLES `report_mentions` WRITE;
/*!40000 ALTER TABLE `report_mentions` DISABLE KEYS */;
INSERT INTO `report_mentions` VALUES (1,3,3,6,'Please prepare the big camera stand for tomorrow because the small stand has a problem.','unread','2026-04-27 10:14:14','2026-04-27 10:14:14'),(2,15,2,9,'we need another camera','resolved','2026-05-08 16:22:44','2026-05-08 16:26:53');
/*!40000 ALTER TABLE `report_mentions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_requests`
--

DROP TABLE IF EXISTS `report_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `requested_by` bigint NOT NULL,
  `requested_to` bigint NOT NULL,
  `request_type` enum('tool','support','approval','information','other') DEFAULT 'other',
  `title` varchar(255) NOT NULL,
  `description` text,
  `status` enum('pending','in_progress','resolved','rejected') DEFAULT 'pending',
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_request_report` (`report_id`),
  KEY `fk_request_by` (`requested_by`),
  KEY `fk_request_to` (`requested_to`),
  KEY `idx_report_requests_status` (`status`),
  CONSTRAINT `fk_request_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_request_report` FOREIGN KEY (`report_id`) REFERENCES `task_daily_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_request_to` FOREIGN KEY (`requested_to`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_requests`
--

LOCK TABLES `report_requests` WRITE;
/*!40000 ALTER TABLE `report_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `report_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','2026-04-27 08:57:05','2026-04-27 08:57:05'),(2,'staff','2026-04-27 08:57:05','2026-04-27 08:57:05');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_daily_reports`
--

DROP TABLE IF EXISTS `task_daily_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_daily_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `report_date` date NOT NULL,
  `activity_done` text NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reports_task` (`task_id`),
  KEY `fk_reports_user` (`user_id`),
  KEY `idx_reports_date` (`report_date`),
  CONSTRAINT `fk_reports_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_daily_reports`
--

LOCK TABLES `task_daily_reports` WRITE;
/*!40000 ALTER TABLE `task_daily_reports` DISABLE KEYS */;
INSERT INTO `task_daily_reports` VALUES (1,1,2,'2026-04-20','Held meeting with client and confirmed the full event program.','Kigali Convention Centre','Client requested both photography and short highlight video.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(2,2,3,'2026-04-21','Checked available cameras, batteries and lights.','Kacyiru Office','Two batteries need charging before field work.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(3,2,3,'2026-04-22','Prepared camera kits and checked stands.','Kacyiru Office','The small camera stand has a problem. @Patrick please prepare the big camera stand for tomorrow.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(4,5,2,'2026-04-22','Visited Musanze town and selected possible shooting points.','Musanze','Good locations found near hotels and main road.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(5,6,5,'2026-04-24','Captured first drone shots around Musanze hills.','Musanze','Weather was cloudy but usable.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(6,8,4,'2026-04-12','Captured community activity photos.','Nyamata, Bugesera','Community members were cooperative.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(7,9,5,'2026-04-18','Recorded beneficiary interviews.','Nyamata, Bugesera','Audio quality was good.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(8,10,3,'2026-04-24','Organized final media folders and shared preview files.','Kacyiru Office','All files are ready for admin review.','2026-04-27 10:14:14','2026-04-27 10:14:14'),(13,13,2,'2026-05-07','I have colected the ideas on what we are going to do.','Gikondo','All the things has been done collcetely','2026-05-07 13:16:06','2026-05-07 13:16:06'),(14,14,2,'2026-05-08','sdgfgsdfg','sdfgsdfg','dfgsdfg','2026-05-08 16:11:34','2026-05-08 16:11:34'),(15,15,2,'2026-05-08','Shooting','Musanze swamp','skld;jkasdf','2026-05-08 16:22:44','2026-05-08 16:22:44');
/*!40000 ALTER TABLE `task_daily_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_id` bigint NOT NULL,
  `parent_task_id` bigint DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `assigned_by` bigint NOT NULL,
  `assigned_to` bigint NOT NULL,
  `status` enum('assigned','ongoing','completed','cancelled') DEFAULT 'assigned',
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_by` bigint DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `completion_note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tasks_job` (`job_id`),
  KEY `fk_tasks_parent` (`parent_task_id`),
  KEY `fk_tasks_assigned_by` (`assigned_by`),
  KEY `fk_tasks_completed_by` (`completed_by`),
  KEY `idx_tasks_status` (`status`),
  KEY `idx_tasks_assigned_to` (`assigned_to`),
  CONSTRAINT `fk_tasks_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tasks_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tasks_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_parent` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,1,NULL,'Preparing the job scedure',NULL,1,2,'assigned','2026-04-27','2026-04-30',NULL,NULL,NULL,'2026-04-27 09:32:14','2026-04-27 09:32:14'),(2,1,NULL,'Pre-production meeting','Meet client and confirm event coverage requirements.',1,2,'completed','2026-04-20','2026-04-20',2,'2026-04-20 17:00:00','Client requirements confirmed.','2026-04-27 10:14:13','2026-04-27 10:14:13'),(3,1,NULL,'Camera equipment preparation','Prepare cameras, batteries, lights, memory cards and stands.',1,3,'ongoing','2026-04-21','2026-04-23',NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(4,1,NULL,'Event photography','Capture event photos during the conference.',1,4,'assigned','2026-04-24','2026-04-26',NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(5,1,NULL,'Event video recording','Record main event sessions and interviews.',1,5,'assigned','2026-04-24','2026-04-26',NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(6,2,NULL,'Location scouting in Musanze','Visit selected tourism locations and prepare shooting plan.',1,2,'completed','2026-04-22','2026-04-23',2,'2026-04-23 18:20:00','Locations selected successfully.','2026-04-27 10:14:13','2026-04-27 10:14:13'),(7,2,NULL,'Drone video capture','Capture drone videos of tourism attractions.',1,5,'ongoing','2026-04-24','2026-04-29',NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(8,2,NULL,'Tour guide interview','Interview local tour guides and visitors.',1,4,'assigned','2026-04-26','2026-04-30',NULL,NULL,NULL,'2026-04-27 10:14:13','2026-04-27 10:14:13'),(9,3,NULL,'Community activity photos','Take photos of community work activities in Nyamata.',1,4,'completed','2026-04-10','2026-04-15',4,'2026-04-15 16:00:00','All photos captured.','2026-04-27 10:14:13','2026-04-27 10:14:13'),(10,3,NULL,'Beneficiary interview videos','Record short interviews with project beneficiaries.',1,5,'completed','2026-04-16','2026-04-20',5,'2026-04-20 17:30:00','Interview videos completed.','2026-04-27 10:14:13','2026-04-27 10:14:13'),(11,3,NULL,'Final media organization','Organize photos and videos for client review.',1,3,'completed','2026-04-21','2026-04-24',3,'2026-04-24 15:00:00','Files organized and submitted.','2026-04-27 10:14:13','2026-04-27 10:14:13'),(12,4,NULL,'aSHGDYasdjasD','jgfcghdjksad',1,2,'ongoing','2026-04-27','2026-04-28',NULL,NULL,NULL,'2026-04-27 16:19:43','2026-04-29 14:53:34'),(13,5,NULL,'Creating the script','This is creating fo the script that will be used in the background of the video',1,2,'completed','2026-05-07','2026-05-09',2,'2026-05-07 15:39:04','This documents outline the completion please.','2026-05-07 13:10:54','2026-05-07 13:39:04'),(14,5,NULL,'Interview from kigali leader','sdfgdfgsdfg',1,2,'completed','2026-05-08','2026-05-10',2,'2026-05-08 18:16:34','dfsgf','2026-05-08 16:06:52','2026-05-08 16:16:34'),(15,5,NULL,'Shooting musanze fammers',NULL,1,2,'ongoing','2026-05-08','2026-05-10',NULL,NULL,NULL,'2026-05-08 16:21:55','2026-05-08 16:22:05');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'System Admin','admin@jobmanagement.local',NULL,'$2b$10$5A7V.9ZQkcHqnhKoctnxMOyDBdujgY6mTP.LcziE5Yq1hDJ1Nmrmu','active','2026-04-27 09:24:21','2026-04-27 09:24:21'),(2,2,'NIYOGUSHIMWA Natanael','nathanaelniyogushimwa@gmail.com','0781796824','$2b$10$cjBtSRz.H228DFMcng6kIOqc3PysiR6chclBwy7Ck1QyEBUaEWHHu','active','2026-04-27 09:27:59','2026-04-27 09:27:59'),(3,1,'Nathan Admin','admin@jobms.rw','+250788100001','$2b$10$samplehashedpassword','active','2026-04-27 10:14:13','2026-04-27 10:14:13'),(4,2,'Aline Uwase','aline.uwase@jobms.rw','+250788100002','$2b$10$samplehashedpassword','active','2026-04-27 10:14:13','2026-04-27 10:14:13'),(5,2,'Emmy Niyonzima','emmy.niyonzima@jobms.rw','+250788100003','$2b$10$samplehashedpassword','active','2026-04-27 10:14:13','2026-04-27 10:14:13'),(6,2,'Jean Claude Mugisha','jean.mugisha@jobms.rw','+250788100004','$2b$10$samplehashedpassword','active','2026-04-27 10:14:13','2026-04-27 10:14:13'),(7,2,'Diane Mukamana','diane.mukamana@jobms.rw','+250788100005','$2b$10$samplehashedpassword','active','2026-04-27 10:14:13','2026-04-27 10:14:13'),(8,2,'Patrick Habimana','patrick.habimana@jobms.rw','+250788100006','$2b$10$samplehashedpassword','active','2026-04-27 10:14:13','2026-04-27 10:14:13'),(9,2,'sam','sam@gmail.com','0724728389','$2b$10$cjBtSRz.H228DFMcng6kIOqc3PysiR6chclBwy7Ck1QyEBUaEWHHu','active','2026-05-08 16:20:43','2026-05-08 16:25:15');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-18 14:51:36
