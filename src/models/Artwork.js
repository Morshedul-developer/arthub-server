import mongoose from "mongoose";

const artworkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 1
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["active", "sold", "draft"],
      default: "active"
    }
  },
  { timestamps: true }
);

artworkSchema.index({ title: "text", category: "text" });

export const Artwork = mongoose.model("Artwork", artworkSchema);
