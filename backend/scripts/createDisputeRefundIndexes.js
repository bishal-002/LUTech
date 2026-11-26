
require("dotenv").config();

const dns = require("dns");

// Use Google Public DNS for MongoDB Atlas SRV resolution.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Dispute = require("../models/Dispute");
const Refund = require("../models/Refund");
const SellerRecovery = require("../models/SellerRecovery");
const Payout = require("../models/Payout");

const run = async () => {
  try {
    console.log("Connecting to MongoDB Atlas...");

    await connectDB();

    console.log("Connected. Creating workflow indexes...");

    await Promise.all([
      Dispute.createIndexes(),
      Refund.createIndexes(),
      SellerRecovery.createIndexes(),
      Payout.createIndexes(),
    ]);

    console.log(
      "Dispute/refund workflow indexes created successfully."
    );
  } catch (error) {
    console.error(
      "Unable to create dispute/refund indexes:",
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
