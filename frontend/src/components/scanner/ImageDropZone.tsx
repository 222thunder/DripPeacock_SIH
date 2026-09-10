'use client';

import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { easeOut } from '@/lib/motion';

interface ImageDropZoneProps {
  onImagesAccepted: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export default function ImageDropZone({
  onImagesAccepted,
  maxFiles = 5,
  maxSizeMB = 10,
}: ImageDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const reduce = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const processFiles = useCallback((files: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (const file of files) {
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`File ${file.name} has unsupported type. Only JPEG, PNG, and WebP are accepted.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setError(`File ${file.name} exceeds ${maxSizeMB}MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const newPreviews = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setPreviewFiles(prev => {
        const updated = [...prev, ...newPreviews].slice(0, maxFiles);
        // Defer parent callback to avoid setState-during-render
        queueMicrotask(() => onImagesAccepted(updated.map(p => p.file)));
        return updated;
      });
    }
  }, [maxSizeMB, maxFiles, onImagesAccepted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  }, [processFiles]);

  const removeFile = useCallback((index: number) => {
    setPreviewFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      // Defer parent callback to avoid setState-during-render
      queueMicrotask(() => onImagesAccepted(updated.map(p => p.file)));
      return updated;
    });
  }, [onImagesAccepted]);

  const handleZoneClick = () => {
    if (previewFiles.length === 0) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <motion.div
        whileHover={
          previewFiles.length === 0 && !reduce
            ? { transform: 'scale(1.005)' }
            : undefined
        }
        whileTap={
          previewFiles.length === 0 && !reduce
            ? { transform: 'scale(0.995)' }
            : undefined
        }
        transition={{ duration: 0.14, ease: easeOut }}
        onClick={handleZoneClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-[2rem] border transition-[border-color,box-shadow,background-color] duration-200 shadow-sm ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-500/10' 
            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md'
        } ${previewFiles.length > 0 ? 'p-8' : 'p-16 cursor-pointer'}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp"
          onChange={handleChange}
          className="hidden"
        />

        {previewFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center relative z-10">
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ delay: 0.04, duration: 0.22, ease: easeOut }}
              className="bg-zinc-100/80 p-5 rounded-2xl mb-6 text-zinc-600 shadow-sm ring-1 ring-zinc-200/50"
            >
              <Upload className="w-8 h-8" strokeWidth={1.5} />
            </motion.div>
            <motion.h3 
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ delay: 0.08, duration: 0.22, ease: easeOut }}
              className="text-xl font-semibold text-zinc-900 mb-2 tracking-tight"
            >
              Upload packaging images
            </motion.h3>
            <motion.p 
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ delay: 0.12, duration: 0.22, ease: easeOut }}
              className="text-sm text-zinc-500 font-medium"
            >
              Drag and drop, or click to browse
            </motion.p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-neutral-700">Selected files ({previewFiles.length}/{maxFiles})</h4>
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
              >
                Add more
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <AnimatePresence>
                {previewFiles.map((fileObj, idx) => (
                  <motion.div
                    key={fileObj.file.name + idx}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
                    animate={{ opacity: 1, transform: 'scale(1)' }}
                    exit={{ opacity: 0, transform: 'scale(0.96)' }}
                    transition={{ duration: 0.2, ease: easeOut }}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/60 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileObj.preview}
                      alt={`Preview ${idx}`}
                      className="w-full h-full object-cover transition-transform duration-200 ease-[var(--ease-out)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-black/0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:bg-black/10 transition-colors duration-200" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-neutral-600 hover:text-red-500 opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-xs truncate">{fileObj.file.name}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-4px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-4px)' }}
            transition={{ duration: 0.18, ease: easeOut }}
            className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-2xl text-sm"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
