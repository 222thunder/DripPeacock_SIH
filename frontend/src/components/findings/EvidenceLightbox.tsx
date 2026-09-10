'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn, ZoomOut, Scan } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { BoundingBox } from '@/lib/api';
import { easeOut } from '@/lib/motion';

interface EvidenceLightboxProps {
  imageUrl?: string | null;
  boundingBox?: BoundingBox | null;
  title?: string;
  onClose: () => void;
}

const toPercent = (value: number | undefined | null): number => {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  const clamped = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, clamped));
};

export function EvidenceLightbox({ imageUrl, boundingBox, title, onClose }: EvidenceLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(true);
  const reduce = useReducedMotion();

  const requestClose = () => setOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!imageUrl) return null;

  const box = boundingBox
    ? {
        left: `${toPercent(boundingBox.x)}%`,
        top: `${toPercent(boundingBox.y)}%`,
        width: `${toPercent(boundingBox.width)}%`,
        height: `${toPercent(boundingBox.height)}%`,
      }
    : null;

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open ? (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={requestClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeOut }}
        >
          <motion.div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.96)' }}
            transition={{ duration: 0.22, ease: easeOut }}
          >
            <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-zinc-900 border border-b-0 border-zinc-700 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Scan className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-sm font-semibold text-zinc-100 truncate">
                  {title || 'Evidence image'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}
                  className="active-scale p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))}
                  className="active-scale p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-zinc-400 font-mono tabular-nums">{zoom.toFixed(1)}×</span>
                <button
                  onClick={requestClose}
                  className="active-scale p-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-b-2xl bg-black border border-zinc-700 overflow-auto max-h-[75vh]">
              <div
                className="relative origin-top-left"
                style={{
                  transform: `scale(${zoom})`,
                  transition: reduce ? undefined : 'transform 200ms var(--ease-out)',
                  width: '100%',
                }}
              >
                <Image
                  src={imageUrl}
                  alt="Evidence"
                  width={1600}
                  height={1600}
                  unoptimized
                  className="w-full h-auto block"
                />
                {box && (
                  <div
                    className="absolute border-2 border-red-500 ring-2 ring-red-400/40 rounded-sm"
                    style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                    title="Detected declaration region"
                  />
                )}
              </div>
            </div>

            {boundingBox && (
              <p className="mt-2 text-center text-xs text-zinc-400">
                Region overlay approximates the detected declaration box on the source image.
              </p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
