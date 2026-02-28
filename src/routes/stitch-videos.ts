import { Request, Response } from 'express';
import { stitchVideos } from '../lib/ffmpeg';

export async function stitchVideosHandler(req: Request, res: Response) {
  try {
    const { videoUrls, imageUrls } = req.body;

    if (!videoUrls || videoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'videoUrls array is required',
      });
    }

    if (videoUrls.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 video URLs are required for stitching',
      });
    }

    const outputUrl = await stitchVideos(videoUrls, imageUrls);

    // Build full URL using SERVER_URL
    const serverUrl = process.env.SERVER_URL || 'http://localhost:4000';
    const fullOutputUrl = `${serverUrl}${outputUrl}`;

    return res.json({
      success: true,
      outputUrl: fullOutputUrl,
    });
  } catch (error) {
    console.error('Video stitching error:', error);
    const message = error instanceof Error ? error.message : 'Failed to stitch videos';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
