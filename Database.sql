DROP DATABASE IF EXISTS `slots_casino`;
CREATE DATABASE IF NOT EXISTS `slots_casino`;
USE `slots_casino`;  

CREATE TABLE `user` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `dni` VARCHAR(9) UNIQUE,
  `nickname` VARCHAR(25) UNIQUE,
  `password` VARCHAR(255),
  `name` VARCHAR(100),
  `surname` VARCHAR(100),
  `birthdate` DATE,
  `pfp` VARCHAR(255) DEFAULT 'assets/user/default.jpg',
  `balance` BIGINT, -- guardar en centimos
  `cardname` VARCHAR(100),
  `cardnumber` VARCHAR(16),
  `cvv` VARCHAR(3),
  `expiration_date` DATE
);

CREATE TABLE `game` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100)
);

CREATE TABLE `sesion` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `startdate` TIMESTAMP,
  `finaldate` TIMESTAMP,
  `numplayers` INT,
  `userdni` VARCHAR(9),
  `gameid` INT,
  FOREIGN KEY (`userdni`) REFERENCES `user` (`dni`),
  FOREIGN KEY (`gameid`) REFERENCES `game` (`id`)
);

CREATE TABLE `transaction` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `balance` BIGINT, -- guardar en centimos
  `userdni` VARCHAR(9),
  `sesionid` INT,
  FOREIGN KEY (`userdni`) REFERENCES `user` (`dni`),
  FOREIGN KEY (`sesionid`) REFERENCES `sesion` (`id`)
);
