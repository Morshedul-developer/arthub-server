import express from "express";
import { artworkRoutes } from "./artwork.routes.js";
import { authRoutes } from "./auth.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { paymentRoutes } from "./payment.routes.js";
import { profileRoutes } from "./profile.routes.js";

export function apiRoutes(sessionTools) {
  const router = express.Router();

  router.use("/auth", authRoutes(sessionTools));
  router.use("/profile", profileRoutes(sessionTools));
  router.use("/artworks", artworkRoutes(sessionTools));
  router.use("/dashboard", dashboardRoutes(sessionTools));
  router.use("/checkout", paymentRoutes(sessionTools));

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "arthub-server" });
  });

  return router;
}
