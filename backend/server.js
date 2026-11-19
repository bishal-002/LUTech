require("dotenv").config();

const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

// ======================================================
// ROUTES
// ======================================================

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const testEmailRoute = require("./routes/testEmailRoute");

const adminRoutes = require("./routes/adminRoutes");
const adminProfileRoutes = require("./routes/adminProfileRoutes");
const adminSecurityRoutes = require("./routes/adminSecurityRoutes");
const platformSettingsRoutes = require("./routes/platformSettingsRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const productModerationRoutes = require("./routes/productModerationRoutes");

const sellerRoutes = require("./routes/sellerRoutes");
const sellerProfileRoutes = require("./routes/sellerProfileRoutes");

const orderRoutes = require("./routes/orderRoutes");
const customerOrderRoutes = require("./routes/customerOrderRoutes");

// ======================================================
// APPLICATION
// ======================================================

const app = express();

// ======================================================
// APPLICATION MIDDLEWARE
// ======================================================

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL
          .split(",")
          .map((item) => item.trim())
      : true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// ======================================================
// ROOT AND HEALTH
// ======================================================

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "LUTech API Running",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// ======================================================
// USER AND PUBLIC ROUTES
// ======================================================

app.use("/api/users", userRoutes);

app.use("/api/products", productRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/catalog", catalogRoutes);

app.use("/api/test-email", testEmailRoute);

// ======================================================
// ADMIN ROUTES
// Mount specific sub-routes before the general router.
// ======================================================

app.use(
  "/api/admin/security",
  adminSecurityRoutes
);

app.use(
  "/api/admin/profiles",
  adminProfileRoutes
);

app.use(
  "/api/admin/platform-settings",
  platformSettingsRoutes
);

app.use(
  "/api/admin/audit-logs",
  auditLogRoutes
);

app.use(
  "/api/admin/products",
  productModerationRoutes
);

// General administrator routes.
app.use("/api/admin", adminRoutes);

// ======================================================
// SELLER ROUTES
// ======================================================

app.use("/api/seller", sellerRoutes);

app.use(
  "/api/seller/profile",
  sellerProfileRoutes
);

// ======================================================
// ORDER ROUTES
// ======================================================

app.use(
  "/api/seller/orders",
  orderRoutes
);

app.use(
  "/api/orders",
  customerOrderRoutes
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
  return res.status(404).json({
    message: "API endpoint not found.",
  });
});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error.",
  });
});

// ======================================================
// SERVER STARTUP
// ======================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Application startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();

module.exports = app;