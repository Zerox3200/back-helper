import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { appRouter } from "./src/app.router.js";
import { conn } from "./DB/connection.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5200;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || true,
    credentials: true,
  })
);

appRouter(app, express);

const start = async () => {
  try {
    await conn();
    app.listen(port, () => {
      console.log(`✓ Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();
