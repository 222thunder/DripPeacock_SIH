'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Clock, Scan } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { apiClient, getStoredRole, type Finding, type ReviewEntry, type HumanReviewDecision, type DeclarationValue } from '@/lib/api';
import { StatusBadge, type ComplianceStatus } from '@/components/findings/StatusBadge';
import { Badge } from '@/components/Badge';
import { ConfidenceMeter } from '@/components/findings/ConfidenceMeter';
import { countStatuses, overallStatus } from '@/lib/compliance';
import { ExtractedDeclarations } from '@/components/findings/ExtractedDeclarations';
import { HumanReviewPanel } from '@/components/findings/HumanReviewPanel';
import { EvidenceLightbox } from '@/components/findings/EvidenceLightbox';
import { fadeUp, fadeUpReduced, staggerContainer } from '@/lib/motion';

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
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<Finding | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const role = getStoredRole();
  const canFinalize = ['SUPERVISOR', 'ADMIN'].includes(role || '');
  const reduce = useReducedMotion();
  const enter = reduce ? fadeUpReduced : fadeUp;
  const handleFinalize = async () => {
    if (!inspection?._id || finalizing) return;
    setFinalizing(true);
    try {
      const updated = await apiClient.finalizeInspection(inspection._id);
      setInspection(updated as unknown as Inspection);
    } catch (err: unknown) {
      alert('Failed to finalize: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFinalizing(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiClient.getInspection(id).then((data) => {
      if (!cancelled) setInspection(data);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load inspection.');
    });
    return () => { cancelled = true; };
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
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already been reviewed')) {
        try {
          const refreshed = await apiClient.getInspection(inspection._id);
          setInspection(refreshed as unknown as Inspection);
        } catch (e) { console.error('Failed to refresh inspection after review conflict', e); }
      } else {
        alert('Failed to save review: ' + msg);
      }
    }
  };

  const handleEditValue = async (key: string, value: unknown) => {
    if (!inspection?._id) return;
    try {
      const updated = await apiClient.updateDeclarations(inspection._id, { [key]: { value } }, inspection.category);
      setInspection(updated as unknown as Inspection);
    } catch (err: unknown) {
      alert('Failed to save field: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (isFetching) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="font-mono text-sm uppercase tracking-widest text-[#A8A29E]">Retrieving dossier...</span>
    </div>
  );

  if (error || !inspection || !id) return (
    <div className="max-w-md mx-auto px-6 py-32 text-center space-y-6">
      <h2 className="font-display text-3xl text-[#1C1B1A] dark:text-[#F9F8F6]">Record Not Found</h2>
      <p className="font-sans text-sm text-[#57534E] dark:text-[#A8A29E]">{error || 'Inspection not found.'}</p>
      <button onClick={() => router.push('/dashboard')} className="border border-[#1C1B1A] dark:border-[#F9F8F6] px-6 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A] transition-colors">
        Return to Ledger
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 space-y-16">
      
      {/* Dossier Header */}
      <motion.header
        className="border-b-2 border-[#1C1B1A] dark:border-[#F9F8F6] pb-10"
        initial="hidden"
        animate="show"
        variants={enter}
      >
        <button onClick={() => router.back()} className="active-scale flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#57534E] hover:text-[#1C1B1A] dark:text-[#A8A29E] dark:hover:text-[#F9F8F6] mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Return
        </button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="font-mono text-sm font-semibold text-[#57534E] dark:text-[#A8A29E] mb-2 block">Dossier / {inspection.inspectionId}</span>
            <h1 className="font-display text-4xl lg:text-5xl text-[#1C1B1A] dark:text-[#F9F8F6] tracking-tight">
              {(inspection.productId && typeof inspection.productId === 'object' ? inspection.productId.name : null) || (inspection.extractedDeclarations?.commodity_name?.value as string) || 'Unknown Entity'}
            </h1>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-sans uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E]">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {inspection.createdAt ? new Date(inspection.createdAt).toLocaleString('en-GB') : '—'}</span>
              <span>Inspector: {typeof inspection.inspectorId === 'string' ? inspection.inspectorId : (inspection.inspectorId?.name || 'Unassigned')}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-4">
            <StatusBadge status={status as ComplianceStatus} />
            <div className="flex items-center gap-3">
              {inspection.reviewStatus && (
                <span className="text-xs uppercase tracking-widest font-semibold text-[#3F6212] dark:text-[#ECFCCB] border border-[#3F6212] dark:border-[#ECFCCB] px-3 py-2">
                  Finalized
                </span>
              )}
              <button onClick={handleReport} className="active-scale flex items-center gap-2 border border-[#1C1B1A] dark:border-[#F9F8F6] px-5 py-2.5 text-xs uppercase tracking-widest font-semibold hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A] transition-colors">
                <FileText className="w-4 h-4" /> Generate Report
              </button>
              {canFinalize && inspection.reviewStatus !== 'APPROVED' && (
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="active-scale flex items-center gap-2 bg-[#1C1B1A] dark:bg-[#F9F8F6] text-[#F9F8F6] dark:text-[#1C1B1A] px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-60"
                >
                  {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Approve &amp; Finalize
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Grid Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Left Column: Evidence & Declarations */}
        <motion.div
          className="lg:col-span-5 space-y-16"
          initial="hidden"
          animate="show"
          variants={enter}
        >
          
          {/* Summary Block */}
          <section className="border-l border-[#1C1B1A] dark:border-[#F9F8F6] pl-6">
            <h2 className="font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] mb-4">Diagnostic Summary</h2>
            <div className="font-display text-3xl text-[#1C1B1A] dark:text-[#F9F8F6] mb-6">
              {summaryOverall === 'NON_COMPLIANT' ? 'Non-Compliant' : summaryOverall === 'REVIEW_REQUIRED' ? 'Review Required' : summaryOverall}
            </div>
            <div className="flex gap-8">
              <div>
                <div className="text-2xl font-mono text-[#3F6212] dark:text-[#ECFCCB]">{counts.pass}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E] font-semibold mt-1">Pass</div>
              </div>
              <div>
                <div className="text-2xl font-mono text-[#9A3412] dark:text-[#FFEDD5]">{counts.review}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E] font-semibold mt-1">Review</div>
              </div>
              <div>
                <div className="text-2xl font-mono text-[#991B1B] dark:text-[#FEE2E2]">{counts.fail}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E] font-semibold mt-1">Fail</div>
              </div>
            </div>
          </section>

          {/* Evidence */}
          {inspection.images && inspection.images.length > 0 && (
            <section>
              <h2 className="font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] mb-6 border-b border-[#E7E5E4] dark:border-[#292524] pb-2">Material Evidence</h2>
              <div className="space-y-4">
                {inspection.images.map((img, i) => (
                  <div key={i} className="relative w-full aspect-[4/3] bg-[#F5F5F4] dark:bg-[#1C1B1A] border border-[#E7E5E4] dark:border-[#292524]">
                    {img.startsWith('http') || img.startsWith('data:') ? (
                      <Image src={img} alt={`Evidence ${i + 1}`} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[#A8A29E]">{img}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Extracted Data */}
          <section>
            <h2 className="font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] mb-6 border-b border-[#E7E5E4] dark:border-[#292524] pb-2">Extracted Topology</h2>
            <div className="bg-[#FFFFFF] dark:bg-[#1C1B1A] p-6 border border-[#E7E5E4] dark:border-[#292524]">
              <ExtractedDeclarations declarations={declarations as unknown as Record<string, DeclarationValue>} missing_fields={inspection.missing_fields || []} onSaveField={handleEditValue} />
            </div>
          </section>

        </motion.div>

        {/* Right Column: Findings Ledger */}
        <div className="lg:col-span-7">
          <section>
            <h2 className="font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] mb-6 border-b border-[#1C1B1A] dark:border-[#F9F8F6] pb-2">Legislative Findings</h2>
            
            {findings.length > 0 ? (
              <motion.div
                className="space-y-8"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {findings.map((f, i) => {
                  const reviewEntry = reviewed[findingKey(f)] || reviewed[`${f.ruleId}:${f.field}`];
                  const isPending = f.requiresHumanReview && !reviewEntry;

                  return (
                    <motion.article
                      key={`${f.ruleId}-${f.field}-${i}`}
                      className="border-b border-[#E7E5E4] dark:border-[#292524] pb-8 last:border-0"
                      variants={enter}
                    >
                      
                      {/* Grid Header with aligned badges */}
                      <div className="flex flex-col gap-3 mb-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                          <h3 className="font-display text-2xl text-[#1C1B1A] dark:text-[#F9F8F6] m-0">
                            {f.ruleId} {f.ruleVersion && <span className="font-sans text-xs text-[#A8A29E] font-normal ml-2 tracking-widest">v{f.ruleVersion}</span>}
                          </h3>
                          <StatusBadge status={f.status} showIcon={false} />
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs text-[#57534E] dark:text-[#A8A29E]">
                            Field: {formatFieldName(f.field)} {f.sourceReference && `· Ref: ${f.sourceReference}`}
                          </span>
                          
                          {f.severity === 'HIGH' && (
                            <Badge className="border-[#991B1B] text-[#991B1B] bg-[#FEE2E2] dark:border-[#FCA5A5] dark:text-[#FCA5A5] dark:bg-[#991B1B]/30">High Priority</Badge>
                          )}
                          
                          {f.requiresHumanReview && (
                            <Badge className="border-[#9A3412] text-[#9A3412] bg-[#FFEDD5] dark:border-[#FFEDD5] dark:text-[#FFEDD5] dark:bg-[#9A3412]/30">
                              Human Verification
                            </Badge>
                          )}

                          {isPending && (
                            <Badge className="border-[#57534E] text-[#57534E] bg-[#F5F5F4] dark:border-[#A8A29E] dark:text-[#A8A29E] dark:bg-[#292524]">
                              Pending
                            </Badge>
                          )}
                          
                          {reviewEntry && (
                            <Badge className={reviewEntry.reviewStatus === 'VERIFIED' ? "border-[#3F6212] text-[#3F6212] bg-[#ECFCCB] dark:border-[#ECFCCB] dark:text-[#ECFCCB] dark:bg-[#3F6212]/30" : "border-[#991B1B] text-[#991B1B] bg-[#FEE2E2] dark:border-[#FCA5A5] dark:text-[#FCA5A5] dark:bg-[#991B1B]/30"}>
                              {reviewEntry.reviewStatus === 'VERIFIED' ? 'Verified' : 'Rejected'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6 bg-[#F5F5F4] dark:bg-[#121212] p-4 border-l-2 border-[#1C1B1A] dark:border-[#F9F8F6]">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-bold text-[#78716C] mb-1">Observed</div>
                          <div className="font-sans text-sm text-[#1C1B1A] dark:text-[#F9F8F6]">{f.observedValue || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-bold text-[#78716C] mb-1">Expected</div>
                          <div className="font-sans text-sm text-[#1C1B1A] dark:text-[#F9F8F6]">{f.expectedCondition || '—'}</div>
                        </div>
                      </div>

                      {f.explanation && (
                        <p className="font-sans text-sm text-[#57534E] dark:text-[#E7E5E4] leading-relaxed mb-6 max-w-prose">
                          {f.explanation}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#A8A29E] font-sans">
                        <span className="flex items-center gap-2">
                          System Confidence <ConfidenceMeter confidence={f.confidence} showText />
                        </span>
                        {f.evidenceImageId && (
                          <a href={f.evidenceImageId} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#1C1B1A] dark:hover:text-[#F9F8F6] transition-colors">
                            <Scan className="w-3 h-3" />
                            {f.boundingBox ? `Region [${f.boundingBox.width}x${f.boundingBox.height}]` : 'Source Evidence'}
                          </a>
                        )}
                      </div>

                      {f.requiresHumanReview && !reviewEntry && (
                        <div className="mt-8 pt-6 border-t border-[#E7E5E4] dark:border-[#292524]">
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
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </motion.div>
            ) : (
              <p className="font-sans text-sm text-[#57534E] dark:text-[#A8A29E]">No legislative flags generated for this record.</p>
            )}
          </section>
        </div>

      </div>

      {activeEvidence && activeEvidence.evidenceImageId && (
        <EvidenceLightbox
          imageUrl={activeEvidence.evidenceImageId}
          boundingBox={activeEvidence.boundingBox}
          title={`${activeEvidence.ruleId} — ${formatFieldName(activeEvidence.field)}`}
          onClose={() => setActiveEvidence(null)}
        />
      )}
    </div>
  );
}
