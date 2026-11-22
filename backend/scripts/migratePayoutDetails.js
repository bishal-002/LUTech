require("dotenv").config();

const dns = require("dns");

// Use the same DNS configuration as server.js.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");

const connectDB = require("../config/db");

const User = require("../models/User");

const {
  getEncryptionKey,
  isEncryptedSensitiveValue,
  encryptSensitiveValue,
} = require("../services/payoutEncryptionService");

// ======================================================
// MIGRATE EXISTING PAYOUT ACCOUNT NUMBERS
// ======================================================

const migratePayoutDetails = async () => {
  try {
    // Validate the encryption key before connecting.
    getEncryptionKey();

    console.log("Connecting to MongoDB Atlas...");

    await connectDB();

    const cursor = User.collection.find({
      $or: [
        {
          "payout.accountNumber": {
            $exists: true,
            $nin: [null, ""],
          },
        },
        {
          "payout.mfsNumber": {
            $exists: true,
            $nin: [null, ""],
          },
        },
      ],
    });

    let scanned = 0;
    let modified = 0;

    for await (const user of cursor) {
      scanned += 1;

      const updates = {};

      const accountNumber =
        user.payout?.accountNumber;

      const mfsNumber =
        user.payout?.mfsNumber;

      // Encrypt bank account number if plaintext.
      if (
        typeof accountNumber === "string" &&
        accountNumber.trim() &&
        !isEncryptedSensitiveValue(accountNumber)
      ) {
        updates["payout.accountNumber"] =
          encryptSensitiveValue(accountNumber.trim());
      }

      // Encrypt MFS number if plaintext.
      if (
        typeof mfsNumber === "string" &&
        mfsNumber.trim() &&
        !isEncryptedSensitiveValue(mfsNumber)
      ) {
        updates["payout.mfsNumber"] =
          encryptSensitiveValue(mfsNumber.trim());
      }

      if (Object.keys(updates).length > 0) {
        const result =
          await User.collection.updateOne(
            { _id: user._id },
            { $set: updates }
          );

        if (result.modifiedCount === 1) {
          modified += 1;
        }
      }
    }

    await cursor.close();

    console.log(
      "Payout encryption migration completed successfully."
    );

    console.log("Users scanned:", scanned);
    console.log("Users modified:", modified);
  } catch (error) {
    console.error(
      "Payout encryption migration failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

migratePayoutDetails();