import express from "express";
import { Artwork, Transaction, User } from "../models/index.js";

export function dashboardRoutes({ requireAuth, requireRole }) {
  const router = express.Router();

  router.get("/user", requireAuth, async (req, res) => {
    const purchases = await Transaction.find({
      buyer: req.user._id,
      type: "purchase",
      status: "paid"
    })
      .populate("artwork", "title imageUrl price")
      .populate("artist", "name email")
      .sort({ createdAt: -1 });

    res.json({
      profile: req.user,
      purchases,
      boughtArtworks: purchases.map((purchase) => purchase.artwork).filter(Boolean)
    });
  });

  router.get("/artist", requireAuth, requireRole(["artist", "admin"]), async (req, res) => {
    const artworks = await Artwork.find({ artist: req.user._id }).sort({ createdAt: -1 });
    const sales = await Transaction.find({
      artist: req.user._id,
      type: "purchase"
    })
      .populate("artwork", "title imageUrl")
      .populate("buyer", "name email")
      .sort({ createdAt: -1 });

    res.json({ profile: req.user, artworks, sales });
  });

  router.get("/admin", requireAuth, requireRole(["admin"]), async (_req, res) => {
    const [users, artworks, transactions] = await Promise.all([
      User.find().sort({ createdAt: -1 }),
      Artwork.find().populate("artist", "name email").sort({ createdAt: -1 }),
      Transaction.find()
        .populate("artwork", "title category")
        .populate("buyer", "name email")
        .populate("artist", "name email")
        .sort({ createdAt: -1 })
    ]);

    const totalRevenue = transactions
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0);

    const byCategory = artworks.reduce((acc, artwork) => {
      acc[artwork.category] = (acc[artwork.category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      users,
      artworks,
      transactions,
      stats: {
        totalUsers: users.length,
        totalArtists: users.filter((user) => user.role === "artist").length,
        totalArtworksSold: artworks.filter((artwork) => artwork.status === "sold").length,
        totalRevenue
      },
      charts: {
        byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
        sales: transactions
          .filter((item) => item.type === "purchase")
          .slice(0, 7)
          .map((item) => ({
            date: item.createdAt.toISOString().slice(0, 10),
            amount: item.amount
          }))
      }
    });
  });

  router.patch("/admin/users/:id/role", requireAuth, requireRole(["admin"]), async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  });

  return router;
}
