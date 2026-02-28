import { fromPath } from 'pdf2pic';
import path from 'path';
import fs from 'fs';

const TEMP_PAGES_DIR = path.join(process.cwd(), 'public', 'temp-pages');

/**
 * Convert each page of a PDF to a JPEG image.
 * Returns an array of relative URL paths like /temp-pages/page-1.jpg
 */
export async function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
  // Ensure output directory exists and is clean
  if (fs.existsSync(TEMP_PAGES_DIR)) {
    const existing = fs.readdirSync(TEMP_PAGES_DIR);
    for (const file of existing) {
      fs.unlinkSync(path.join(TEMP_PAGES_DIR, file));
    }
  } else {
    fs.mkdirSync(TEMP_PAGES_DIR, { recursive: true });
  }

  // Write PDF to a temp file (pdf2pic needs a file path)
  const tempPdfPath = path.join(TEMP_PAGES_DIR, 'input.pdf');
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  // Get page count using pdf-parse
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const pdfData = await pdfParse(pdfBuffer);
  const pageCount: number = pdfData.numpages;

  const converter = fromPath(tempPdfPath, {
    density: 150,
    saveFilename: 'page',
    savePath: TEMP_PAGES_DIR,
    format: 'jpg',
    width: 1920,
    height: 1080,
  });

  const imageUrls: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const result = await converter(i, { responseType: 'image' });
    if (result.path) {
      // pdf2pic saves as page.1.jpg, page.2.jpg etc.
      // Rename to page-1.jpg for cleaner URLs
      const newName = `page-${i}.jpg`;
      const newPath = path.join(TEMP_PAGES_DIR, newName);
      if (result.path !== newPath) {
        fs.renameSync(result.path, newPath);
      }
      imageUrls.push(`/temp-pages/${newName}`);
    }
  }

  // Clean up temp PDF
  if (fs.existsSync(tempPdfPath)) {
    fs.unlinkSync(tempPdfPath);
  }

  return imageUrls;
}

/**
 * Split extracted text by page markers.
 * pdf-parse separates pages with form feeds or multiple newlines.
 * This is a best-effort split.
 */
export function splitTextByPage(fullText: string, pageCount: number): string[] {
  // Try splitting by form feed first
  let pages = fullText.split(/\f/);

  if (pages.length === pageCount) {
    return pages.map((p) => p.trim()).filter(Boolean);
  }

  // If that didn't work, try splitting by double newlines and distributing
  const paragraphs = fullText.split(/\n{2,}/);
  if (paragraphs.length >= pageCount) {
    const perPage = Math.ceil(paragraphs.length / pageCount);
    pages = [];
    for (let i = 0; i < pageCount; i++) {
      const start = i * perPage;
      const end = Math.min(start + perPage, paragraphs.length);
      pages.push(paragraphs.slice(start, end).join('\n\n'));
    }
    return pages.map((p) => p.trim()).filter(Boolean);
  }

  // Fallback: just return the full text as one page
  return [fullText.trim()];
}
