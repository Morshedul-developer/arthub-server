import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["purchase", "subscription"],
      required: true,
      index: true
    },
    stripeSessionId: String,
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artwork"
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    subscriptionTier: {
      type: String,
      enum: ["pro", "premium", null],
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
