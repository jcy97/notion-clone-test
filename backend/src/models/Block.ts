import mongoose, { Document, Schema } from "mongoose";

export interface IBlock extends Document {
  pageId: mongoose.Types.ObjectId;
  type: "text" | "heading" | "image" | "table";
  content: string;
  position: number;
  metadata?: {
    level?: number; // for heading
    url?: string; // for image
    caption?: string; // for image
    headers?: string[]; // for table
    rows?: string[][]; // for table
  };
  createdAt: Date;
  updatedAt: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "heading", "image", "table"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    position: {
      type: Number,
      required: true,
    },
    metadata: {
      level: { type: Number },
      url: { type: String },
      caption: { type: String },
      headers: [{ type: String }],
      rows: [[{ type: String }]],
    },
  },
  {
    timestamps: true,
  }
);

// 페이지 내에서 position 순서로 정렬
BlockSchema.index({ pageId: 1, position: 1 });

export const Block = mongoose.model<IBlock>("Block", BlockSchema);
