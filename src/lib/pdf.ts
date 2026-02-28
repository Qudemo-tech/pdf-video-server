// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

interface PDFExtractResult {
  text: string;
  pageCount: number;
  characterCount: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractResult> {
  const data = await pdfParse(buffer);

  const text = (data.text as string)
    // Strip control characters except newlines and tabs
    .replace(/[^\x20-\x7E\n\t]/g, ' ')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text,
    pageCount: data.numpages as number,
    characterCount: text.length,
  };
}
