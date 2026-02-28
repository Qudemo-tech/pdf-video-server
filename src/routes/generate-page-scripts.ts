import { Request, Response } from 'express';
import { generatePageScripts } from '../lib/anthropic';

export async function generatePageScriptsHandler(req: Request, res: Response) {
  try {
    const { textByPage, fullText } = req.body;

    if (!textByPage || textByPage.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'textByPage is required',
      });
    }

    if (!fullText || fullText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fullText is required',
      });
    }

    const scripts = await generatePageScripts(textByPage, fullText);

    return res.json({
      success: true,
      scripts,
    });
  } catch (error) {
    console.error('Page script generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate page scripts',
    });
  }
}
