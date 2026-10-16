-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 16, 2026 at 06:58 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `flower_shop`
--

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `old_price` decimal(10,2) DEFAULT NULL,
  `emoji` varchar(16) NOT NULL DEFAULT '?',
  `color` varchar(20) NOT NULL DEFAULT '#ecd5bd',
  `tag` varchar(40) DEFAULT NULL,
  `sold_out` tinyint(1) NOT NULL DEFAULT 0,
  `note` varchar(255) DEFAULT NULL,
  `best_seller` tinyint(1) NOT NULL DEFAULT 0,
  `in_slideshow` tinyint(1) NOT NULL DEFAULT 1,
  `slideshow_quote` varchar(255) DEFAULT NULL,
  `slideshow_description` varchar(500) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `category` varchar(60) DEFAULT NULL,
  `occasion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `price`, `old_price`, `emoji`, `color`, `tag`, `sold_out`, `note`, `best_seller`, `in_slideshow`, `slideshow_quote`, `slideshow_description`, `image`, `category`, `occasion`) VALUES
(1, 'Imported Rose Bouquet (red)', 500.00, NULL, '🌸', '#ecd5bd', NULL, 0, 'Imported red roses', 1, 1, 'Red roses say what words sometimes can\'t.', 'Hand-arranged imported roses, a classic way to say I love you, congratulations or thank you.', NULL, 'Roses', NULL),
(2, 'Carnation Bouquet (pink)', 250.00, NULL, '🌸', '#efe0c6', NULL, 0, 'Pink carnations', 1, 1, 'Soft, ruffled and full of gentle affection.', 'Fresh, long-lasting blooms with soft ruffled petals, a sweet and affordable gift for any occasion.', NULL, 'Carnations', NULL),
(3, 'Tulips Bouquet (pink)', 500.00, NULL, '🌸', '#e8d6c0', NULL, 0, 'Pink, red, white or purple tulips. Blue tulips: add ₱100 per stem', 1, 1, 'Simple elegance that brings spring into any room.', 'Elegant, graceful stems arranged by hand to bring a fresh touch of spring to any home or celebration.', NULL, 'Tulips', NULL),
(4, 'Lisianthus Bouquet (pink or violet)', 600.00, NULL, '🌸', '#e2dcc8', NULL, 0, 'Available in pink or violet', 1, 1, 'Graceful blooms for the moments that deserve something special.', 'Delicate, rose-like blooms that make a refined gift for birthdays, anniversaries and special moments.', NULL, 'Lisianthus', NULL),
(5, 'Gerbera Bouquet (pink, yellow, white)', 250.00, NULL, '🌸', '#e2e0c4', NULL, 0, 'Choose pink, yellow or white', 0, 1, 'Bright, cheerful faces that turn any day into a happy one.', 'Cheerful, daisy-like flowers that brighten any room and bring instant smiles.', NULL, 'Gerbera', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_options`
--

CREATE TABLE `product_options` (
  `id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `label` varchar(60) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_options`
--

INSERT INTO `product_options` (`id`, `product_id`, `label`, `price`, `sort_order`) VALUES
(1, 1, 'Single', 500.00, 1),
(2, 1, '3 stems', 1000.00, 2),
(3, 1, '6 stems', 2000.00, 3),
(4, 1, '12 stems', 3500.00, 4),
(5, 2, 'Single', 250.00, 1),
(6, 2, '3 stems', 600.00, 2),
(7, 2, '6 stems', 1200.00, 3),
(8, 2, '8 stems', 1600.00, 4),
(9, 2, '10 stems', 1800.00, 5),
(10, 2, '12 stems', 2200.00, 6),
(11, 3, 'Single', 500.00, 1),
(12, 3, 'Double', 900.00, 2),
(13, 3, 'Three\'s', 1300.00, 3),
(14, 3, '6\'s', 2400.00, 4),
(15, 3, '12\'s', 4800.00, 5),
(16, 3, '24\'s', 8000.00, 6),
(17, 4, '2 stems', 600.00, 1),
(18, 4, '3 stems', 800.00, 2),
(19, 4, '6 stems', 1500.00, 3),
(20, 4, '12 stems', 2500.00, 4),
(21, 5, 'Single', 250.00, 1),
(22, 5, '3\'s', 600.00, 2),
(23, 5, '4\'s', 750.00, 3),
(24, 5, '6\'s', 1200.00, 4),
(25, 5, '12\'s', 2400.00, 5);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(80) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_options`
--
ALTER TABLE `product_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product_options`
--
ALTER TABLE `product_options`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `product_options`
--
ALTER TABLE `product_options`
  ADD CONSTRAINT `product_options_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
