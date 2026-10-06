-- =====================================================
-- Flower Shop Database (MySQL / MariaDB for XAMPP)  -- v3
-- Customers can only pick flowers, wrapping and ribbon that exist in stock.
-- How to use: phpMyAdmin > Import tab > choose this file > Go
-- =====================================================

CREATE DATABASE IF NOT EXISTS flower_shop
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE flower_shop;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payment, custom_component, order_item, orders, cart_item, cart,
  stock_movement, inventory, product_color, product_variant, product,
  bouquet_recipe, addon, category,
  schedule_slot, promotion, customer, admin;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- Staff and customers ----------
CREATE TABLE admin (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Catalog ----------
-- A flower type, e.g. "Tulips Bouquet"
CREATE TABLE product (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  image_url   VARCHAR(255),
  stem_price  DECIMAL(10,2) NULL,         -- price per stem in the custom builder
  is_active   TINYINT(1) NOT NULL DEFAULT 1
);

-- A size/price option, e.g. "6 stems = 2,400"
CREATE TABLE product_variant (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  label      VARCHAR(40) NOT NULL,          -- Single, Double, 3 stems...
  stem_count INT NOT NULL CHECK (stem_count > 0),
  price      DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE (product_id, stem_count),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

-- A color option, e.g. "Tulips - Blue (+100 per stem)"
CREATE TABLE product_color (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  product_id         INT NOT NULL,
  color              VARCHAR(40) NOT NULL,
  surcharge_per_stem DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE (product_id, color),
  FOREIGN KEY (product_id) REFERENCES product(id)
);

-- Wrapping and ribbon choices, each with its own stock
CREATE TABLE addon (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  type          ENUM('wrapping','ribbon') NOT NULL,
  name          VARCHAR(80) NOT NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  qty_on_hand   INT NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  reorder_level INT NOT NULL DEFAULT 5,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE (type, name)
);

-- ---------- Inventory (counted in stems, per color) ----------
CREATE TABLE inventory (
  color_id      INT PRIMARY KEY,
  stems_on_hand INT NOT NULL DEFAULT 0 CHECK (stems_on_hand >= 0),
  reorder_level INT NOT NULL DEFAULT 20,
  FOREIGN KEY (color_id) REFERENCES product_color(id)
);

CREATE TABLE stock_movement (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  color_id    INT NULL,                 -- set for flowers
  addon_id    INT NULL,                 -- set for wrapping/ribbon
  admin_id    INT NULL,
  reason      ENUM('restock','spoilage','adjustment','sale') NOT NULL,
  stems_change INT NOT NULL,            -- stems, or pieces for addons
  note        VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (color_id) REFERENCES product_color(id),
  FOREIGN KEY (addon_id) REFERENCES addon(id),
  FOREIGN KEY (admin_id) REFERENCES admin(id),
  INDEX idx_movement_created (created_at)
);

-- ---------- Promotions and schedules ----------
CREATE TABLE promotion (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(40) NOT NULL UNIQUE,
  discount_type  ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  valid_until    DATE,
  is_active      TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE schedule_slot (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  slot_date    DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  slot_type    ENUM('pickup','delivery') NOT NULL,
  capacity     INT NOT NULL DEFAULT 5 CHECK (capacity > 0),
  booked_count INT NOT NULL DEFAULT 0,
  UNIQUE (slot_date, start_time, slot_type),
  CHECK (booked_count >= 0 AND booked_count <= capacity)
);

-- ---------- Cart ----------
CREATE TABLE cart (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  status      ENUM('active','checked_out') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id)
);

CREATE TABLE cart_item (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  cart_id        INT NOT NULL,
  variant_id     INT NULL,              -- NULL for a custom bouquet
  color_id       INT NULL,
  wrapping_id    INT NULL,
  ribbon_id      INT NULL,
  quantity       INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_custom      TINYINT(1) NOT NULL DEFAULT 0,
  custom_details TEXT,                  -- builder choices saved as JSON text
  FOREIGN KEY (cart_id)    REFERENCES cart(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variant(id),
  FOREIGN KEY (color_id)   REFERENCES product_color(id),
  FOREIGN KEY (wrapping_id) REFERENCES addon(id),
  FOREIGN KEY (ribbon_id)   REFERENCES addon(id)
);

-- ---------- Orders ----------
CREATE TABLE orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  customer_id      INT NOT NULL,
  slot_id          INT NOT NULL,
  promotion_id     INT NULL,
  fulfillment_type ENUM('pickup','delivery') NOT NULL,
  delivery_address VARCHAR(255),
  status           ENUM('pending','confirmed','preparing','ready',
                        'out_for_delivery','completed','cancelled') NOT NULL DEFAULT 'pending',
  total            DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id)  REFERENCES customer(id),
  FOREIGN KEY (slot_id)      REFERENCES schedule_slot(id),
  FOREIGN KEY (promotion_id) REFERENCES promotion(id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at)
);

CREATE TABLE order_item (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  variant_id   INT NULL,                -- NULL for a custom bouquet
  color_id     INT NULL,
  quantity     INT NOT NULL CHECK (quantity > 0),
  unit_price   DECIMAL(10,2) NOT NULL,  -- final price at time of sale (incl. color surcharge)
  is_custom    TINYINT(1) NOT NULL DEFAULT 0,
  wrapping_id  INT NULL,
  ribbon_id    INT NULL,
  card_message VARCHAR(255),
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variant(id),
  FOREIGN KEY (color_id)   REFERENCES product_color(id),
  FOREIGN KEY (wrapping_id) REFERENCES addon(id),
  FOREIGN KEY (ribbon_id)   REFERENCES addon(id)
);

-- Flowers inside a custom bouquet
CREATE TABLE custom_component (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  color_id      INT NOT NULL,
  stems         INT NOT NULL CHECK (stems > 0),
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id)      REFERENCES product_color(id)
);

CREATE TABLE payment (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  order_id  INT NOT NULL,
  method    ENUM('cash','card','gcash','bank_transfer') NOT NULL,
  amount    DECIMAL(10,2) NOT NULL,
  status    ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at   DATETIME NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- =====================================================
-- YOUR CATALOG
-- =====================================================

-- Replace the hash. Generate with PHP: echo password_hash('admin123', PASSWORD_DEFAULT);
INSERT INTO admin (name, email, password_hash)
VALUES ('Shop Admin', 'admin@flowershop.test', 'REPLACE_WITH_PHP_PASSWORD_HASH');

-- stem_price = price of ONE stem in the custom builder
-- (Lisianthus has no single stem, so 300 = 600 / 2 is an assumption; edit if needed)
INSERT INTO product (name, stem_price) VALUES
('Imported Rose Bouquet', 500),   -- 1
('Carnation',             250),   -- 2
('Tulips Bouquet',        500),   -- 3
('Lisianthus',            300),   -- 4
('Gerbera',               250);   -- 5

INSERT INTO product_color (product_id, color, surcharge_per_stem) VALUES
(1, 'Red',    0),     -- 1
(2, 'Pink',   0),     -- 2
(3, 'Pink',   0),     -- 3
(3, 'Blue',   100),   -- 4  (+100 per stem)
(4, 'Pink',   0),     -- 5
(4, 'Violet', 0),     -- 6
(5, 'Pink',   0),     -- 7
(5, 'Yellow', 0),     -- 8
(5, 'White',  0);     -- 9

INSERT INTO product_variant (product_id, label, stem_count, price) VALUES
-- Imported Rose Bouquet
(1, 'Single',    1,  500), (1, '3 stems',   3, 1000), (1, '6 stems',   6, 2000), (1, '12 stems', 12, 3500),
-- Carnation
(2, 'Single',    1,  250), (2, '3 stems',   3,  600), (2, '6 stems',   6, 1200),
(2, '8 stems',   8, 1600), (2, '10 stems', 10, 1800), (2, '12 stems', 12, 2200),
-- Tulips Bouquet
(3, 'Single',    1,  500), (3, 'Double',    2,  900), (3, 'Three''s',  3, 1300),
(3, '6''s',      6, 2400), (3, '12''s',    12, 4800), (3, '24''s',    24, 8000),
-- Lisianthus
(4, '2 stems',   2,  600), (4, '3 stems',   3,  800), (4, '6 stems',   6, 1500), (4, '12 stems', 12, 2500),
-- Gerbera
(5, 'Single',    1,  250), (5, '3''s',      3,  600), (5, '4''s',      4,  750),
(5, '6''s',      6, 1200), (5, '12''s',    12, 2400);

-- Starting stock in STEMS (sample numbers, change to your real stock)
INSERT INTO inventory (color_id, stems_on_hand, reorder_level) VALUES
(1, 100, 20), (2, 100, 20), (3, 100, 20), (4, 50, 20), (5, 60, 20),
(6, 60, 20), (7, 80, 20), (8, 80, 20), (9, 80, 20);

-- SAMPLE wrapping and ribbon. Replace with what you really stock and set real prices.
INSERT INTO addon (type, name, price, qty_on_hand, reorder_level) VALUES
('wrapping', 'Kraft Paper',        0, 30, 5),
('wrapping', 'White Wrap',         0, 30, 5),
('wrapping', 'Pink Wrap',          0, 30, 5),
('ribbon',   'Satin Ribbon - Pink',  0, 40, 5),
('ribbon',   'Satin Ribbon - White', 0, 40, 5),
('ribbon',   'Satin Ribbon - Red',   0, 40, 5);

INSERT INTO stock_movement (color_id, admin_id, reason, stems_change, note)
SELECT color_id, 1, 'restock', stems_on_hand, 'Opening stock' FROM inventory;

INSERT INTO stock_movement (addon_id, admin_id, reason, stems_change, note)
SELECT id, 1, 'restock', qty_on_hand, 'Opening stock' FROM addon;

INSERT INTO promotion (code, discount_type, discount_value, valid_until)
VALUES ('WELCOME10', 'percent', 10, '2026-12-31');

INSERT INTO schedule_slot (slot_date, start_time, end_time, slot_type, capacity) VALUES
('2026-10-06', '09:00', '11:00', 'pickup',   5),
('2026-10-06', '14:00', '16:00', 'pickup',   5),
('2026-10-06', '09:00', '11:00', 'delivery', 5),
('2026-10-06', '14:00', '16:00', 'delivery', 5),
('2026-10-07', '09:00', '11:00', 'pickup',   5),
('2026-10-07', '14:00', '16:00', 'pickup',   5),
('2026-10-07', '09:00', '11:00', 'delivery', 5),
('2026-10-07', '14:00', '16:00', 'delivery', 5);

-- What the custom builder should show (only items still in stock):
-- SELECT p.name, c.color, i.stems_on_hand FROM product_color c
--   JOIN product p ON p.id = c.product_id JOIN inventory i ON i.color_id = c.id
--   WHERE c.is_active = 1 AND i.stems_on_hand > 0;
-- SELECT type, name FROM addon WHERE is_active = 1 AND qty_on_hand > 0;

-- Quick check: all prices
-- SELECT p.name, v.label, v.stem_count, v.price
-- FROM product p JOIN product_variant v ON v.product_id = p.id ORDER BY p.id, v.stem_count;
