"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, X, Paperclip, Loader2, Eye, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/services/authContext';


export type FileData = {
  id: string;
  name: string;
  type: 'image' | 'document' | 'pdf_visual';
  data: string;       // base64 for images, text for documents, base64 of first page for pdf_visual
  pages?: string[];   // All rendered page images for PDF (as data URLs)
  preview?: string;
};

type FileUploaderProps = {
  onFilesChange: (files: FileData[]) => void;
  files: FileData[];
  showButton?: boolean;
  showPreviews?: boolean;
};

// ─── PDF → CANVAS RENDERER ───────────────────────────────────────────────────
async function renderPdfToImages(file: File, setProgress: (p: number) => void): Promise<{ pages: string[]; text: string }> {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjs = await import('pdfjs-dist');
  
  // Use the CDN worker — most reliable in Next.js client context
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer, useSystemFonts: true });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  let combinedText = '';
  const totalPages = pdf.numPages; // No artificial cap for total discovery
  const VISION_LIMIT = 20; // Only render first 20 pages visually to save bandwidth
  const TEXT_LIMIT = 150; // Extract text from up to 150 pages

  for (let i = 1; i <= Math.min(totalPages, TEXT_LIMIT); i++) {
    setProgress(Math.round(10 + (i / Math.min(totalPages, TEXT_LIMIT)) * 80));
    const page = await pdf.getPage(i);

    // 1️⃣ [INTELLIGENCE] Extract text from this page
    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      combinedText += `\n--- [PAGE ${i} / ${pdf.numPages}] ---\n${pageText}\n`;
    } catch (_) { /* ignore */ }

    // 2️⃣ [VISION] Render page to canvas only if within VISION_LIMIT
    if (i <= VISION_LIMIT) {
      const viewport = page.getViewport({ scale: 0.6 }); // Ultra-compressed
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(canvas.toDataURL('image/jpeg', 0.4)); // Beast-mode compression
    }
  }

  if (pdf.numPages > TEXT_LIMIT) {
    combinedText += `\n\n[SUPREMACY WARNING: Document exceeds ${TEXT_LIMIT} pages. Context truncated.]`;
  }

  return { pages, text: combinedText.trim() };
}

// ─── IMAGE COMPRESSOR ────────────────────────────────────────────────────────
function toBase64Simple(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const res = reader.result as string;
      if (res.length > 800_000) { // Compress if > 800KB
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = res;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(res); return; }
          
          let w = img.width;
          let h = img.height;
          const max = 800; // Ultra-compressed for high-density OCR
          if (w > max || h > max) {
            if (w > h) { h *= max / w; w = max; }
            else { w *= max / h; h = max; }
          }
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.4)); // Sovereign compression
        };
        img.onerror = () => resolve(res); // Fallback to uncompressed on error
      } else {
        resolve(res);
      }
    };
    reader.onerror = reject;
  });
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function FileUploader({ onFilesChange, files, showButton = true, showPreviews = true }: FileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('');

  const { user } = useAuth();
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // [SUPREMACY FIX] - Allow Guests to analyze files (saved to local cache)
    // if (!user || user.id === 'guest') { ... }


    setIsProcessing(true);
    const newFiles: FileData[] = [];

    for (const file of acceptedFiles) {
      setProgress(5);

      // ── IMAGES ──
      if (file.type.startsWith('image/')) {
        setStatusLabel('Compressing image...');
        try {
          const base64 = await toBase64(file);
          setProgress(90);
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: 'image',
            data: base64,
            preview: URL.createObjectURL(file)
          });
        } catch (err) {
          console.error('[Uploader] Compression failed:', err);
          const base64 = await toBase64Simple(file);
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: 'image',
            data: base64,
            preview: URL.createObjectURL(file)
          });
        }

      // ── PDFs → VISUAL INTELLIGENCE ──
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setStatusLabel('🧠 Vision Engine activating...');
        try {
          const { pages, text } = await renderPdfToImages(file, setProgress);
          setProgress(95);
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: 'pdf_visual',
            data: pages[0] || '',           // First page for quick display
            pages: pages,                    // All pages for AI to analyse
            preview: pages[0] || undefined
          });
        } catch (err) {
          console.error('[JLR-VISION] PDF render failed:', err);
          setStatusLabel('Fallback: text extraction...');
          // Hard fallback: server-side text
          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/extract', { method: 'POST', body: formData });
            if (res.ok) {
              const result = await res.json();
              newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, type: 'document', data: result.text });
            }
          } catch (_) {
            alert(`Could not process ${file.name}. File may be encrypted.`);
          }
        }

      // ── DOCX / XLSX / CSV → SERVER TEXT EXTRACTION ──
      } else {
        setStatusLabel('Extracting document text...');
        try {
          const formData = new FormData();
          formData.append('file', file);
          const progressInterval = setInterval(() => setProgress(p => p < 88 ? p + 6 : p), 200);
          const res = await fetch('/api/extract', { method: 'POST', body: formData });
          clearInterval(progressInterval);
          setProgress(95);

          if (!res.ok) throw new Error(`Server error ${res.status}`);
          const result = await res.json();

          if (!result.text?.trim()) throw new Error('No text extracted');
          newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, type: 'document', data: result.text });
        } catch (err: any) {
          console.error('[JLR-EXTRACT]', err.message);
          if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            const text = await file.text();
            newFiles.push({ id: Math.random().toString(36).substr(2, 9), name: file.name, type: 'document', data: text.slice(0, 50000) });
          } else {
            alert(`Extraction failed for ${file.name}: ${err.message}`);
          }
        }
      }
    }

    onFilesChange([...files, ...newFiles]);
    setProgress(100);
    setTimeout(() => { setIsProcessing(false); setProgress(0); setStatusLabel(''); }, 600);
  }, [files, onFilesChange]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'image/*': [],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    }
  });

  const removeFile = (id: string) => onFilesChange(files.filter(f => f.id !== id));

  return (
    <div {...getRootProps()} style={{ width: '100%' }}>
      <input {...getInputProps()} />
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ marginBottom: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {statusLabel || 'Activating Intelligence...'}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{progress}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', height: '3px' }}>
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #60a5fa)', borderRadius: '4px', boxShadow: '0 0 8px rgba(96,165,250,0.6)' }}
              />
            </div>
          </motion.div>
        )}

        {showPreviews && files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', overflowX: 'auto' }}
          >
            {files.map(file => (
              <motion.div
                key={file.id}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ position: 'relative', flexShrink: 0, width: '48px', height: '48px', borderRadius: '10px', border: '1px solid var(--glass-border)', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}
              >
                {(file.type === 'image') ? (
                  <img src={file.preview || file.data} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : file.type === 'pdf_visual' ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {file.preview
                      ? <img src={file.preview} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={20} color="var(--accent-primary)" /></div>
                    }
                    <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,242,254,0.8)', borderRadius: '3px', padding: '1px 3px', fontSize: '0.45rem', fontWeight: 900, color: '#000' }}>
                      {file.pages?.length || 1}P
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} color="var(--accent-primary)" />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  style={{ position: 'absolute', top: '1px', right: '1px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', padding: '2px', color: 'white', cursor: 'pointer' }}
                >
                  <X size={10} />
                </button>
              </motion.div>
            ))}
            {isProcessing && (
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showButton && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px' }}>
          <button
            type="button"
            onClick={open}
            className="btn-ghost"
            style={{ padding: '4px', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Paperclip size={20} style={{ opacity: 0.6 }} />
          </button>
        </div>
      )}
    </div>
  );
}
