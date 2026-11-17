
require("dotenv").config();

const dns = require("dns");

// Keep this resolver override only if your network still needs it
// to resolve the MongoDB Atlas SRV record.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const testEmailRoute = require("./routes/testEmailRoute");
const adminRoutes = require("./routes/adminRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const sellerProfileRoutes = require("./routes/sellerProfileRoutes");
const customerOrderRoutes = require("./routes/customerOrderRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",").map((item) => item.trim())
      : true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (req, res) => {
  res.status(200).json({ message: "LUTech API Running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: require("mongoose").connection.readyState === 1
      ? "connected"
      : "disconnected",
  });
});

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/test-email", testEmailRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/seller/orders", orderRoutes);
app.use("/api/seller/profile", sellerProfileRoutes);
app.use("/api/orders", customerOrderRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error.",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
