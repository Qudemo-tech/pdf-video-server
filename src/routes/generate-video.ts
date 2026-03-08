import { Request, Response } from 'express';
import { generateVideo } from '../lib/tavus';

export async function generateVideoHandler(req: Request, res: Response) {
  try {
    const { script, videoName, backgroundUrl } = req.body;

    if (!script || script.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Script is required',
        code: 'INVALID_REQUEST',
      });
    }

    console.log('[generate-video] Request received — name:', videoName, '| script length:', script.length, '| background:', backgroundUrl || 'none');
    const result = await generateVideo(script, videoName, backgroundUrl);
    console.log('[generate-video] Video created — videoId:', result.video_id, '| status:', result.status);

    return res.json({
      success: true,
      videoId: result.video_id,
      hostedUrl: result.hosted_url,
      status: result.status,
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return res.status(502).json({
      success: false,
      error: 'Failed to generate video',
      code: 'VIDEO_GENERATION_FAILED',
    });
  }
}
