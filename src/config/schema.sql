--  migration to postrgres

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menus CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- SERIAL reemplaza AUTO_INCREMENT
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer', -- reemplazo ENUM con TEXT + CHECK
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (role IN ('customer', 'restaurant_owner', 'admin'))
);

-- RESTAURANTS
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT, -- TINYTEXT → TEXT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BRANCHES
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    avg_waiting_time INT DEFAULT 0, -- minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- MENUS
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- MENU ITEMS
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    menu_id INT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL, -- DECIMAL → NUMERIC
    available BOOLEAN DEFAULT TRUE
);

-- ORDERS
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    estimated_delivery_time INT DEFAULT 0, -- minutes
    actual_delivery_time INT DEFAULT 0, -- minutes
    status TEXT DEFAULT 'preparing',
    delivery_address VARCHAR(255) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('preparing', 'on_the_way', 'delivered', 'cancelled')),
    CHECK (payment_method IN ('credit_card', 'debit_card', 'cash', 'online_payment'))
);

-- ORDER ITEMS
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(10,2) NOT NULL
);

-- VIEWS

-- Active orders for branches
CREATE OR REPLACE VIEW active_orders AS
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

-- Active customers
CREATE OR REPLACE VIEW active_customers AS
SELECT id, name, email
FROM users
WHERE active = TRUE AND role = 'customer';

-- Restaurant overview (corrección: users.id es owner_id)
CREATE OR REPLACE VIEW restaurant_overview AS
SELECT r.id, r.name, u.name AS owner_name, u.id as owner_id
FROM restaurants r
JOIN users u ON r.user_id = u.id;

-- Active branches
CREATE OR REPLACE VIEW active_branches AS
SELECT id, restaurant_id, address, city, avg_waiting_time
FROM branches
WHERE active = TRUE;

-- INSERTAR USUARIO ADMIN BASE
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@god.com', '$2b$10$CXv3GGdhKJFSSOaPB79eDe9t61lqGcy93WNZbXJt9o/nPReyD/77a', 'admin'); -- password: admin123

-- Probar
SELECT * FROM users;
