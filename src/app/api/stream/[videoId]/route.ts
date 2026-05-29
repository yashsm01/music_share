import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createReadStream, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

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

// Temp directory for audio files
const TEMP_DIR = join(process.cwd(), '.audio-cache');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Ensure temp dir exists
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }

    const tempFile = join(TEMP_DIR, `${videoId}-${randomUUID().slice(0, 8)}`);
    const outputTemplate = `${tempFile}.%(ext)s`;

    const ytdlp = getYtDlpPath();

    // Download audio-only to temp file
    await execFileAsync(ytdlp, [
      url,
      '--extract-audio',
      '--audio-format', 'opus',
      '--audio-quality', '128K',
      '--output', outputTemplate,
      '--no-playlist',
      '--no-check-certificates',
      '--prefer-free-formats',
      '--js-runtimes', 'nodejs',
      '--quiet',
    ], {
      timeout: 120000, // 2 min timeout
    });

    // Find the output file (yt-dlp adds extension)
    const possibleExts = ['opus', 'webm', 'ogg', 'm4a', 'mp3'];
    let outputFile = '';
    for (const ext of possibleExts) {
      const candidate = `${tempFile}.${ext}`;
      if (existsSync(candidate)) {
        outputFile = candidate;
        break;
      }
    }

    if (!outputFile) {
      return NextResponse.json(
        { error: 'Failed to extract audio', details: 'Output file not found' },
        { status: 500 }
      );
    }

    // Stream the file to the client
    const nodeStream = createReadStream(outputFile);

    // Determine content type
    const ext = outputFile.split('.').pop() || 'opus';
    const contentTypes: Record<string, string> = {
      opus: 'audio/ogg',
      ogg: 'audio/ogg',
      webm: 'audio/webm',
      m4a: 'audio/mp4',
      mp3: 'audio/mpeg',
    };

    const headers: Record<string, string> = {
      'Content-Type': contentTypes[ext] || 'audio/ogg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };

    // Clean up file after streaming
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: any) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on('end', () => {
          controller.close();
          try { unlinkSync(outputFile); } catch { /* ignore */ }
        });
        nodeStream.on('error', (err: Error) => {
          controller.error(err);
          try { unlinkSync(outputFile); } catch { /* ignore */ }
        });
      },
      cancel() {
        nodeStream.destroy();
        try { unlinkSync(outputFile); } catch { /* ignore */ }
      },
    });

    return new Response(webStream, { status: 200, headers });

  } catch (err: any) {
    console.error('Audio stream error:', err.stderr || err.message || err);
    return NextResponse.json(
      { error: 'Failed to extract audio', details: err.stderr || err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
