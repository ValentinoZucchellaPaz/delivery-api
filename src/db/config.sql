DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menus;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS users;

-- USERS: restaurant owners (+ restaurant entity & branches), customers, admins
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'restaurant_owner', 'admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TINYTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    avg_waiting_time INT DEFAULT 0, -- minutes
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- MENUS AND MENU ITEMS
CREATE TABLE menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TINYTEXT,
    price DECIMAL(10,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE, -- if out of stock restaurant can set it to false
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- ORDERS AND ORDER ITEMS
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    branch_id INT NOT NULL,

    estimated_delivery_time INT DEFAULT 0, -- minutes, set by restaurant based on avg_waiting_time
    actual_delivery_time INT DEFAULT 0, -- minutes, set when delivered
    status ENUM('preparing', 'on_the_way', 'delivered', 'cancelled') DEFAULT 'preparing',
    
    delivery_address VARCHAR(255) NOT NULL,

    -- order_discount DECIMAL(10,2) DEFAULT 0, -- cupons or promotions (not implemented yet)
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('credit_card', 'debit_card', 'cash', 'online_payment') DEFAULT 'cash',
    paid BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL, -- price at the time of order, can be lower than current menu price if there's any discount
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- VIEWS

-- Active orders for branches (status 'preparing' or 'on_the_way') -- view or make backend query?
CREATE VIEW active_orders AS
SELECT
    o.id AS order_id,
    o.branch_id,
    o.status,
    o.delivery_address,
    o.total,
    o.payment_method,
    o.created_at
FROM orders o
JOIN branches b ON o.branch_id = b.id
WHERE o.status IN ('preparing', 'on_the_way');


-- Customers (active users with role 'customer')
CREATE VIEW active_customers AS
SELECT id, name, email
FROM users
WHERE active = TRUE AND role = 'customer';

-- Restaurants with owner names
CREATE VIEW restaurant_overview AS
SELECT r.id, r.name, u.name AS owner_name, u.id as owner_id
FROM restaurants r
JOIN users u ON r.owner_id = u.id;


-- vista de sucursales activas
CREATE VIEW active_branches AS
SELECT id, restaurant_id, address, city, avg_waiting_time
FROM branches
WHERE active = TRUE;


-- INSERTAR USUARIO ADMIN BASE
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@god.com', '$2b$10$KIX/0G7o8nE6Fh3fQ9e5UuJ8y1Z6H7O8P9Q2R3S4T5U6V7W8X9Y0a', 'admin');
-- password: admin123


SELECT * FROM users;