'use client';

import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';

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
      if (!file.type.startsWith('image/')) {
        setError(`File ${file.name} is not an image.`);
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
        whileHover={previewFiles.length === 0 ? { scale: 1.01 } : {}}
        whileTap={previewFiles.length === 0 ? { scale: 0.99 } : {}}
        onClick={handleZoneClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-colors duration-300 ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-neutral-200 bg-white hover:border-neutral-300'
        } ${previewFiles.length > 0 ? 'p-6' : 'p-12 cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp"
          onChange={handleChange}
          className="hidden"
        />

        {previewFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring' as const, bounce: 0, duration: 0.4 }}
              className="bg-neutral-100 p-4 rounded-full mb-4 text-neutral-500"
            >
              <Upload className="w-8 h-8" />
            </motion.div>
            <motion.h3 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring' as const, bounce: 0, duration: 0.4 }}
              className="text-lg font-medium text-neutral-900 mb-1"
            >
              Drop images here or click to browse
            </motion.h3>
            <motion.p 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' as const, bounce: 0, duration: 0.4 }}
              className="text-sm text-neutral-500"
            >
              Supports PNG, JPG, WEBP up to {maxSizeMB}MB
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
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring' as const, bounce: 0, duration: 0.4 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/60 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileObj.preview}
                      alt={`Preview ${idx}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
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
