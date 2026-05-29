import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#030712",
};

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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SyncTunes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {/* Background gradient orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-600/[0.07] blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/[0.07] blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/[0.04] blur-[160px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
