# Couriers Delivery Service

## Overview
**Couriers Delivery Service** is a backend RESTful API designed for a food delivery platform.  
It allows **customers** to place orders from **restaurants**, calculates **total price** and **estimated delivery time**, and manages **order status updates** throughout the delivery process.  

The system focuses on:
- Managing **users** (customers, restaurants, and admins).
- Handling **restaurants**, their **menus**, and **preparation times**.
- Processing **orders**, updating their status from **pending** to **delivered**, and marking them as **paid** upon delivery.

---

## Core Entities

### 1. **User**
- Represents either a **customer**, **restaurant account**, or **admin**.
- Attributes:
  - `id`
  - `name`
  - `email`
  - `password_hash`
  - `role` (`customer`, `restaurant_owner`, `admin`)
  - `created_at`
  - `active`

### 2. **Restaurant Entities**
- A restaurant account can have many branches (but a branch can only belong to one restaurant), these branches have their own menu and waiting times
##### Restaurant:
- Attributes:
  - `id`
  - `user_id` (owner, FK)
  - `name`
  - `description` (optional)
  - `created_at`

##### Branch:
- Attributes:
  - `id`
  - `restaurant_id` (FK)
  - `address`
  - `city`
  - `avg_waiting_time`
  - `created_at`
  - `active`

### 3. **Menu Entities**

##### Menu
- Represents branch menu, these can be deactivate whenever the branch requires so.
- Attributes:
  - `id`
  - `branch_id` (FK)
  - `name`
  - `crated_at`
  - `active`

##### Menu Item
- Represents a menu item, which can only belong to one menu and its completely independent of it
- Atributes
  - `id`
  - `menu_id` (FK)
  - `name`
  - `description`
  - `price`
  - `available`

### 4. **Order Entities**
##### Order
- Represents a customer order.
- Attributes:
  - `id`
  - `customer_id` (user id, FK)
  - `branch_id` (FK)
  - `status` (`pending` (default), `preparing`, `on_the_way`, `delivered`, `cancelled`)
  - `payment_method` (`cash` (default), `credit_card`, `debit_card`, `online_payment`)
  - `delivery_address`
  - `estimated_delivery_time`
  - `actual_delivery_time`
  - `total`
  - `paid` (boolean, `true` once delivered)
  - `created_at`

##### Order Item
- Represents a item in an order, an item can only belong to one order
- Attributes:
  - `id`
  - `oder_id` (FK)
  - `menu_item_id` (FK)
  - `quantity`
  - `price`

### 4.1 **DB Diagram**
![Diagrama de base de datos](./public/db_diagram.png)

---

## Order Flow

1. **Customer places an order** (`POST /orders`) selecting restaurant and menu items.
2. **System calculates total price and estimated delivery time** based on restaurant preparation time.
3. **Restaurant updates status**:
   - `preparing` → when order starts being prepared.
   - `on_the_way` → when delivery leaves the restaurant.
4. **Delivery completion**:
   - Restaurant (or delivery person using restaurant account) sets order to `delivered`.
   - Order is automatically marked as `paid` (if it wasn't marked before).

---

## API Endpoints (Draft)

### **Authentication**
- `POST /auth/register` → Register a user (customer or restaurant).
- `POST /auth/login` → Login and receive a JWT.

### **Restaurants**
- `GET /restaurants` → List all restaurants (and branches).
- `POST /restaurants` (admin) → Create a restaurant (and branches).
- `POST /restaurants/:id` (admin) → Create a restaurant branch.
- `PATCH /restaurants/:id/:branch_id/menu` (restaurant) → Update restaurant branch menu.
- `PATCH /restaurants/:id/:branch_id/config` (restaurant) → Update base preparation time and availability of restaurant branch.

### **Menu**
- `GET /restaurants/:id/menu` → Get menu items for a restaurant.

### **Orders**
- `POST /orders` (customer) → Create a new order.
- `GET /orders/:id` (customer/restaurant) → View order details.
- `PATCH /orders/:id/status` (restaurant) → Update order status (`preparing`, `on_the_way`, `delivered`).

### **Admin Only**
- `GET /orders` → View all ongoing orders.
- `GET /users` → View all users.
- `GET /orders/:id` → Search user by id.

---

## Future Improvements
- **Payment Integration** (external payment gateway).
- **Notification System** (real-time updates via WebSockets).
- **Delivery Boy Accounts** (separate from restaurant accounts).

<!-- 
---

## Tech Stack
- **Node.js** (runtime)
- **Express.js** (framework)
- **JWT** (authentication)
- **Database**: MongoDB or PostgreSQL (TBD)
- **Swagger/OpenAPI** (API documentation)
- **Jest/Supertest** (testing) -->

---

## Installation & Usage
```bash
# Clone repository
git clone https://github.com/yourusername/couriers-delivery-service.git

# Install dependencies
npm install

# Start development server
npm run dev
```

> You can see a more detail documentation (made with Swagger) of the project in the `/api-docs` route