import mongoose, { Document, Schema } from "mongoose";

export interface IPage extends Document {
  title: string;
  ownerId: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  isPublic: boolean;
  shareUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
  {
    title: {
      type: String,
      required: true,
      default: "제목 없음",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    shareUrl: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Page = mongoose.model<IPage>("Page", PageSchema);
