'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfidenceMeterProps {
  confidence?: number | null;
  className?: string;
  showText?: boolean;
}

export function ConfidenceMeter({ confidence, className, showText = true }: ConfidenceMeterProps) {
  if (confidence === null || confidence === undefined) {
    return (
      <span className={cn("text-[10px] font-medium text-zinc-500", className)}>
        Unscored
      </span>
    );
  }

  const value = Math.max(0, Math.min(1, confidence));
  const percentage = Math.round(value * 100);

  let color = 'bg-red-500';
  let textColor = 'text-red-700 dark:text-red-400';

  if (value > 0.9) {
    color = 'bg-green-500';
    textColor = 'text-green-700 dark:text-green-400';
  } else if (value >= 0.7) {
    color = 'bg-amber-500';
    textColor = 'text-amber-700 dark:text-amber-400';
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)} title={`Confidence: ${percentage}%`}>
      <div className="relative w-10 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className={cn("absolute top-0 left-0 h-full rounded-full", color)}
        />
      </div>
      {showText && (
        <span className={cn("text-[10px] font-bold tabular-nums", textColor)}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
