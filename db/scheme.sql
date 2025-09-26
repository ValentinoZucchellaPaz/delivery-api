-- ===================================================
-- SCHEMA DELIVERY APP
-- ===================================================

DROP VIEW IF EXISTS active_orders CASCADE;

DROP VIEW IF EXISTS active_customers CASCADE;

DROP VIEW IF EXISTS restaurant_overview CASCADE;

DROP VIEW IF EXISTS active_branches CASCADE;

DROP TABLE IF EXISTS order_items CASCADE;

DROP TABLE IF EXISTS orders CASCADE;

DROP TABLE IF EXISTS menu_items CASCADE;

DROP TABLE IF EXISTS menus CASCADE;

DROP TABLE IF EXISTS branches CASCADE;

DROP TABLE IF EXISTS restaurants CASCADE;

DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;

DROP TYPE IF EXISTS order_status CASCADE;

DROP TYPE IF EXISTS payment_method CASCADE;

-- ===================================================
-- ENUMS
-- ===================================================
CREATE TYPE user_role AS ENUM ('customer', 'restaurant_owner', 'admin');
-- in the future there can be a `restaurant_branch`
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'on_the_way', 'delivered', 'cancelled');

CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'cash', 'online_payment');

-- ===================================================
-- USERS
-- ===================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_users_role_active ON users (role, active);

-- ===================================================
-- RESTAURANTS
-- ===================================================
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_user_id ON restaurants (user_id);

-- ===================================================
-- BRANCHES
-- ===================================================
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    restaurant_id INT NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    avg_waiting_time INT DEFAULT 0 CHECK (avg_waiting_time >= 0),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_branches_restaurant_id ON branches (restaurant_id);

CREATE INDEX idx_branches_city_active ON branches (city, active);

-- ===================================================
-- MENUS
-- ===================================================
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT unique_branch_menu_name UNIQUE (branch_id, name)
);

CREATE INDEX idx_menus_branch_id ON menus (branch_id);

-- ===================================================
-- MENU ITEMS
-- ===================================================
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    menu_id INT NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    available BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_menuitem_name_per_menu UNIQUE (menu_id, name)
);

CREATE INDEX idx_menu_items_menu_id ON menu_items (menu_id);

CREATE INDEX idx_menu_items_available ON menu_items (available);

-- ===================================================
-- ORDERS
-- ===================================================

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE,
    customer_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    branch_id INT NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    -- delivery info
    delivery_address VARCHAR(255) NOT NULL,
    -- timestamps for trazability
    estimated_ready_at timestamptz,
    accepted_at timestamptz,
    prepared_at timestamptz,
    sent_at timestamptz,
    delivered_at timestamptz,
    paid_at timestamptz,
    cancelled_at timestamptz,
    status order_status DEFAULT 'pending',
    -- $$$
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_method payment_method DEFAULT 'cash',
    paid BOOLEAN DEFAULT FALSE,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer_id ON orders (customer_id);

CREATE INDEX idx_orders_branch_id ON orders (branch_id);

CREATE INDEX idx_orders_status_created_at ON orders (status, created_at DESC);

-- ===================================================
-- ORDER ITEMS
-- ===================================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    menu_item_id INT NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);

CREATE INDEX idx_order_items_menu_item_id ON order_items (menu_item_id);

-- ===================================================
-- IDEMPOTENCY KEYS FOR ORDERS
-- ===================================================
CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    request_hash TEXT,
    response JSONB,
    order_id INT,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- REFRESH TOKENS
-- ===================================================
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- ===================================================
-- VIEWS
-- ===================================================
-- Active orders for branches
CREATE OR REPLACE VIEW active_orders AS
SELECT o.id AS order_id, o.branch_id, o.status, o.delivery_address, o.total, o.payment_method, o.created_at
FROM orders o
    JOIN branches b ON o.branch_id = b.id
WHERE
    o.status IN ('preparing', 'on_the_way');

-- Active customers
CREATE OR REPLACE VIEW active_customers AS
SELECT id, name, email
FROM users
WHERE
    active = TRUE
    AND role = 'customer';

-- Restaurant overview
CREATE OR REPLACE VIEW restaurant_overview AS
SELECT r.id, r.name, u.name AS owner_name, u.id as owner_id
FROM restaurants r
    JOIN users u ON r.user_id = u.id;

-- Active branches
CREATE OR REPLACE VIEW active_branches AS
SELECT
    id,
    restaurant_id,
    address,
    city,
    avg_waiting_time
FROM branches
WHERE
    active = TRUE;