import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQueueDocument extends Document {
  roomId: mongoose.Types.ObjectId | string;
  videoId: string;
  title: string;
  thumbnail: string;
  addedBy: {
    userId: mongoose.Types.ObjectId | string;
    name: string;
  };
  createdAt: Date;
}

const QueueSchema = new Schema<IQueueDocument>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    videoId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    addedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Index for fast queue lookups by room
QueueSchema.index({ roomId: 1, createdAt: 1 });

const Queue: Model<IQueueDocument> =
  mongoose.models.Queue || mongoose.model<IQueueDocument>('Queue', QueueSchema);

export default Queue;
