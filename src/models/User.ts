import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  name: string;
  avatar: string;
  email?: string;
  password?: string;
  createdAt: Date;
  savedSongs: Array<{
    videoId: string;
    title: string;
    thumbnail?: string;
    addedAt: Date;
  }>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    avatar: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple guest users (without email) without unique constraint error
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    savedSongs: [
      {
        videoId: { type: String, required: true },
        title: { type: String, required: true },
        thumbnail: { type: String },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
