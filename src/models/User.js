import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    betterAuthUserId: {
      type: String,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ["user", "artist", "admin"],
      default: "user"
    },
    avatarUrl: String,
    subscriptionTier: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free"
    },
    purchaseCount: {
      type: Number,
      default: 0
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artwork"
      }
    ]
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
