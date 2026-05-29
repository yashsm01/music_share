import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

function getYtDlpPath(): string {
  try {
    const mod = require('youtube-dl-exec');
    return mod.constants?.YOUTUBE_DL_PATH || 'yt-dlp';
  } catch {
    return 'yt-dlp';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlp = getYtDlpPath();

    // Use yt-dlp to get video metadata as JSON
    const { stdout } = await execFileAsync(ytdlp, [
      url,
      '--dump-single-json',
      '--no-playlist',
      '--no-check-certificates',
      '--js-runtimes', 'nodejs',
      '--quiet',
    ], {
      timeout: 30000,
    });

    const data = JSON.parse(stdout);

    return NextResponse.json({
      title: data.title || 'Unknown',
      author: data.uploader || data.channel || 'Unknown',
      duration: data.duration || 0,
      thumbnail:
        data.thumbnail ||
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      viewCount: data.view_count?.toString() || '0',
    });
  } catch (err: any) {
    console.error('Info error:', err.stderr || err.message);

    // Fallback: return basic info from YouTube oEmbed
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      const oembedData = await oembedRes.json();
      return NextResponse.json({
        title: oembedData.title || 'Unknown',
        author: oembedData.author_name || 'Unknown',
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        viewCount: '0',
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to get video info' },
        { status: 500 }
      );
    }
  }
}
