import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, HelpCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ComplianceStatus = 
  | 'COMPLIANT' 
  | 'NON_COMPLIANT' 
  | 'REVIEW_REQUIRED' 
  | 'NOT_APPLICABLE' 
  | 'INSUFFICIENT_EVIDENCE';

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<ComplianceStatus, { label: string, color: string, icon: React.ReactNode }> = {
  COMPLIANT: {
    label: 'Compliant',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200/50 dark:border-green-800/50',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  NON_COMPLIANT: {
    label: 'Non-Compliant',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200/50 dark:border-red-800/50',
    icon: <XCircle className="w-3.5 h-3.5" />
  },
  REVIEW_REQUIRED: {
    label: 'Review Required',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50',
    icon: <AlertCircle className="w-3.5 h-3.5" />
  },
  NOT_APPLICABLE: {
    label: 'N/A',
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50',
    icon: <MinusCircle className="w-3.5 h-3.5" />
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50',
    icon: <HelpCircle className="w-3.5 h-3.5" />
  }
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NOT_APPLICABLE;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-tight",
      config.color,
      className
    )}>
      {showIcon && config.icon}
      {config.label}
    </span>
  );
}
