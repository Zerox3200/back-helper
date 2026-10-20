import mongoose from "mongoose";

export const conn = async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/back-helper";

  try {
    await mongoose.connect(uri);
    console.log("✓ Connected to MongoDB");
  } catch (err) {
    console.error("✗ MongoDB connection failed:", err.message);
    throw err;
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;
