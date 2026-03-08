import { Request, Response } from 'express';
import { generateScript } from '../lib/anthropic';

export async function generateScriptHandler(req: Request, res: Response) {
  try {
    const { text, tone, maxLengthSeconds } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required',
        code: 'INVALID_REQUEST',
      });
    }

    const selectedTone = tone || 'professional';
    const selectedDuration = maxLengthSeconds || 120;

    console.log('[generate-script] Request received — tone:', selectedTone, '| duration:', selectedDuration, 's | text length:', text.length);
    const result = await generateScript(text, selectedTone, selectedDuration);
    console.log('[generate-script] Script generated — words:', result.wordCount, '| estimated duration:', result.estimatedDurationSeconds, 's');

    return res.json({
      success: true,
      script: result.script,
      estimatedDurationSeconds: result.estimatedDurationSeconds,
      wordCount: result.wordCount,
    });
  } catch (error) {
    console.error('Script generation error:', error);
    return res.status(502).json({
      success: false,
      error: 'Failed to generate script',
      code: 'SCRIPT_GENERATION_FAILED',
    });
  }
}
