import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artwork",
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600
    }
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", commentSchema);
