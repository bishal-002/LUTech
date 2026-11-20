require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");

const PlatformSettings = require(
  "../models/PlatformSettings"
);

const AdminProfile = require(
  "../models/AdminProfile"
);

// ======================================================
// MIGRATE COMMISSION AND ADMIN PASSWORD TIMESTAMPS
// ======================================================

const migrateAdminIntegrations = async () => {
  try {
    await connectDB();

    // ----------------------------------------------
    // 1. COMMISSION FIELD MIGRATION
    // ----------------------------------------------

    const settingsCollection =
      PlatformSettings.collection;

    const settings = await settingsCollection.findOne({
      settingKey: "global",
    });

    if (settings) {
      const hasNewRate =
        settings.defaultCommissionRate !== undefined &&
        settings.defaultCommissionRate !== null;

      const hasOldRate =
        settings.commissionRate !== undefined &&
        settings.commissionRate !== null;

      if (hasNewRate && hasOldRate) {
        if (
          Number(settings.defaultCommissionRate) !==
          Number(settings.commissionRate)
        ) {
          throw new Error(
            "Both commission fields exist with different values. Resolve the conflicting values manually before continuing."
          );
        }

        await settingsCollection.updateOne(
          { _id: settings._id },
          {
            $unset: {
              commissionRate: "",
            },
          }
        );

        console.log(
          "Removed duplicate legacy commission field."
        );
      } else if (!hasNewRate && hasOldRate) {
        await settingsCollection.updateOne(
          {
            _id: settings._id,
            defaultCommissionRate: {
              $exists: false,
            },
          },
          {
            $rename: {
              commissionRate:
                "defaultCommissionRate",
            },
          }
        );

        console.log(
          "Commission field migrated successfully."
        );
      } else if (!hasNewRate && !hasOldRate) {
        await settingsCollection.updateOne(
          { _id: settings._id },
          {
            $set: {
              defaultCommissionRate: 5,
            },
          }
        );

        console.log(
          "Default commission rate initialized to 5."
        );
      } else {
        console.log(
          "Commission field is already migrated."
        );
      }
    } else {
      console.log(
        "No global settings document exists. The application will create it using schema defaults."
      );
    }

    // ----------------------------------------------
    // 2. BACKFILL EXISTING ADMIN PASSWORD TIMESTAMPS
    // ----------------------------------------------

    const adminProfileCollection =
      AdminProfile.collection;

    const migrationDate = new Date();

    const passwordTimestampResult =
      await adminProfileCollection.updateMany(
        {
          $or: [
            {
              "security.passwordChangedAt": {
                $exists: false,
              },
            },
            {
              "security.passwordChangedAt": null,
            },
          ],
        },
        {
          $set: {
            "security.passwordChangedAt":
              migrationDate,
          },
        }
      );

    console.log(
      "Administrator password timestamps initialized:",
      passwordTimestampResult.modifiedCount
    );

    console.log(
      "Administrator integration migration completed."
    );
  } catch (error) {
    console.error(
      "Administrator integration migration failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

migrateAdminIntegrations();