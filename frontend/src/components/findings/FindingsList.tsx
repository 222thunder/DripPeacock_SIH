'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge, type ComplianceStatus } from './StatusBadge';
import { Filter } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Finding {
  ruleId: string;
  field: string;
  status: ComplianceStatus;
  rule_description?: string;
  observedValue?: string;
  expectedCondition: string;
  explanation: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresHumanReview: boolean;
}

interface FindingsListProps {
  findings?: Finding[];
  declarations?: Record<string, any>;
  missing_fields?: string[];
}

type FilterType = 'ALL' | ComplianceStatus;

export function FindingsList({ findings = [], declarations = {}, missing_fields = [] }: FindingsListProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');

  const filteredFindings = useMemo(() => {
    if (filter === 'ALL') return findings;
    return findings.filter(f => f.status === filter);
  }, [findings, filter]);

  const counts = useMemo(() => {
    return {
      ALL: findings.length,
      COMPLIANT: findings.filter(f => f.status === 'COMPLIANT').length,
      NON_COMPLIANT: findings.filter(f => f.status === 'NON_COMPLIANT').length,
      REVIEW_REQUIRED: findings.filter(f => f.status === 'REVIEW_REQUIRED').length,
    };
  }, [findings]);

  const overallStatus = useMemo(() => {
    if (findings.length === 0) return 'NOT_APPLICABLE';
    if (counts.NON_COMPLIANT > 0) return 'NON_COMPLIANT';
    if (counts.REVIEW_REQUIRED > 0) return 'REVIEW_REQUIRED';
    if (counts.COMPLIANT > 0 && counts.COMPLIANT === findings.length) return 'COMPLIANT';
    return 'REVIEW_REQUIRED';
  }, [counts, findings.length]);

  const bannerConfig = {
    COMPLIANT: { bg: 'bg-green-500 text-white', label: 'Fully Compliant' },
    NON_COMPLIANT: { bg: 'bg-red-500 text-white', label: 'Non-Compliant Issues Found' },
    REVIEW_REQUIRED: { bg: 'bg-amber-500 text-white', label: 'Review Required' },
    NOT_APPLICABLE: { bg: 'bg-zinc-500 text-white', label: 'Analysis Complete' },
  }[overallStatus as 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE'];

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("px-6 py-4 rounded-2xl shadow-sm flex items-center justify-between", bannerConfig?.bg)}
      >
        <div className="flex flex-col">
          <span className="text-sm opacity-90 font-medium">Overall Status</span>
          <span className="text-xl font-bold tracking-tight">{bannerConfig?.label}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{counts.COMPLIANT}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Pass</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{counts.NON_COMPLIANT}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Fail</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{counts.REVIEW_REQUIRED}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Review</span>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-zinc-400 mr-2 flex-shrink-0" />
        {(['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 whitespace-nowrap",
              filter === f 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm" 
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/50"
            )}
          >
            <span>{f === 'ALL' ? 'All Findings' : f.replace('_', ' ')}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-xs",
              filter === f ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"
            )}>
              {counts[f as keyof typeof counts] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredFindings.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-zinc-500 dark:text-zinc-400"
            >
              No findings match the selected filter.
            </motion.div>
          ) : (
            filteredFindings.map((finding, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring" as const, bounce: 0, duration: 0.4 }}
                key={`${finding.ruleId}-${finding.field}-${index}`}
                className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="pr-4">
                    <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {finding.rule_description || `Rule: ${finding.ruleId} (${finding.field.replace(/_/g, ' ')})`}
                    </h4>
                    {finding.requiresHumanReview && (
                      <span className="inline-block mt-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Human Review Required
                      </span>
                    )}
                  </div>
                  <StatusBadge status={finding.status} className="flex-shrink-0" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Observed</span>
                    <div className="font-medium text-zinc-900 dark:text-zinc-200 break-words bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                      {finding.observedValue || '—'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Expected</span>
                    <div className="font-medium text-zinc-900 dark:text-zinc-200 break-words bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                      {finding.expectedCondition}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {finding.explanation}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
