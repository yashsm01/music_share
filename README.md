# 🎵 SyncTunes — Listen Together in Real-Time

A web app where multiple users can join a room and listen to YouTube music together in perfect sync.

## Features

- **🏠 Room System** — Create/join rooms with shareable 6-character codes
- **▶️ Synced Playback** — Play, pause, seek — everyone stays in sync
- **📋 Shared Queue** — Anyone can add songs from YouTube
- **💬 Live Chat** — Real-time messaging with emoji support
- **👥 User Presence** — See who's listening
- **👑 Host Controls** — Host controls playback, others follow

## Tech Stack

- **Next.js 16** — React framework (App Router)
- **TypeScript** — Type safety
- **Socket.IO** — Real-time WebSocket communication
- **MongoDB / Mongoose** — Database
- **Tailwind CSS v4** — Styling
- **YouTube IFrame API** — Video playback (via react-youtube)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` from the template:
   ```bash
   cp .env.local.example .env.local
   ```

3. Set your MongoDB connection string in `.env.local`:
   ```
   MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/synctunes
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### How It Works

1. Enter your name on the home page
2. **Create a room** or **Join** with a room code
3. Share the room code with friends
4. Paste YouTube URLs to add songs to the queue
5. The host controls playback — everyone listens in sync!

## Architecture

The app uses a **custom Node.js server** (`server.ts`) that wraps the Next.js request handler and attaches a Socket.IO server to the same HTTP server. This enables real-time WebSocket communication alongside Next.js pages and API routes.

## Deployment

Deploy to a VPS (e.g., DigitalOcean):

```bash
npm run build
npm run start
```

> ⚠️ Cannot deploy to Vercel — custom server required for Socket.IO.
