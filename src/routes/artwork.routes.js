import express from "express";
import { Artwork, Comment, Transaction, User } from "../models/index.js";

export function artworkRoutes({ requireAuth, requireRole }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const {
      search = "",
      category,
      min,
      max,
      sort = "newest",
      page = 1,
      limit = 8
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    if (category && category !== "All") query.category = category;
    if (min || max) {
      query.price = {};
      if (min) query.price.$gte = Number(min);
      if (max) query.price.$lte = Number(max);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      price_low: { price: 1 },
      price_high: { price: -1 }
    };

    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 24);
    const skip = (pageNumber - 1) * pageSize;

    const [items, total] = await Promise.all([
      Artwork.find(query)
        .populate("artist", "name email avatarUrl")
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(pageSize),
      Artwork.countDocuments(query)
    ]);

    res.json({
      items,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      total
    });
  });

  router.get("/featured", async (_req, res) => {
    const items = await Artwork.find({ status: "active" })
      .populate("artist", "name avatarUrl")
      .sort({ createdAt: -1 })
      .limit(6);

    res.json(items);
  });

  router.get("/top-artists", async (_req, res) => {
    const sales = await Transaction.aggregate([
      { $match: { type: "purchase", status: "paid", artist: { $ne: null } } },
      { $group: { _id: "$artist", sales: { $sum: 1 }, revenue: { $sum: "$amount" } } },
      { $sort: { sales: -1 } },
      { $limit: 3 }
    ]);

    const fallbackArtists = await User.find({ role: "artist" }).limit(3);
    const artists = sales.length
      ? await User.find({ _id: { $in: sales.map((item) => item._id) } })
      : fallbackArtists;

    res.json(artists.map((artist) => ({
      _id: artist._id,
      name: artist.name,
      email: artist.email,
      avatarUrl: artist.avatarUrl,
      sales: sales.find((item) => String(item._id) === String(artist._id))?.sales || 0
    })));
  });

  router.get("/:id", async (req, res) => {
    const artwork = await Artwork.findById(req.params.id).populate("artist", "name email avatarUrl");
    if (!artwork) return res.status(404).json({ message: "Artwork not found." });

    res.json(artwork);
  });

  router.post("/", requireAuth, requireRole(["artist", "admin"]), async (req, res) => {
    const { title, description, price, category, imageUrl } = req.body;

    const artwork = await Artwork.create({
      title,
      description,
      price,
      category,
      imageUrl,
      artist: req.user._id
    });

    res.status(201).json(artwork);
  });

  router.patch("/:id", requireAuth, requireRole(["artist", "admin"]), async (req, res) => {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) return res.status(404).json({ message: "Artwork not found." });

    const ownsArtwork = String(artwork.artist) === String(req.user._id);
    if (!ownsArtwork && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the owner artist can edit this artwork." });
    }

    Object.assign(artwork, req.body);
    await artwork.save();
    res.json(artwork);
  });

  router.delete("/:id", requireAuth, requireRole(["artist", "admin"]), async (req, res) => {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) return res.status(404).json({ message: "Artwork not found." });

    const ownsArtwork = String(artwork.artist) === String(req.user._id);
    if (!ownsArtwork && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the owner artist or admin can delete this artwork." });
    }

    await artwork.deleteOne();
    res.json({ message: "Artwork deleted." });
  });

  router.get("/:id/comments", async (req, res) => {
    const comments = await Comment.find({ artwork: req.params.id })
      .populate("user", "name avatarUrl")
      .sort({ createdAt: -1 });

    res.json(comments);
  });

  router.get("/:id/comment-permission", requireAuth, async (req, res) => {
    const hasPurchased = await Transaction.exists({
      artwork: req.params.id,
      buyer: req.user._id,
      type: "purchase",
      status: "paid"
    });

    const canComment = Boolean(hasPurchased) || req.user.role === "admin";

    res.json({
      canComment,
      reason: canComment
        ? "You can comment on this artwork."
        : "Only buyers who purchased this artwork can comment."
    });
  });

  router.post("/:id/comments", requireAuth, async (req, res) => {
    if (!req.body.comment?.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    const hasPurchased = await Transaction.exists({
      artwork: req.params.id,
      buyer: req.user._id,
      type: "purchase",
      status: "paid"
    });

    if (!hasPurchased && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only buyers who purchased this artwork can comment." });
    }

    const comment = await Comment.create({
      artwork: req.params.id,
      user: req.user._id,
      comment: req.body.comment.trim()
    });

    res.status(201).json(await comment.populate("user", "name avatarUrl"));
  });

  router.patch("/:artworkId/comments/:commentId", requireAuth, async (req, res) => {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (String(comment.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own comment." });
    }

    comment.comment = req.body.comment;
    await comment.save();
    res.json(comment);
  });

  router.delete("/:artworkId/comments/:commentId", requireAuth, async (req, res) => {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    if (String(comment.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own comment." });
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted." });
  });

  return router;
}
