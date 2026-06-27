import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { connectDatabase } from "./config/database.js";
import { createAuth } from "./config/auth.js";
import { createSessionMiddleware } from "./middleware/session.js";
import { apiRoutes } from "./routes/index.js";

const app = express();
const port = Number(process.env.PORT || 5001);

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const { authDb } = await connectDatabase();
const auth = createAuth(authDb);
const sessionTools = { ...createSessionMiddleware(auth), auth };

// Respond to all OPTIONS preflight requests before any route handler runs
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json());
app.use(cookieParser());
app.use(sessionTools.attachUser);
app.use("/api", apiRoutes(sessionTools));

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Server error. Please try again." });
});

const server = app.listen(port, () => {
  console.log(`ArtHub server running on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set PORT to another value in server/.env, for example PORT=5001.`);
    process.exit(1);
  }

  throw error;
});
