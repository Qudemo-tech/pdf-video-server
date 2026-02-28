import { Request, Response } from 'express';
import { extractTextFromPDF } from '../lib/pdf';

export async function extractTextHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE',
      });
    }

    const buffer = req.file.buffer;

    const result = await extractTextFromPDF(buffer);

    if (!result.text || result.text.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'This PDF appears to be a scanned image. Please upload a text-based PDF.',
        code: 'NO_TEXT_EXTRACTED',
      });
    }

    return res.json({
      success: true,
      text: result.text,
      pageCount: result.pageCount,
      characterCount: result.characterCount,
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to extract text from PDF',
      code: 'EXTRACTION_FAILED',
    });
  }
}
