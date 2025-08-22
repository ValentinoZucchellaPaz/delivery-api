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
  - `role` (`customer`, `restaurant`, `admin`)
  - `passwordHash`

### 2. **Restaurant**
- Represents a restaurant on the platform.
- Attributes:
  - `id`
  - `name`
  - `menu` (list of menu items)
  - `basePreparationTime` (in minutes)
  - `isOpen`

### 3. **MenuItem**
- Represents an item on a restaurant’s menu.
- Attributes:
  - `id`
  - `restaurantId`
  - `name`
  - `price`

### 4. **Order**
- Represents a customer order.
- Attributes:
  - `id`
  - `customerId`
  - `restaurantId`
  - `items` (list of `{ menuItemId, quantity }`)
  - `status` (`pending`, `preparing`, `on_the_way`, `delivered`)
  - `totalPrice`
  - `estimatedTime`
  - `paid` (boolean, `true` once delivered)

---

## Order Flow

1. **Customer places an order** (`POST /orders`) selecting restaurant and menu items.
2. **System calculates total price and estimated delivery time** based on restaurant preparation time.
3. **Restaurant updates status**:
   - `preparing` → when order starts being prepared.
   - `on_the_way` → when delivery leaves the restaurant.
4. **Delivery completion**:
   - Restaurant (or delivery person using restaurant account) sets order to `delivered`.
   - Order is automatically marked as `paid`.

---

## API Endpoints (Draft)

### **Authentication**
- `POST /auth/register` → Register a user (customer or restaurant).
- `POST /auth/login` → Login and receive a JWT.

### **Restaurants**
- `GET /restaurants` → List all restaurants.
- `POST /restaurants` (admin) → Create a restaurant.
- `PATCH /restaurants/:id/menu` (restaurant) → Update restaurant menu.
- `PATCH /restaurants/:id/config` (restaurant) → Update base preparation time and availability.

### **Menu**
- `GET /restaurants/:id/menu` → Get menu items for a restaurant.

### **Orders**
- `POST /orders` (customer) → Create a new order.
- `GET /orders/:id` (customer/restaurant) → View order details.
- `PATCH /orders/:id/status` (restaurant) → Update order status (`preparing`, `on_the_way`, `delivered`).

### **Admin**
- `GET /orders` → View all ongoing orders (admin only).

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