import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'output');

/**
 * Download a video from a URL and save it to a local path.
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video from ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Composite a page image as full-screen background with avatar video as a
 * small PiP overlay in the bottom-right corner (Loom-style).
 */
function compositePageVideo(
  imagePath: string,
  avatarVideoPath: string,
  outputPath: string
): void {
  execSync(
    `ffmpeg -y -loop 1 -i "${imagePath}" -i "${avatarVideoPath}" ` +
    `-filter_complex "[0:v]scale=1280:720[bg];[1:v]scale=280:-1[avatar];` +
    `[bg][avatar]overlay=W-w-20:H-h-20:shortest=1[out]" ` +
    `-map "[out]" -map 1:a -c:v libx264 -preset fast -crf 23 -c:a aac -ar 44100 -r 30 -shortest "${outputPath}"`,
    { stdio: 'pipe', timeout: 300000 }
  );
}

/**
 * Stitch multiple video URLs into a single MP4 using ffmpeg concat demuxer.
 * If imageUrls is provided, page videos (index > 0) are composited with
 * the corresponding page image as background (PiP style).
 * Returns the relative URL path to the output video.
 */
export async function stitchVideos(
  videoUrls: string[],
  imageUrls?: string[]
): Promise<string> {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const tempDir = path.join(OUTPUT_DIR, `temp-${timestamp}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Download all videos
    const localPaths: string[] = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const localPath = path.join(tempDir, `video-${i}.mp4`);
      await downloadVideo(videoUrls[i], localPath);
      localPaths.push(localPath);
    }

    // Process each video: PiP composite for page videos, normalize for intro
    const normalizedPaths: string[] = [];
    for (let i = 0; i < localPaths.length; i++) {
      const normalizedPath = path.join(tempDir, `normalized-${i}.mp4`);

      // Index 0 = intro (full-screen avatar, no compositing)
      // Index 1+ = page videos, composite with page image if available
      if (i > 0 && imageUrls && imageUrls[i - 1]) {
        const imagePath = imageUrls[i - 1];
        if (fs.existsSync(imagePath)) {
          compositePageVideo(imagePath, localPaths[i], normalizedPath);
          normalizedPaths.push(normalizedPath);
          continue;
        }
      }

      // Fallback: just normalize (for intro or if image not found)
      execSync(
        `ffmpeg -y -i "${localPaths[i]}" -c:v libx264 -preset fast -crf 23 -c:a aac -ar 44100 -ac 2 -r 30 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" "${normalizedPath}"`,
        { stdio: 'pipe', timeout: 300000 }
      );
      normalizedPaths.push(normalizedPath);
    }

    // Create concat list file
    const listPath = path.join(tempDir, 'list.txt');
    const listContent = normalizedPaths.map((p) => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    // Run ffmpeg concat
    const outputFilename = `stitched-${timestamp}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
      { stdio: 'pipe', timeout: 300000 }
    );

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    return `/output/${outputFilename}`;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}
