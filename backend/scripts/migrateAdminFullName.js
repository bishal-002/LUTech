
const dns = require("node:dns");

// Configure explicit DNS resolvers before MongoDB connection begins.
// This affects DNS lookups made by this Node.js process.
try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
} catch (error) {
    console.error("Unable to configure DNS servers:", error.message);
    process.exit(1);
}

require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");

const migrateAdminFullName = async () => {
    let connected = false;

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from the .env file.");
        }

        console.log("Connecting to MongoDB Atlas...");

        await connectDB();
        connected = true;

        console.log("MongoDB connected. Starting administrator migration...");

        const result = await User.updateMany(
            {
                role: "admin",
                $or: [
                    { fullName: { $exists: false } },
                    { fullName: null },
                    { fullName: "" },
                ],
            },
            [
                {
                    $set: {
                        fullName: "$name",
                    },
                },
            ],
            {
                updatePipeline: true,
            }
        );

        console.log("Administrator full-name migration completed.");
        console.log("Matched:", result.matchedCount);
        console.log("Modified:", result.modifiedCount);

        const remaining = await User.countDocuments({
            role: "admin",
            $or: [
                { fullName: { $exists: false } },
                { fullName: null },
                { fullName: "" },
            ],
        });

        console.log("Administrators still missing fullName:", remaining);

        if (remaining > 0) {
            throw new Error(
                "Some administrator accounts still have no fullName."
            );
        }

        console.log("Administrator full-name migration verified successfully.");
    } catch (error) {
        console.error(
            "Administrator full-name migration failed:",
            error.message
        );

        process.exitCode = 1;
    } finally {
        if (connected || mongoose.connection.readyState !== 0) {
            await mongoose.disconnect().catch((error) => {
                console.error("MongoDB disconnection error:", error.message);
            });
        }
    }
};

migrateAdminFullName();
