import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  name: string;
  avatar: string;
  email?: string;
  password?: string;
  createdAt: Date;
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
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
