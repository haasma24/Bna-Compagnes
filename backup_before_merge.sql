-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: comapgneassurances
-- ------------------------------------------------------
-- Server version	8.0.41

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

--
-- Table structure for table `campaign`
--

DROP TABLE IF EXISTS `campaign`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaign` (
  `id_camp` bigint NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `channel` enum('SMS','EMAIL','IN_APP') DEFAULT NULL,
  `scheduled_by` bigint DEFAULT NULL,
  `status` enum('PENDING','SENT','FAILED') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `selection_criteria` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_camp`),
  KEY `campaign_ibfk_1` (`scheduled_by`),
  CONSTRAINT `campaign_ibfk_1` FOREIGN KEY (`scheduled_by`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaign`
--

LOCK TABLES `campaign` WRITE;
/*!40000 ALTER TABLE `campaign` DISABLE KEYS */;
/*!40000 ALTER TABLE `campaign` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client` (
  `contract_type` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `id_user` bigint DEFAULT NULL,
  KEY `id_user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client`
--

LOCK TABLES `client` WRITE;
/*!40000 ALTER TABLE `client` DISABLE KEYS */;
/*!40000 ALTER TABLE `client` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `communicationhistory`
--

DROP TABLE IF EXISTS `communicationhistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `communicationhistory` (
  `id` bigint NOT NULL,
  `date` date DEFAULT NULL,
  `channel` enum('SMS','EMAIL','IN_APP') DEFAULT NULL,
  `messageContent` text,
  `notificationId` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notificationId` (`notificationId`),
  CONSTRAINT `communicationhistory_ibfk_1` FOREIGN KEY (`notificationId`) REFERENCES `notification` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `communicationhistory`
--

LOCK TABLES `communicationhistory` WRITE;
/*!40000 ALTER TABLE `communicationhistory` DISABLE KEYS */;
/*!40000 ALTER TABLE `communicationhistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` bigint NOT NULL,
  `sentAt` date DEFAULT NULL,
  `deliveryStatus` enum('PENDING','SENT','FAILED') DEFAULT NULL,
  `channel` enum('SMS','EMAIL','IN_APP') DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id_user` bigint NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `inscription_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `role` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `passwordResetToken` varchar(255) DEFAULT NULL,
  `passwordResetExpires` bigint DEFAULT NULL,
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin','admin','2001-01-01','2025-06-16 11:29:52','admin@bna.com','+21612345678','Admin','$2b$10$TgMgDpn..XWbiLD2/X0t8eArN6pAsTy0Moamq61aqrfK0YTwGJBr.',NULL,NULL),(2,'asma','hammami','2001-10-24','2025-06-16 11:31:39','hammamiasma52@gmail.com','+21621613635','Client','$2b$10$LiW5RtOTvXbfjJs/wxbQGe8p8/s1NwA2KpK4TnylQqzxLlFJvwXkS',NULL,NULL),(3,'rihab','rihab','2001-01-01','2025-06-16 15:17:28','rihab@gmail.com','+21622663443','Client','$2b$10$Syq3PCqU62ix.Tx.N/049u9/uchK8.FXCgCOXagps0EUlAUMbwC/e',NULL,NULL),(4,'rihem','rihem','1974-11-25','2025-06-17 08:41:56','rihem@gmail.com','+21612345678','Employé','$2b$10$x2SB7mON6.AvinAfHk75jeJhtnlxtLh3d28UJUPO2.VLu7q6aYbui',NULL,NULL),(5,'test','steps','2001-06-17','2025-06-17 10:13:30','test@gmail.com','+21612345678','Employé','$2b$10$K0zivRA3JwsPFjxs4hJ7r.WBlQVUnm5ew53XErxX.JJxi2JJqMche',NULL,NULL),(11,'ines','anane','2001-10-24','2025-06-24 09:45:13','inesanane2001@gmail.com','+21687654321','Client','$2b$10$5pc2VEUwHv7UqN72R2G2XeTZcgVf/KkLladJX33tIoxz4VbErmPaS',NULL,NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-24 10:04:14
