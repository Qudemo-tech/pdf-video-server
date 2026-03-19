import { Request, Response } from 'express';
import { generateVideo } from '../lib/tavus';
import { getSupabase } from '../lib/supabase';

export async function generateVideoHandler(req: Request, res: Response) {
  try {
    const { script, videoName, backgroundUrl, user_email } = req.body;

    if (!script || script.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Script is required',
        code: 'INVALID_REQUEST',
      });
    }

    // Credit check: require at least 1 credit
    if (user_email) {
      const { data } = await getSupabase()
        .from('user_credits')
        .select('balance')
        .eq('user_email', user_email)
        .maybeSingle();

      const balance = data ? Number(data.balance) : 0;
      if (balance < 1) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient credits. Please purchase credits to generate videos.',
          code: 'INSUFFICIENT_CREDITS',
        });
      }
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
