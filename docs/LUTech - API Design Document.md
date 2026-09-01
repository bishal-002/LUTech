# LUTech - API Design Document

## 1. Overview

This document defines the REST API endpoints used by the LUTech e-commerce platform.

The API follows REST principles and allows communication between:

```text
React Frontend
      ↓
Axios
      ↓
Express Backend
      ↓
MongoDB Database
```

Base URL:

```text
http://localhost:5000/api
```

---

# 2. Product APIs

The Product APIs allow administrators and customers to interact with product data.

---

## Get All Products

### Endpoint

```http
GET /api/products
```

### Purpose

Retrieve all available products.

### Used By

- Home Page
- Products Page

### Success Response

```json
[
  {
    "_id": "64prod123",
    "name": "Dell Inspiron 15",
    "category": "Laptop",
    "price": 75000,
    "stock": 10,
    "image": "https://example.com/image.jpg"
  }
]
```

---

## Get Single Product

### Endpoint

```http
GET /api/products/:id
```

### Purpose

Retrieve details of a specific product.

### Used By

- Product Details Page

### Example

```http
GET /api/products/64prod123
```

---

## Create Product

### Endpoint

```http
POST /api/products
```

### Purpose

Add a new product.

### Used By

- Admin Panel

### Request Body

```json
{
  "name": "Dell Inspiron 15",
  "description": "15-inch laptop",
  "category": "Laptop",
  "price": 75000,
  "stock": 10,
  "image": "https://example.com/image.jpg"
}
```

---

## Update Product

### Endpoint

```http
PUT /api/products/:id
```

### Purpose

Update an existing product.

### Used By

- Admin Panel

### Example

```http
PUT /api/products/64prod123
```

---

## Delete Product

### Endpoint

```http
DELETE /api/products/:id
```

### Purpose

Delete a product.

### Used By

- Admin Panel

### Example

```http
DELETE /api/products/64prod123
```

---

# 3. User APIs

The User APIs handle registration and login.

---

## Register User

### Endpoint

```http
POST /api/users/register
```

### Purpose

Create a new customer account.

### Request Body

```json
{
  "name": "Bishal Dhar",
  "email": "bishal@gmail.com",
  "password": "123456"
}
```

### Used By

- Register Page

---

## Login User

### Endpoint

```http
POST /api/users/login
```

### Purpose

Authenticate an existing user.

### Request Body

```json
{
  "email": "bishal@gmail.com",
  "password": "123456"
}
```

### Used By

- Login Page
- Admin Login Page

---

# 4. Cart APIs

The Cart APIs manage shopping cart functionality.

---

## Add To Cart

### Endpoint

```http
POST /api/cart
```

### Purpose

Add a product to the user's cart.

### Request Body

```json
{
  "userId": "64user123",
  "productId": "64prod123",
  "quantity": 1
}
```

### Used By

- Product Details Page

---

## Get User Cart

### Endpoint

```http
GET /api/cart/:userId
```

### Purpose

Retrieve all products inside a user's cart.

### Example

```http
GET /api/cart/64user123
```

### Used By

- Cart Page

---

## Remove Cart Item

### Endpoint

```http
DELETE /api/cart/:id
```

### Purpose

Remove a product from the cart.

### Example

```http
DELETE /api/cart/64cartitem123
```

### Used By

- Cart Page

---

# 5. API Summary Table

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | /api/products | Get all products |
| GET | /api/products/:id | Get single product |
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| POST | /api/users/register | Register user |
| POST | /api/users/login | Login user |
| POST | /api/cart | Add to cart |
| GET | /api/cart/:userId | Get user cart |
| DELETE | /api/cart/:id | Remove cart item |

---

# 6. Frontend and API Mapping

| Page | API Used |
|--------|----------|
| Home | GET /api/products |
| Products | GET /api/products |
| Product Details | GET /api/products/:id |
| Register | POST /api/users/register |
| Login | POST /api/users/login |
| Cart | POST /api/cart, GET /api/cart/:userId, DELETE /api/cart/:id |
| Admin Products | Product CRUD APIs |

---

# 7. Phase 1 Scope

The API design supports the following MVP features:

- Product Management (CRUD)
- User Registration
- User Login
- Product Browsing
- Product Details
- Shopping Cart Management
- Frontend and Backend Integration

---

# 8. Future APIs (Phase 2)

The following APIs may be added in future versions:

- Order APIs
- Review APIs
- Wishlist APIs
- Payment APIs
- User Profile APIs
- Admin Dashboard APIs

---

# 9. Conclusion

The LUTech API architecture provides a simple and maintainable REST-based communication layer between the React frontend and MongoDB database. The API scope is intentionally limited to MVP requirements, ensuring a manageable development process while leaving room for future expansion.