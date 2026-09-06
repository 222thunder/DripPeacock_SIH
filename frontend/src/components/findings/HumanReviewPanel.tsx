'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  PenLine,
  Scan,
  Loader2,
  UserRound,
  ShieldQuestion,
  CornerDownRight,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FieldEditor } from './FieldEditor';
import type { Finding, ReviewEntry } from '@/lib/api';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface HumanReviewPanelProps {
  finding: Finding;
  reviewEntry?: ReviewEntry;
  declarationKey: string;
  declarationValue?: unknown;
  onVerify: (comment?: string) => void | Promise<void>;
  onReject: (comment: string) => void | Promise<void>;
  onEditValue: (key: string, value: unknown) => void | Promise<void>;
  onViewEvidence: () => void;
}

export function HumanReviewPanel({
  finding,
  reviewEntry,
  declarationKey,
  declarationValue,
  onVerify,
  onReject,
  onEditValue,
  onViewEvidence,
}: HumanReviewPanelProps) {
  const [mode, setMode] = useState<'closed' | 'verify' | 'reject'>('closed');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(declarationValue);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const pending = !reviewEntry;
  const canShowEvidence = !!finding.evidenceImageId;

  const submit = async (decision: 'verify' | 'reject') => {
    if (saving) return;
    setSaving(true);
    try {
      if (decision === 'verify') await onVerify(comment.trim() || undefined);
      else if (comment.trim()) await onReject(comment.trim());
      setMode('closed');
      setComment('');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onEditValue(declarationKey, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const reviewerName =
    reviewEntry?.reviewedByName ||
    (typeof reviewEntry?.reviewedBy === 'object' && reviewEntry?.reviewedBy
      ? reviewEntry.reviewedBy.name || reviewEntry.reviewedBy.email || 'Reviewer'
      : 'Reviewer');

  return (
    <div className="mt-4 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-700/60">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <ShieldQuestion className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
          Human Verification
        </span>
        {pending ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
            Verified by an officer is pending
          </span>
        ) : (
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
              reviewEntry?.reviewStatus === 'VERIFIED'
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30"
                : "text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30"
            )}
          >
            {reviewEntry?.reviewStatus === 'VERIFIED' ? 'Verified by inspector' : 'Rejected by inspector'}
          </span>
        )}
      </div>

      {/* Reviewed-by detail */}
      {!pending && reviewEntry && (
        <div className="mt-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 p-3 text-sm">
          {reviewEntry.reviewStatus === 'VERIFIED' && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Verified</span>
              <span className="text-xs font-normal text-emerald-600/80 dark:text-emerald-500/80">
                The inspector confirms the extraction matches the package evidence.
              </span>
            </div>
          )}
          {reviewEntry.reviewStatus === 'REJECTED' && (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-1.5">
              <XCircle className="w-4 h-4" />
              <span className="font-semibold">Rejected</span>
              <span className="text-xs font-normal text-rose-600/80 dark:text-rose-500/80">
                The extraction is incorrect; original AI result is preserved below.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <UserRound className="w-3 h-3" />
              {reviewerName}
            </span>
            {reviewEntry.reviewedAt && (
              <span className="inline-flex items-center gap-1">
                {new Date(reviewEntry.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </div>
          {reviewEntry.reviewComment && (
            <div className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-500 dark:text-zinc-500 italic">&ldquo;{reviewEntry.reviewComment}&rdquo;</span>
            </div>
          )}
          {(reviewEntry.previousStatus || reviewEntry.resultingStatus) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
              <CornerDownRight className="w-3 h-3" />
              <span>
                Original AI result <strong>{reviewEntry.previousStatus || '—'}</strong> preserved;
                rule re-evaluated → <strong>{reviewEntry.resultingStatus || '—'}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions for pending review */}
      {pending && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            {canShowEvidence && (
              <button
                onClick={onViewEvidence}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-900/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors active:scale-[0.97]"
              >
                <Scan className="w-3.5 h-3.5" />
                View Evidence
              </button>
            )}
            <button
              onClick={() => {
                setEditing(false);
                setMode(mode === 'verify' ? 'closed' : 'verify');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors active:scale-[0.97]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verify
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setMode(mode === 'reject' ? 'closed' : 'reject');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-[0.97]"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
            <button
              onClick={() => {
                setMode('closed');
                setEditing(!editing);
                if (!editing) setDraft(declarationValue);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors active:scale-[0.97]"
            >
              <PenLine className="w-3.5 h-3.5" />
              Edit Value
            </button>
          </div>

          {editing && (
            <div className="mt-3">
              <FieldEditor
                fieldKey={declarationKey}
                value={draft}
                onChange={setDraft}
                onSave={saveEdit}
                onCancel={() => setEditing(false)}
                isSaving={saving}
              />
            </div>
          )}

          {mode !== 'closed' && (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder={
                  mode === 'reject'
                    ? 'Reason required — why is this extraction incorrect or insufficient?'
                    : 'Optional — e.g. "Verified from package image."'
                }
                className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                disabled={saving}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  {mode === 'reject'
                    ? 'A rejection reason is mandatory and stored in the audit trail.'
                    : 'Verification confirms the extraction; the rule engine still decides compliance.'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setMode('closed');
                      setComment('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submit(mode)}
                    disabled={saving || (mode === 'reject' && !comment.trim())}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed",
                      mode === 'verify'
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {mode === 'verify' ? 'Confirm Verify' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}