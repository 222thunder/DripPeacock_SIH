import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, HelpCircle, EyeOff, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ComplianceStatus =
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'UNABLE_TO_VERIFY'
  | 'CONFIRMED_NON_COMPLIANT'
  | 'NOT_APPLICABLE'
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'REVIEW_REQUIRED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'PENDING';

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<ComplianceStatus, { label: string, color: string, icon: React.ReactNode }> = {
  DETECTED: {
    label: 'Detected',
    color: 'bg-green-600 text-white dark:bg-green-500 border-2 border-green-700 dark:border-green-400',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  NOT_DETECTED: {
    label: 'Not Detected',
    color: 'bg-amber-500 text-white dark:bg-amber-500 border-2 border-amber-600 dark:border-amber-400',
    icon: <EyeOff className="w-4 h-4" />
  },
  UNABLE_TO_VERIFY: {
    label: 'Unable to Verify',
    color: 'bg-slate-600 text-white dark:bg-slate-600 border-2 border-slate-700 dark:border-slate-400',
    icon: <HelpCircle className="w-4 h-4" />
  },
  CONFIRMED_NON_COMPLIANT: {
    label: 'Non-Compliant',
    color: 'bg-red-600 text-white dark:bg-red-500 border-2 border-red-700 dark:border-red-400',
    icon: <XCircle className="w-4 h-4" />
  },
  NOT_APPLICABLE: {
    label: 'N/A',
    color: 'bg-zinc-500 text-white dark:bg-zinc-600 border-2 border-zinc-600 dark:border-zinc-400',
    icon: <MinusCircle className="w-4 h-4" />
  },
  COMPLIANT: {
    label: 'Compliant',
    color: 'bg-green-600 text-white dark:bg-green-500 border-2 border-green-700 dark:border-green-400',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  NON_COMPLIANT: {
    label: 'Non-Compliant',
    color: 'bg-red-600 text-white dark:bg-red-500 border-2 border-red-700 dark:border-red-400',
    icon: <XCircle className="w-4 h-4" />
  },
  REVIEW_REQUIRED: {
    label: 'Review Required',
    color: 'bg-amber-500 text-white dark:bg-amber-500 border-2 border-amber-600 dark:border-amber-400',
    icon: <AlertCircle className="w-4 h-4" />
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    color: 'bg-slate-500 text-white dark:bg-slate-600 border-2 border-slate-600 dark:border-slate-400',
    icon: <HelpCircle className="w-4 h-4" />
  },
  PENDING: {
    label: 'Pending',
    color: 'bg-zinc-500 text-white dark:bg-zinc-600 border-2 border-zinc-600 dark:border-zinc-400',
    icon: <Clock className="w-4 h-4" />
  }
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NOT_APPLICABLE;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-md",
      config.color,
      className
    )}>
      {showIcon && config.icon}
      {config.label}
    </span>
  );
}