CREATE DATABASE IF NOT EXISTS ecommerce_store;
USE ecommerce_store;

DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS admin_accounts;
DROP TABLE IF EXISTS card_details;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS store_sections;
DROP TABLE IF EXISTS products;

CREATE TABLE store_sections (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  image_url LONGTEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  rating DECIMAL(2, 1) NOT NULL DEFAULT 4.5,
  stock INT NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  badge VARCHAR(40) NOT NULL DEFAULT ''
);

CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_reference VARCHAR(32) NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  email VARCHAR(140) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  state VARCHAR(80) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  payment_method VARCHAR(60) NOT NULL,
  notes TEXT NOT NULL,
  item_count INT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
);

CREATE TABLE support_tickets (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  email VARCHAR(140) NOT NULL,
  order_reference VARCHAR(80) NOT NULL DEFAULT '',
  issue_type VARCHAR(60) NOT NULL,
  subject VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  admin_response TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE admin_accounts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(140) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'sub_admin',
  created_by_admin_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE card_details (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(140) NOT NULL,
  cardholder_name VARCHAR(120) NOT NULL,
  card_number VARCHAR(16) NOT NULL,
  expiry VARCHAR(5) NOT NULL,
  card_brand VARCHAR(40) NOT NULL DEFAULT 'Card',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_card_details_account_card (
    account_email,
    card_number,
    expiry,
    cardholder_name
  )
);

INSERT INTO products (name, category, description, image_url, price, rating, stock, featured, badge) VALUES
('Heritage Leather Tote', 'Accessories', 'A roomy carry-all crafted for everyday errands, office runs, and polished travel days.', 'https://placehold.co/900x700/9c6644/fff7eb?text=Leather+Tote', 129.00, 4.8, 18, 1, 'Best Seller'),
('Sienna Lounge Chair', 'Furniture', 'Modern statement seating with a soft boucle texture and a sculpted silhouette.', 'https://placehold.co/900x700/6c8b74/f6f8f1?text=Lounge+Chair', 340.00, 4.6, 7, 1, 'Featured'),
('Studio Ceramic Set', 'Home Decor', 'Hand-finished ceramic pieces that bring warmth and personality to shelves and dining tables.', 'https://placehold.co/900x700/d9b26f/fff8ea?text=Ceramic+Set', 74.00, 4.7, 26, 0, 'New'),
('Aurora Table Lamp', 'Lighting', 'A brass-toned lamp with a linen shade for a calm, elevated glow in any room.', 'https://placehold.co/900x700/314e6e/f8f1dc?text=Table+Lamp', 92.00, 4.5, 15, 0, 'Warm Glow'),
('Motion Running Sneakers', 'Footwear', 'Lightweight trainers with breathable knit uppers and shock-absorbing soles.', 'https://placehold.co/900x700/2d6a4f/f2f8f2?text=Sneakers', 110.00, 4.4, 24, 1, 'Top Rated'),
('Sunday Knit Throw', 'Home Decor', 'A soft woven blanket designed for couches, reading corners, and gift-worthy comfort.', 'https://placehold.co/900x700/cb997e/fff6f1?text=Knit+Throw', 58.00, 4.9, 31, 0, 'Cozy Pick'),
('Northwind Jacket', 'Fashion', 'Weather-ready outerwear with clean lines, utility pockets, and an easy everyday fit.', 'https://placehold.co/900x700/1d3557/f1f5f9?text=Jacket', 168.00, 4.6, 12, 1, 'Limited'),
('Foundry Desk Organizer', 'Office', 'A minimalist tray system to keep notebooks, pens, and daily tools neatly in place.', 'https://placehold.co/900x700/7f5539/fff7f0?text=Desk+Organizer', 46.00, 4.3, 40, 0, 'Workspace');
