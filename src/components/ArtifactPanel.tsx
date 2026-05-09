"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Maximize2, Minimize2, Download, Code, Play, 
  FileText, Folder, Check, Copy, ChevronRight, ChevronDown,
  Terminal, Globe, Zap, Cpu
} from 'lucide-react';
import JSZip from 'jszip';

interface ProjectFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface ProjectManifest {
  title: string;
  stack: string;
  description: string;
  entryFile: string;
  files: ProjectFile[];
}

interface ArtifactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ProjectManifest | null;
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ isOpen, onClose, manifest }) => {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (manifest && Array.isArray(manifest.files) && manifest.files.length > 0) {
      const entry = manifest.files.find(f => f.path === manifest.entryFile) || manifest.files[0];
      setSelectedFile(entry);
    } else {
      setSelectedFile(null);
    }
  }, [manifest]);

  if (!isOpen) return null;

  // Render error state if manifest is malformed
  const isManifestIncomplete = manifest && (!Array.isArray(manifest.files) || manifest.files.length === 0);

  const downloadZip = async () => {
    if (!manifest) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      manifest.files.forEach(file => {
        zip.file(file.path, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${manifest.title.toLowerCase().replace(/\s+/g, '_')}_project.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP Generation Failed:", err);
    } finally {
      setIsZipping(false);
    }
  };

  const copyCode = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Improved Preview Generator
  const generatePreviewContent = () => {
    if (!manifest) return '';

    // If it's a simple HTML/CSS/JS project
    const htmlFile = manifest.files.find(f => f.name.endsWith('.html'));
    const cssFiles = manifest.files.filter(f => f.name.endsWith('.css'));
    const jsFiles = manifest.files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));

    if (htmlFile) {
      let content = htmlFile.content;
      
      // Inject CSS
      const cssStyles = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
      content = content.replace('</head>', `${cssStyles}</head>`);
      
      // Inject JS
      const jsScripts = jsFiles.map(f => `<script>${f.content}</script>`).join('\n');
      content = content.replace('</body>', `${jsScripts}</body>`);
      
      return content;
    }

    // Default Fallback: Architecture View for Non-Web Stacks
    return `
      <html>
        <head>
          <style>
            body { background: #050505; color: #fff; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 3rem; border-radius: 24px; max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
            .icon { color: #00f2fe; margin-bottom: 1.5rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; letter-spacing: 1px; color: #fff; }
            p { opacity: 0.6; line-height: 1.6; }
            .tag { display: inline-block; padding: 4px 12px; background: rgba(0,242,254,0.1); color: #00f2fe; border-radius: 100px; font-size: 0.7rem; font-weight: 900; margin-top: 1.5rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
            <h1>${manifest.stack.toUpperCase()} ARCHITECTURE</h1>
            <p>${manifest.description}</p>
            <div class="tag">BACKEND LINKAGE READY</div>
            <p style="font-size: 0.7rem; margin-top: 2rem; opacity: 0.3;">Live preview is currently focusing on Frontend Wiring. Check the Code panel for full Backend scripts.</p>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ 
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: isExpanded ? '100%' : '50%',
            maxWidth: isExpanded ? '100%' : '800px',
            background: '#080808',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.8)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '1.25rem 1.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              <motion.div 
                animate={isZipping ? { rotate: 360 } : {}} 
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                style={{ width: '42px', height: '42px', background: 'var(--beast-gradient)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(0, 255, 157, 0.2)' }}
              >
                <Zap size={24} fill="black" />
              </motion.div>
              <div>
                <h3 className="text-beast" style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{manifest?.title || 'PROJECT ENGINE'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.6rem', padding: '3px 10px', background: 'rgba(0, 255, 157, 0.1)', color: 'var(--accent-beast)', borderRadius: '6px', fontWeight: 900, letterSpacing: '1px' }}>{manifest?.stack.toUpperCase() || 'ORCHESTRATING'}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.3, fontWeight: 800, letterSpacing: '2px' }}>SOVEREIGN v1.0</div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => setView(view === 'preview' ? 'code' : 'preview')} 
                className="btn-ghost" 
                style={{ fontSize: '0.7rem', fontWeight: 900, gap: '0.6rem', padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', letterSpacing: '1px' }}
              >
                {view === 'preview' ? <><Code size={16} /> ANALYZE CODE</> : <><Play size={16} /> EXECUTE PREVIEW</>}
              </button>
              <button 
                onClick={downloadZip} 
                disabled={isZipping}
                className="btn-beast" 
                style={{ fontSize: '0.7rem', padding: '10px 22px', borderRadius: '12px', height: '42px', minWidth: '150px', letterSpacing: '1px' }}
              >
                {isZipping ? <><Cpu size={16} className="animate-spin" /> PACKING MODULES...</> : <><Download size={16} /> EXPORT SOURCE</>}
              </button>
              <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.05)', margin: '0 8px' }} />
              <button onClick={() => setIsExpanded(!isExpanded)} className="btn-ghost" style={{ padding: '8px', opacity: 0.4 }}><Maximize2 size={20} /></button>
              <button onClick={onClose} className="btn-ghost" style={{ padding: '8px', color: '#ff4b2b', background: 'rgba(255,75,43,0.05)', borderRadius: '12px' }}><X size={22} /></button>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {view === 'code' && (
              <div style={{ width: '260px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ padding: '1rem', fontSize: '0.65rem', fontWeight: 900, opacity: 0.3, letterSpacing: '1.5px', textTransform: 'uppercase' }}>File System</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
                  {manifest?.files?.map(file => (
                    <div 
                      key={file.path} 
                      onClick={() => setSelectedFile(file)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.6rem 0.8rem', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        background: selectedFile?.path === file.path ? 'rgba(255,255,255,0.05)' : 'transparent',
                        color: selectedFile?.path === file.path ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        marginBottom: '2px'
                      }}
                    >
                      <FileText size={14} style={{ opacity: selectedFile?.path === file.path ? 1 : 0.4 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    </div>
                  ))}
                  {isManifestIncomplete && (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.3, fontSize: '0.7rem' }}>
                      <Cpu size={24} style={{ margin: '0 auto 1rem' }} />
                      NO CODE MODULES DETECTED
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: view === 'preview' ? '#fff' : '#0a0a0a' }}>
              {isManifestIncomplete ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem', textAlign: 'center', background: '#050505', color: '#fff' }}>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}>
                     <Cpu size={48} style={{ color: 'var(--accent-beast)', marginBottom: '2rem', opacity: 0.5 }} />
                  </motion.div>
                  <h2 className="text-beast" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Sovereign Synthesis Pending</h2>
                  <p style={{ opacity: 0.5, maxWidth: '450px', fontSize: '0.9rem', lineHeight: 1.6 }}>The JLR AI Core has generated a high-level strategic overview. Please confirm the stack choice in the chat to initiate full multi-file code synthesis.</p>
                  <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, border: '1px solid rgba(255,255,255,0.05)' }}>AWAITING COMMANDER APPROVAL</div>
                  </div>
                </div>
              ) : view === 'preview' ? (
                <iframe 
                  title="Project Preview"
                  srcDoc={generatePreviewContent()}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {selectedFile ? (
                    <>
                      <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Terminal size={14} />
                          <span>{selectedFile?.path}</span>
                        </div>
                        <button onClick={copyCode} style={{ background: 'transparent', border: 'none', color: copied ? '#00f2fe' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 800 }}>
                          {copied ? <><Check size={14} /> COPIED</> : <><Copy size={14} /> COPY</>}
                        </button>
                      </div>
                      <pre style={{ flex: 1, margin: 0, padding: '1.5rem', overflow: 'auto', fontSize: '0.9rem', lineHeight: 1.6, color: '#d1d5db', fontFamily: 'monospace' }}>
                        <code>{selectedFile?.content}</code>
                      </pre>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                      <Code size={48} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ArtifactPanel;
