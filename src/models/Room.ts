import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoomUser {
  userId: mongoose.Types.ObjectId | string;
  name: string;
  avatar: string;
  socketId?: string;
}

export interface IRoomDocument extends Document {
  roomCode: string;
  hostId: mongoose.Types.ObjectId | string;
  coHostIds?: (mongoose.Types.ObjectId | string)[];
  currentVideoId: string | null;
  currentVideoTitle: string | null;
  isPlaying: boolean;
  currentTime: number;
  users: IRoomUser[];
  createdAt: Date;
}

const RoomUserSchema = new Schema<IRoomUser>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    socketId: { type: String },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoomDocument>(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coHostIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    currentVideoId: {
      type: String,
      default: null,
    },
    currentVideoTitle: {
      type: String,
      default: null,
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    users: {
      type: [RoomUserSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);


const Room: Model<IRoomDocument> =
  mongoose.models.Room || mongoose.model<IRoomDocument>('Room', RoomSchema);

export default Room;
