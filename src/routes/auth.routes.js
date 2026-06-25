import express from "express";
import { signToken } from "../utils/jwt.js";

const COOKIE_NAME = "arthub_jwt";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: SEVEN_DAYS,
  path: "/"
};

export function authRoutes(sessionTools) {
  const router = express.Router();

  // Exchange current Better Auth session for a signed JWT stored in httpOnly cookie
  router.post("/token", sessionTools.requireAuth, async (req, res) => {
    try {
      const { _id, email, role, name } = req.user;

      const token = await signToken({
        userId: _id.toString(),
        email,
        role,
        name
      });

      res.cookie(COOKIE_NAME, token, cookieOptions);
      res.json({ ok: true, role });
    } catch (error) {
      console.error("JWT sign error:", error);
      res.status(500).json({ message: "Could not issue token." });
    }
  });

  // Clear the JWT cookie on logout
  router.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  });

  return router;
}
