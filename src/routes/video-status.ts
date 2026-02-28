import { Request, Response } from 'express';
import { getVideoStatus } from '../lib/tavus';

export async function videoStatusHandler(req: Request, res: Response) {
  try {
    const videoId = req.query.videoId as string;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'videoId is required',
        code: 'INVALID_REQUEST',
      });
    }

    const result = await getVideoStatus(videoId);

    return res.json({
      success: true,
      videoId: result.video_id,
      status: result.status,
      hostedUrl: result.hosted_url,
      downloadUrl: result.download_url,
      errorMessage: result.error_message,
    });
  } catch (error) {
    console.error('Video status error:', error);
    return res.status(502).json({
      success: false,
      error: 'Failed to get video status',
      code: 'VIDEO_NOT_FOUND',
    });
  }
}
