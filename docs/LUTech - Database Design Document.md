# LUTech - Database Design Document

## 1. Project Overview

LUTech is a MERN-stack e-commerce platform designed for selling technology products such as laptops, smartphones, headphones, smart watches, and accessories.

For Phase 1, the database is intentionally kept simple to support the Minimum Viable Product (MVP). The system consists of three collections:

- Users
- Products
- Carts

Additional collections such as Orders, Reviews, Wishlist, and Payments will be introduced in Phase 2.

---

# 2. Database Technology

## Database

MongoDB

## ODM

Mongoose

## Database Type

NoSQL Document Database

---

# 3. Users Collection

The Users collection stores customer and administrator information.

## Collection Name

```text
users
```

## Fields

| Field | Type | Required | Description |
|---------|---------|---------|---------|
| _id | ObjectId | Yes | Unique user identifier |
| name | String | Yes | Full name of the user |
| email | String | Yes | User email address |
| password | String | Yes | User password (hashed) |
| role | String | Yes | User role (customer/admin) |
| createdAt | Date | Yes | Account creation timestamp |

## Sample Document

```json
{
  "_id": "64abc123",
  "name": "Bishal Dhar",
  "email": "bishal@gmail.com",
  "password": "$2b$10$examplehashedpassword",
  "role": "customer",
  "createdAt": "2026-09-01T10:00:00Z"
}
```

## User Roles

### Customer

- Browse products
- View product details
- Register
- Login
- Manage cart

### Admin

- Add products
- Update products
- Delete products
- Manage product inventory

---

# 4. Products Collection

The Products collection stores all products available in LUTech.

## Collection Name

```text
products
```

## Fields

| Field | Type | Required | Description |
|---------|---------|---------|---------|
| _id | ObjectId | Yes | Unique product identifier |
| name | String | Yes | Product name |
| description | String | Yes | Product description |
| category | String | Yes | Product category |
| price | Number | Yes | Product price |
| stock | Number | Yes | Available stock quantity |
| image | String | Yes | Product image URL |
| createdAt | Date | Yes | Product creation timestamp |

## Sample Document

```json
{
  "_id": "64prod123",
  "name": "Dell Inspiron 15",
  "description": "15-inch laptop with Intel Core i5 processor.",
  "category": "Laptop",
  "price": 75000,
  "stock": 10,
  "image": "https://example.com/images/dell-inspiron.jpg",
  "createdAt": "2026-09-01T10:00:00Z"
}
```

## Supported Categories

- Laptop
- Smartphone
- Headphone
- Smart Watch
- Accessory

---

# 5. Carts Collection

The Carts collection stores products selected by users.

## Collection Name

```text
carts
```

## Fields

| Field | Type | Required | Description |
|---------|---------|---------|---------|
| _id | ObjectId | Yes | Unique cart identifier |
| userId | ObjectId | Yes | Reference to the user |
| items | Array | Yes | List of cart items |
| createdAt | Date | Yes | Cart creation timestamp |

## Cart Item Structure

```json
{
  "productId": "64prod123",
  "quantity": 2
}
```

## Sample Document

```json
{
  "_id": "64cart123",
  "userId": "64user123",
  "items": [
    {
      "productId": "64prod123",
      "quantity": 1
    },
    {
      "productId": "64prod456",
      "quantity": 2
    }
  ],
  "createdAt": "2026-09-01T10:00:00Z"
}
```

---

# 6. Database Relationships

## User to Cart

One user can have one cart.

```text
User
  │
  └──── Cart
```

## Cart to Products

One cart can contain multiple products.

```text
Cart
  │
  └──── Products
```

## Overall Relationship

```text
Users
   │
   ▼
 Carts
   │
   ▼
Products
```

---

# 7. Phase 1 Scope

The following features are supported by the current database design:

- User Registration
- User Login
- Product Listing
- Product Details
- Product Search
- Product CRUD Operations
- Shopping Cart Management

---

# 8. Future Enhancements (Phase 2)

The following collections may be added in future versions:

- Orders
- Reviews
- Wishlist
- Payments
- Shipping Information
- Product Ratings
- Coupons

---

# 9. Conclusion

The LUTech database design provides a simple, scalable, and maintainable foundation for the Phase 1 e-commerce platform. The three-collection structure supports all MVP requirements while allowing future expansion during Phase 2 development.