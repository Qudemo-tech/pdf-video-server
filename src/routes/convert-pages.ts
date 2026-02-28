import { Request, Response } from 'express';
import path from 'path';
import { convertPDFToImages } from '../lib/pages';

export async function convertPagesHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const buffer = req.file.buffer;
    const imageUrls = await convertPDFToImages(buffer);

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
    });
  } catch (error) {
    console.error('Page conversion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to convert PDF pages to images',
    });
  }
}
