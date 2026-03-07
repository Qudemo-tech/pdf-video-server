import { Request, Response } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { convertPDFToImages } from '../lib/pages';
import { uploadBufferToGCS } from '../lib/gcs';

export async function convertPagesHandler(req: Request, res: Response) {
  console.log('[convert-pages] Handler called — GCS version');
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const buffer = req.file.buffer;
    const sessionId = randomUUID();
    const imageUrls = await convertPDFToImages(buffer);

    // Upload original PDF to GCS (non-fatal if it fails)
    let pdfUrl: string | null = null;
    console.log('[convert-pages] Attempting GCS PDF upload for session:', sessionId);
    try {
      pdfUrl = await uploadBufferToGCS(buffer, `pdfs/${sessionId}.pdf`, 'application/pdf');
      console.log('[convert-pages] GCS PDF upload result:', pdfUrl);
    } catch (uploadErr: any) {
      console.error('[convert-pages] GCS PDF upload failed (non-fatal):', uploadErr);
    }

    // Build full public URLs using SERVER_URL
    const serverUrl = process.env.SERVER_URL || 'http://localhost:4000';
    const fullUrls = imageUrls.map((url) => `${serverUrl}${url}`);

    // Build absolute local file paths for server-side PiP compositing
    const localPaths = imageUrls.map((url) => path.join(process.cwd(), 'public', url));

    return res.json({
      success: true,
      imageUrls: fullUrls,
      localPaths,
      pageCount: imageUrls.length,
      pdfUrl,
    });
  } catch (error) {
    console.error('Page conversion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to convert PDF pages to images',
    });
  }
}
