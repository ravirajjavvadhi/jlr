import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

/**
 * JLR AI - Advanced File Intelligence Pipeline (v2.1)
 * Optimized for Next.js Turbopack stability.
 * Cache-Bust Timestamp: 2026-05-07 12:12
 */

// Initialize PDF.js with standard build
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Setup PDF.js - Disable worker for simple server-side extraction
pdfjs.GlobalWorkerOptions.workerSrc = ''; // Effectively disables worker lookup

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text = '';
    let metadata = {};

    const fileType = file.type || '';
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const loadingTask = pdfjs.getDocument({ 
          data: arrayBuffer,
          useSystemFonts: true,
          disableFontFace: true,
          isEvalSupported: false
        });
        const pdfDoc = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += `[PAGE ${i}]\n${pageText}\n\n`;
        }
        text = fullText.trim();
        metadata = { pages: pdfDoc.numPages, method: 'pdfjs', textLength: text.length };
        
        if (!text) {
          text = "[SYSTEM NOTE: This PDF appears to be a scanned image or contains no extractable text. Vision/OCR logic may be required.]";
        }
      } catch (pdfErr) {
        console.error('[PDF-EXTRACT] Error:', pdfErr);
        throw new Error('Could not parse PDF. It might be encrypted or corrupted.');
      }
    } 
    else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      metadata = { method: 'mammoth' };
    }
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let fullText = '';
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        if (csv.trim()) {
          fullText += `[SHEET: ${sheetName}]\n${csv}\n\n`;
        }
      });
      text = fullText.trim();
      metadata = { sheets: workbook.SheetNames.length, method: 'xlsx' };
    }
    else {
      text = buffer.toString('utf-8');
      metadata = { method: 'raw' };
    }

    return NextResponse.json({ 
      text, 
      metadata,
      fileName: file.name,
      fileSize: file.size
    });

  } catch (error: any) {
    console.error('[EXTRACT-API] Failure:', error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
