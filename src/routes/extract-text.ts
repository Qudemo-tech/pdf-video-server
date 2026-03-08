import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { extractTextFromPDF } from '../lib/pdf';
import { uploadBufferToGCS } from '../lib/gcs';

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

    // Upload PDF to GCS (non-fatal if it fails)
    let pdfUrl: string | null = null;
    const sessionId = randomUUID();
    console.log('[extract-text] Attempting GCS PDF upload for session:', sessionId);
    try {
      pdfUrl = await uploadBufferToGCS(buffer, `pdfs/${sessionId}.pdf`, 'application/pdf');
      console.log('[extract-text] GCS PDF upload result:', pdfUrl);
    } catch (uploadErr: any) {
      console.error('[extract-text] GCS PDF upload failed (non-fatal):', uploadErr);
    }

    return res.json({
      success: true,
      text: result.text,
      pageCount: result.pageCount,
      characterCount: result.characterCount,
      pdfUrl,
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
