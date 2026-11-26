
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Review = require("../models/Review");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");

const run = async () => {
  try {
    console.log("Connecting to MongoDB Atlas...");

    await connectDB();

    console.log("Connected. Creating review indexes...");

    await Promise.all([
      Review.createIndexes(),
      Product.createIndexes(),
      User.createIndexes(),
      Order.createIndexes(),
    ]);

    console.log(
      "Review and seller metrics indexes created successfully."
    );
  } catch (error) {
    console.error(
      "Unable to create review indexes:",
      error
    );

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

run();
