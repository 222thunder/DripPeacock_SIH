'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Scale, ShieldCheck, Clock, Scan } from 'lucide-react';
import { apiClient, type Finding, type ReviewEntry, type HumanReviewDecision, type DeclarationValue } from '@/lib/api';
import { StatusBadge, type ComplianceStatus } from '@/components/findings/StatusBadge';
import { ConfidenceMeter } from '@/components/findings/ConfidenceMeter';
import { countStatuses, overallStatus } from '@/lib/compliance';
import { ExtractedDeclarations } from '@/components/findings/ExtractedDeclarations';
import { HumanReviewPanel } from '@/components/findings/HumanReviewPanel';
import { EvidenceLightbox } from '@/components/findings/EvidenceLightbox';

interface RowDeclaration {
  value?: unknown;
  confidence?: number | null;
  is_deterministic?: boolean;
}

interface Inspection {
  _id?: string;
  inspectionId?: string;
  status?: string;
  category?: string;
  inspectorId?: { name?: string; email?: string } | string | null;
  productId?: { name?: string } | string | null;
  declarations?: Record<string, RowDeclaration>;
  extractedDeclarations?: Record<string, RowDeclaration>;
  findings?: Finding[];
  raw_ocr?: string;
  missing_fields?: string[];
  llm_assisted?: boolean;
  createdAt?: string;
  images?: string[];
  notes?: string;
  reviewStatus?: string;
  reviewedFindings?: Record<string, ReviewEntry>;
}

const formatFieldName = (key: string): string => {
  const overrides: Record<string, string> = {
    mrp: 'MRP',
    mfg_date: 'Manufacturing Date',
    pkd_date: 'Packed Date',
    fssai_license: 'FSSAI License No.',
    consumer_care_email: 'Consumer Care Email',
    consumer_care_phone: 'Consumer Care Phone',
    net_quantity: 'Net Quantity',
    commodity_name: 'Commodity Name',
    country_of_origin: 'Country of Origin',
    mrp_inclusive_of_taxes: 'MRP Inclusive of Taxes',
    manufacturer: 'Manufacturer',
    packer: 'Packer',
  };
  if (overrides[key]) return overrides[key];
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<Finding | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiClient
      .getInspection(id)
      .then((data) => {
        if (cancelled) return;
        setInspection(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load inspection.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isFetching = !!id && !inspection && !error;

  const declarations = inspection?.declarations || inspection?.extractedDeclarations || {};
  const findings = inspection?.findings || [];
  const status = inspection?.status || 'PENDING';
  const counts = useMemo(() => countStatuses(inspection?.findings || []), [inspection?.findings]);
  const summaryOverall = useMemo(() => overallStatus(counts), [counts]);
  const reviewed = inspection?.reviewedFindings || {};
  const findingKey = (f: Finding) => `${f.ruleId}:${f.field}`;

  const handleReport = () => {
    if (!inspection?._id) return;
    router.push(`/report?id=${encodeURIComponent(inspection._id)}`);
  };

  const handleReviewFinding = async (findingId: string, decision: HumanReviewDecision, comment?: string) => {
    if (!inspection?._id) return;
    try {
      const updated = await apiClient.reviewFinding(inspection._id, findingId, decision, comment);
      setInspection(updated as unknown as Inspection);
    } catch (err: unknown) {
      console.error('Failed to save review:', err);
      alert('Failed to save review: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleEditValue = async (key: string, value: unknown) => {
    if (!inspection?._id) return;
    try {
      const declarationsToUpdate = {
        [key]: { value },
      };
      const updated = await apiClient.updateDeclarations(inspection._id, declarationsToUpdate, inspection.category);
      setInspection(updated as unknown as Inspection);
    } catch (err: unknown) {
      console.error('Failed to save field:', err);
      alert('Failed to save field: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const pendingReviews = findings.filter(
    (f) => f.requiresHumanReview && !reviewed[findingKey(f)]
  ).length;

  if (isFetching) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !inspection || !id) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <Scale className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Could not load inspection</h2>
        <p className="text-zinc-500 mb-6">{error || 'Inspection not found.'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Inspection {inspection.inspectionId}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5" />
                {inspection.createdAt
                  ? new Date(inspection.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Unknown date'}
                {inspection.reviewStatus && <> · Review: {inspection.reviewStatus}</>}
                <> · Inspector: {
                  !inspection.inspectorId ? 'Inspector not recorded' :
                  typeof inspection.inspectorId === 'string' ? inspection.inspectorId :
                  (inspection.inspectorId.name || inspection.inspectorId.email || 'Inspector not recorded')
                }</>
              </p>
              {inspection.productId && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-1.5 mt-1">
                  Product: {typeof inspection.productId === 'string' ? 'Unknown Product' : (inspection.productId.name || 'Unknown Product')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status as ComplianceStatus} />
            <button
              onClick={handleReport}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors active:scale-[0.97] shadow-sm shadow-blue-600/20"
            >
              <FileText className="w-4 h-4" />
              View Report
            </button>
          </div>
        </div>

        {/* Evidence Images */}
        {inspection.images && inspection.images.length > 0 && (
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
              Inspection Evidence
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {inspection.images.map((img, i) => (
                <div key={i} className="relative shrink-0 w-64 h-64 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 snap-center bg-zinc-100 dark:bg-zinc-900">
                  {img.startsWith('http') || img.startsWith('data:') ? (
                    <Image
                      src={img}
                      alt={`Evidence ${i + 1}`}
                      fill
                      unoptimized
                      sizes="256px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">
                      {img}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className={`rounded-3xl border p-6 flex flex-wrap items-center justify-between gap-4 ${summaryOverall === 'COMPLIANT' ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : summaryOverall === 'NON_COMPLIANT' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : summaryOverall === 'REVIEW_REQUIRED' ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800'}`}>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              <ShieldCheck className="w-4 h-4" /> Rule Checks Summary
            </div>
            <div className={`text-2xl font-bold tracking-tight ${summaryOverall === 'COMPLIANT' ? 'text-green-700 dark:text-green-400' : summaryOverall === 'NON_COMPLIANT' ? 'text-red-700 dark:text-red-400' : summaryOverall === 'REVIEW_REQUIRED' ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {summaryOverall === 'NON_COMPLIANT' ? 'NON-COMPLIANT' : summaryOverall === 'REVIEW_REQUIRED' ? 'REVIEW REQUIRED' : summaryOverall}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            {pendingReviews > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full">
                {pendingReviews} finding{pendingReviews > 1 ? 's' : ''} awaiting inspector verification
              </span>
            )}
            <div className="flex gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.pass}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Pass</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.review}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Review</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{counts.fail}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Fail</div>
            </div>
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Declarations */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Extracted Declarations
              </h2>
            </div>
            <ExtractedDeclarations
              declarations={declarations as unknown as Record<string, DeclarationValue>}
              missing_fields={inspection.missing_fields || []}
              onSaveField={handleEditValue}
            />
          </div>

          {/* Findings */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Scale className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Rule Findings
              </h2>
            </div>
            {findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map((f, i) => {
                  const reviewEntry = reviewed[findingKey(f)] || reviewed[`${f.ruleId}:${f.field}`];
                  return (
                  <div key={`${f.ruleId}-${f.field}-${i}`} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        {f.ruleId}
                        {f.ruleVersion && (
                          <span className="ml-2 text-xs font-normal text-zinc-500">v{f.ruleVersion}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.severity === 'HIGH' && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">High</span>
                        )}
                        {f.requiresHumanReview && (
                          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                            Review
                          </span>
                        )}
                        <StatusBadge status={f.status} showIcon={false} />
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                      {formatFieldName(f.field)}
                      {f.sourceReference && <span className="ml-2">{f.sourceReference}</span>}
                    </div>
                    {f.requiresHumanReview && (
                      <HumanReviewPanel
                        finding={f}
                        reviewEntry={reviewEntry}
                        declarationKey={f.field}
                        declarationValue={(declarations as Record<string, RowDeclaration>)[f.field]?.value}
                        onVerify={(comment) => handleReviewFinding(findingKey(f), 'VERIFIED', comment)}
                        onReject={(comment) => handleReviewFinding(findingKey(f), 'REJECTED', comment)}
                        onEditValue={handleEditValue}
                        onViewEvidence={() => setActiveEvidence(f)}
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-2">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">Observed</div>
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium break-words">{f.observedValue || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">Expected</div>
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium break-words">{f.expectedCondition || '—'}</div>
                      </div>
                    </div>
                    {f.explanation && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.explanation}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        Confidence
                        <ConfidenceMeter confidence={f.confidence} showText />
                      </span>
                      {f.evidenceImageId && (
                        <a href={f.evidenceImageId} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 hover:underline">
                          <Scan className="w-3.5 h-3.5" />
                          {f.boundingBox ? `Evidence ${f.boundingBox.width}x${f.boundingBox.height}` : 'Evidence image'}
                        </a>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No findings for this inspection.</p>
            )}
          </div>
        </div>
      </div>

      {activeEvidence && activeEvidence.evidenceImageId && (
        <EvidenceLightbox
          imageUrl={activeEvidence.evidenceImageId}
          boundingBox={activeEvidence.boundingBox}
          title={`Rule ${activeEvidence.ruleId} — ${formatFieldName(activeEvidence.field)}`}
          onClose={() => setActiveEvidence(null)}
        />
      )}
    </div>
  );
}
