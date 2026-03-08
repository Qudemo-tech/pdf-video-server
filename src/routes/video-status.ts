import { Request, Response } from 'express';
import { getVideoStatus } from '../lib/tavus';
import { uploadBufferToGCS } from '../lib/gcs';

// Track which videos have already been uploaded to GCS to avoid duplicate uploads
const uploadedVideos = new Set<string>();

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

    // When video is ready, upload to GCS once (non-fatal if it fails)
    let gcsUrl: string | null = null;
    if (result.status === 'ready' && result.download_url && !uploadedVideos.has(videoId)) {
      console.log('[video-status] Video ready, attempting GCS upload for:', videoId);
      try {
        const response = await fetch(result.download_url);
        if (response.ok) {
          const videoBuffer = Buffer.from(await response.arrayBuffer());
          gcsUrl = await uploadBufferToGCS(videoBuffer, `videos/${videoId}.mp4`, 'video/mp4');
          uploadedVideos.add(videoId);
          console.log('[video-status] GCS video upload result:', gcsUrl);
        } else {
          console.error('[video-status] Failed to download video from Tavus:', response.status);
        }
      } catch (uploadErr: any) {
        console.error('[video-status] GCS video upload failed (non-fatal):', uploadErr);
      }
    }

    return res.json({
      success: true,
      videoId: result.video_id,
      status: result.status,
      hostedUrl: result.hosted_url,
      downloadUrl: result.download_url,
      errorMessage: result.error_message,
      gcsUrl,
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
