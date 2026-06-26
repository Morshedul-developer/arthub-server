import express from "express";
import { fromNodeHeaders } from "better-auth/node";
import { User } from "../models/User.js";

export function profileRoutes({ requireAuth, auth }) {
  const router = express.Router();

  router.post("/sync", async (req, res) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const email = session.user.email;
    const name = req.body.name || session.user.name;
    const betterAuthUserId = session.user.id;
    const { role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      if (name) existing.name = name;
      existing.betterAuthUserId = betterAuthUserId;
      const safeRole = ["user", "artist"].includes(role) ? role : null;
      if (safeRole) existing.role = safeRole;
      await existing.save();
      return res.json(existing);
    }

    const safeRole = ["user", "artist"].includes(role) ? role : "user";
    const user = await User.create({ name, email, role: safeRole, betterAuthUserId });

    res.status(201).json(user);
  });

  router.get("/me", requireAuth, async (req, res) => {
    res.json(req.user);
  });

  router.patch("/me", requireAuth, async (req, res) => {
    const { name, avatarUrl } = req.body;

    if (name) req.user.name = name;
    if (avatarUrl) req.user.avatarUrl = avatarUrl;

    await req.user.save();
    res.json(req.user);
  });

  router.patch("/password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: false },
        headers: fromNodeHeaders(req.headers)
      });
      res.json({ message: "Password updated successfully." });
    } catch (err) {
      res.status(400).json({ message: err.message || "Password change failed. Check your current password." });
    }
  });

  return router;
}
