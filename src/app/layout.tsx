import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "SyncTunes — Listen Together in Real-Time",
  description:
    "Create a room, invite friends, and listen to YouTube music together in perfect sync. Real-time playback, shared queue, and live chat.",
  keywords: ["music", "listen together", "sync", "YouTube", "room", "real-time", "party"],
  openGraph: {
    title: "SyncTunes — Listen Together in Real-Time",
    description: "Create a room, invite friends, and listen to YouTube music together in perfect sync.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {/* Background gradient orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-pink-600/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[150px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
