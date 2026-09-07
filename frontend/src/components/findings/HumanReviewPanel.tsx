import React, { useState } from 'react';
import { UserRound, CheckCircle2, XCircle, PenLine, CornerDownRight, Scan, Loader2 } from 'lucide-react';
import type { Finding, ReviewEntry, HumanReviewDecision } from '@/lib/api';
import { FieldEditor } from './FieldEditor';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HumanReviewPanelProps {
  finding: Finding;
  reviewEntry?: ReviewEntry;
  onVerify: (comment?: string) => Promise<void>;
  onReject: (comment: string) => Promise<void>;
  onEditValue?: (key: string, value: unknown) => Promise<void>;
  declarationKey: string;
  declarationValue?: unknown;
  onViewEvidence?: () => void;
}

export function HumanReviewPanel({
  finding,
  reviewEntry,
  onVerify,
  onReject,
  onEditValue,
  declarationKey,
  declarationValue,
  onViewEvidence,
}: HumanReviewPanelProps) {
  const pending = finding.requiresHumanReview && !reviewEntry;
  const [mode, setMode] = useState<'closed' | 'verify' | 'reject'>('closed');
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [draft, setDraft] = useState<unknown>(declarationValue);
  const [saving, setSaving] = useState(false);

  const canShowEvidence = !!onViewEvidence && !!finding.evidenceImageId;
  const reviewerName = typeof reviewEntry?.reviewedBy === 'string' ? reviewEntry.reviewedBy : (reviewEntry?.reviewedBy as any)?.name || 'Inspector';

  const submit = async (decision: HumanReviewDecision) => {
    if (decision === 'REJECTED' && !comment.trim()) return;
    setSaving(true);
    try {
      if (decision === 'VERIFIED') await onVerify(comment);
      else await onReject(comment);
      setMode('closed');
      setComment('');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!onEditValue) return;
    setSaving(true);
    try {
      await onEditValue(declarationKey, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Action Buttons for Pending Review */}
      {pending && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {canShowEvidence && (
              <button
                onClick={onViewEvidence}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#1C1B1A] dark:border-[#F9F8F6] text-[10px] font-bold uppercase tracking-widest text-[#1C1B1A] dark:text-[#F9F8F6] hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A] transition-colors"
              >
                <Scan className="w-3.5 h-3.5" />
                Evidence
              </button>
            )}
            <button
              onClick={() => {
                setEditing(false);
                setMode(mode === 'verify' ? 'closed' : 'verify');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#3F6212] bg-[#ECFCCB] text-[#3F6212] text-[10px] font-bold uppercase tracking-widest hover:bg-[#3F6212] hover:text-[#ECFCCB] transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verify
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setMode(mode === 'reject' ? 'closed' : 'reject');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#991B1B] bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold uppercase tracking-widest hover:bg-[#991B1B] hover:text-[#FEE2E2] transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#57534E] text-[#57534E] dark:border-[#A8A29E] dark:text-[#A8A29E] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F5F5F4] dark:hover:bg-[#292524] transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          {editing && (
            <div className="bg-[#FFFFFF] dark:bg-[#1C1B1A] border border-[#E7E5E4] dark:border-[#292524] p-4">
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
            <div className="flex flex-col gap-3 p-4 bg-[#F5F5F4] dark:bg-[#121212] border-l-2 border-[#1C1B1A] dark:border-[#F9F8F6]">
              <textarea
                autoFocus
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder={
                  mode === 'reject'
                    ? 'Rejection requires justification for the audit trail.'
                    : 'Optional justification (e.g. Verified via manual check).'
                }
                className="w-full text-sm font-sans bg-[#FFFFFF] dark:bg-[#1C1B1A] border border-[#E7E5E4] dark:border-[#292524] p-3 focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] resize-none"
                disabled={saving}
              />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-mono text-[10px] text-[#57534E] dark:text-[#A8A29E] uppercase tracking-widest">
                  {mode === 'reject' ? 'Mandatory comment' : 'Optional comment'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMode('closed');
                      setComment('');
                    }}
                    className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-[#F9F8F6]"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submit(mode === 'verify' ? 'VERIFIED' : 'REJECTED')}
                    disabled={saving || (mode === 'reject' && !comment.trim())}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-6 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors disabled:opacity-50",
                      mode === 'verify'
                        ? "border-[#3F6212] bg-[#3F6212] text-[#F9F8F6] hover:bg-[#F9F8F6] hover:text-[#3F6212]"
                        : "border-[#991B1B] bg-[#991B1B] text-[#F9F8F6] hover:bg-[#F9F8F6] hover:text-[#991B1B]"
                    )}
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Trail for completed reviews */}
      {!pending && reviewEntry && (
        <div className="mt-4 p-4 border border-[#E7E5E4] dark:border-[#292524] bg-[#F5F5F4] dark:bg-[#1C1B1A]">
          <div className="flex flex-col gap-2">
            {reviewEntry.reviewComment && (
              <p className="font-display text-lg italic text-[#1C1B1A] dark:text-[#F9F8F6]">
                "{reviewEntry.reviewComment}"
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 font-mono text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E]">
              <span className="flex items-center gap-1.5">
                <UserRound className="w-3 h-3" />
                {reviewerName}
              </span>
              {reviewEntry.reviewedAt && (
                <span className="flex items-center gap-1.5">
                  {new Date(reviewEntry.reviewedAt).toLocaleString('en-GB')}
                </span>
              )}
            </div>
            {(reviewEntry.previousStatus || reviewEntry.resultingStatus) && (
              <div className="mt-4 pt-4 border-t border-[#E7E5E4] dark:border-[#292524] font-mono text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E]">
                <span className="flex items-center gap-1.5">
                  <CornerDownRight className="w-3 h-3" />
                  Prior Result: {reviewEntry.previousStatus || '—'} → Authorized: {reviewEntry.resultingStatus || '—'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
