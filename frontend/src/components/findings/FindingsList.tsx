'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { StatusBadge } from './StatusBadge';
import { ConfidenceMeter } from './ConfidenceMeter';
import { Filter, Scan, XCircle, CheckCircle2, PenLine } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Finding, FindingStatus, HumanReviewDecision, ReviewEntry } from '@/lib/api';
import { countStatuses, overallStatus } from '@/lib/compliance';
import { easeOut } from '@/lib/motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FindingView extends Finding {
  rule_description?: string;
}

interface FindingsListProps {
  findings?: FindingView[];
  reviewed?: Record<string, ReviewEntry>;
  onReviewDecision?: (key: string, entry: ReviewEntry) => void;
}

type FilterType = 'ALL' | FindingStatus;

const FILTERS: FilterType[] = ['ALL', 'DETECTED', 'CONFIRMED_NON_COMPLIANT', 'NOT_DETECTED', 'UNABLE_TO_VERIFY', 'NOT_APPLICABLE'];

const findingKey = (f: Finding) => `${f.ruleId}:${f.field}`;

const DECISION_OPTIONS: Array<{ decision: HumanReviewDecision; label: string; className: string }> = [
  { decision: 'VERIFIED', label: 'Verify', className: 'text-green-700 dark:text-green-400 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/40' },
  { decision: 'REJECTED', label: 'Reject', className: 'text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40' },
];

export function FindingsList({ findings = [], reviewed = {}, onReviewDecision }: FindingsListProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const reduce = useReducedMotion();

  const filteredFindings = useMemo(() => {
    if (filter === 'ALL') return findings;
    return findings.filter((f) => f.status === filter);
  }, [findings, filter]);

  const counts = useMemo(() => countStatuses(findings), [findings]);
  const overall = overallStatus(counts);

  const bannerConfig = {
    COMPLIANT: { bg: 'bg-green-500 text-white', label: 'Fully Compliant' },
    NON_COMPLIANT: { bg: 'bg-red-500 text-white', label: 'Non-Compliant Issues Found' },
    REVIEW_REQUIRED: { bg: 'bg-amber-500 text-white', label: 'Review Required' },
    NOT_APPLICABLE: { bg: 'bg-zinc-500 text-white', label: 'Analysis Complete' },
  }[overall];

  return (
    <div className="space-y-6">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: 0.22, ease: easeOut }}
        className={cn("px-6 py-4 rounded-2xl shadow-sm flex items-center justify-between", bannerConfig?.bg)}
      >
        <div className="flex flex-col">
          <span className="text-sm opacity-90 font-medium">Overall Status</span>
          <span className="text-xl font-bold tracking-tight">{bannerConfig?.label}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{counts.pass}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Pass</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{counts.review}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Review</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{counts.fail}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Fail</span>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-zinc-400 mr-2 flex-shrink-0" />
        {FILTERS.map((f) => {
          const badgeCount =
            f === 'ALL'
              ? counts.total
              : f === 'DETECTED'
                ? counts.pass
                : f === 'CONFIRMED_NON_COMPLIANT'
                  ? counts.fail
                  : f === 'NOT_APPLICABLE'
                    ? counts.notApplicable
                    : f === 'NOT_DETECTED' || f === 'UNABLE_TO_VERIFY'
                      ? findings.filter((x) => x.status === f).length
                      : 0;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "active-scale flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
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
                {badgeCount}
              </span>
            </button>
          );
        })}
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
            filteredFindings.map((finding) => {
              const key = findingKey(finding);
              const decision = reviewed[key];
              return (
                <motion.div
                  layout
                  initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px) scale(0.98)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                  exit={{ opacity: 0, transform: 'scale(0.98)', transition: { duration: 0.15, ease: easeOut } }}
                  transition={{ duration: 0.22, ease: easeOut }}
                  key={key}
                  className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="pr-4 min-w-0">
                      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight break-words whitespace-nowrap overflow-hidden text-ellipsis">
                        {finding.rule_description || `Rule ${finding.ruleId} — ${finding.field.replace(/_/g, ' ')}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {finding.sourceReference && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {finding.sourceReference}
                          </span>
                        )}
                        {finding.severity === 'HIGH' && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">
                            High
                          </span>
                        )}
                        {decision?.reviewStatus === 'VERIFIED' && (
                          <span className="inline-block text-xs font-extrabold uppercase tracking-wide bg-green-500 text-white px-2.5 py-1 rounded-full border-2 border-green-600 shadow-sm">
                            Verified
                          </span>
                        )}
                        {decision?.reviewStatus === 'REJECTED' && (
                          <span className="inline-block text-xs font-extrabold uppercase tracking-wide bg-rose-500 text-white px-2.5 py-1 rounded-full border-2 border-rose-600 shadow-sm">
                            Rejected
                          </span>
                        )}
                        {finding.requiresHumanReview && !decision && (
                          <span className="inline-block text-xs font-extrabold uppercase tracking-wide bg-amber-500 text-white px-2.5 py-1 rounded-full border-2 border-amber-600 shadow-sm">
                            Human Review Required
                          </span>
                        )}
                      </div>
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
                        {finding.expectedCondition || '—'}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    {finding.explanation}
                  </p>

                  <div className="flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800/50 pt-3">
                    <ConfidenceMeter confidence={finding.confidence} showText />

                    {finding.evidenceImageId && (
                      <a
                        href={finding.evidenceImageId}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                        title={
                          finding.boundingBox
                            ? `Region x=${finding.boundingBox.x}, y=${finding.boundingBox.y}, ${finding.boundingBox.width}x${finding.boundingBox.height}`
                            : 'Source image'
                        }
                      >
                        <Scan className="w-3.5 h-3.5" />
                        {finding.boundingBox
                          ? `Evidence @ ${finding.boundingBox.width}x${finding.boundingBox.height}`
                          : 'View evidence image'}
                      </a>
                    )}
                  </div>

                  {finding.requiresHumanReview && !decision && onReviewDecision && (
                    <ReviewControls
                      findingKey={key}
                      decision={decision}
                      onDecision={(d) => onReviewDecision(key, d)}
                    />
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReviewControls({
  findingKey,
  decision,
  onDecision,
}: {
  findingKey: string;
  decision?: ReviewEntry;
  onDecision: (entry: ReviewEntry) => void;
}) {
  const pending = !decision;
  const active = (d: HumanReviewDecision) => decision?.decision === d;
  const selected = active('VERIFIED') || active('REJECTED');

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-700/60">
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
          Human Verification
        </span>
        {pending && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
            Pending
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {DECISION_OPTIONS.map((opt) => (
          <button
            key={opt.decision}
            disabled={active(opt.decision)}
            onClick={() =>
              onDecision({
                decision: opt.decision,
                comment: decision?.comment,
                reviewStatus: opt.decision,
                reviewedAt: new Date().toISOString(),
              })
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-white dark:bg-zinc-900 transition-all active:scale-95",
              opt.className,
              active(opt.decision) && "ring-2 ring-offset-1 ring-zinc-400"
            )}
          >
            {opt.decision === 'VERIFIED' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {opt.decision === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        ))}
        <span className="text-[11px] text-zinc-400">({findingKey})</span>
      </div>
      {selected && (
        <div className="mt-2">
          <textarea
            defaultValue={decision?.comment || ''}
            onBlur={(e) => {
              if (decision && e.target.value !== decision.comment) {
                onDecision({ ...decision, comment: e.target.value });
              }
            }}
            rows={2}
            placeholder={
              active('REJECTED')
                ? 'Reason required — why is this extraction incorrect or insufficient? (saved on blur)'
                : 'Optional verification note, e.g. "Verified from package image." (saved on blur)'
            }
            className="mt-2 w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      )}
    </div>
  );
}