'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Printer, ArrowLeft, Scale, ShieldCheck, ThumbsUp, Scan } from 'lucide-react';
import { StatusBadge } from '@/components/findings/StatusBadge';
import { ConfidenceMeter } from '@/components/findings/ConfidenceMeter';
import { apiClient, type DeclarationValue, type ComplianceSummary, type Finding } from '@/lib/api';
import { countStatuses, overallStatus } from '@/lib/compliance';

interface ReportData {
  inspectionId?: string;
  status?: string;
  category?: string;
  declarations?: Record<string, DeclarationValue>;
  findings?: Finding[];
  raw_ocr?: string;
  missing_fields?: string[];
  llm_assisted?: boolean;
  createdAt?: string;
  images?: string[];
  productName?: string;
  summary?: ComplianceSummary;
  inspectorId?: { name?: string; email?: string } | string | null;
}

const formatFieldName = (key: string): string => {
  const overrides: Record<string, string> = {
    mrp: 'MRP',
    mfg_date: 'Manufacturing Date',
    pkd_date: 'Packed Date',
    expiry_date: 'Expiry Date',
    best_before: 'Best Before',
    fssai_license: 'FSSAI License No.',
    consumer_care: 'Consumer Care',
    net_quantity: 'Net Quantity',
    commodity_name: 'Commodity Name',
    country_of_origin: 'Country of Origin',
    mrp_inclusive_of_taxes: 'MRP Inclusive of Taxes',
    manufacturer: 'Manufacturer',
    packer: 'Packer',
    importer: 'Importer',
  };
  if (overrides[key]) return overrides[key];
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatValue = (key: string, val: DeclarationValue['value'] | undefined): string => {
  if (val === null || val === undefined) return '—';
  if (key === 'mrp' && typeof val === 'number') return `₹${val}`;

  if (typeof val === 'object' && val !== null) {
    const v = val as Record<string, unknown>;
    if (v.amount !== undefined && typeof v.amount === 'number') {
      const parts = [`${v.currency || '₹'}${v.amount}`];
      if (v.inclusive_of_taxes) parts.push('(incl. of all taxes)');
      return parts.join(' ');
    }
    if (v.value !== undefined && v.unit !== undefined) return `${v.value} ${v.unit}`;
    if (v.name !== undefined) return v.address ? `${v.name}, ${v.address}` : String(v.name);
    const parts = Object.values(v).filter((x) => x != null && x !== '' && (typeof x !== 'boolean' || x === true));
    return parts.length ? parts.map(String).join(', ') : JSON.stringify(v);
  }
  return String(val);
};

const statusLabel: Record<string, string> = {
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON-COMPLIANT',
  REVIEW_REQUIRED: 'REVIEW REQUIRED',
  NOT_APPLICABLE: 'NOT APPLICABLE',
};

function ReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [data, setData] = useState<ReportData | null>(() => {
    try {
      const stored = sessionStorage.getItem('sih_analysis_report');
      return stored ? (JSON.parse(stored) as ReportData) : null;
    } catch {
      return null;
    }
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load a stored inspection by ID if no live analysis data is present.
  useEffect(() => {
    if (data || !id) return;
    let cancelled = false;
    apiClient
      .getInspection(id)
      .then((inspection) => {
        if (cancelled) return;
        setData(inspection);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load inspection.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, data]);

  const isFetching = !data && !!id && !loadError;

  const counts = useMemo(() => countStatuses(data?.findings), [data?.findings]);
  const overall = useMemo(() => overallStatus(counts), [counts]);

  const reportNo = data?.inspectionId || 'LM-2026-000000';
  const dateStr = data?.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Loading report…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-200/70 print:bg-white">
      {/* Toolbar (hidden when printing) */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-zinc-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors active:scale-[0.97]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
              <FileText className="w-4 h-4" />
              Compliance Report
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors active:scale-[0.97] shadow-sm shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {!data ? (
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            {loadError ? 'Could not load inspection' : 'No report available'}
          </h2>
          <p className="text-zinc-500 mb-6">
            {loadError ? loadError : 'Run a product scan first to generate a compliance report.'}
          </p>
          <button
            onClick={() => router.push('/scanner')}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            {loadError ? 'Back to Scanner' : 'Go to Scanner'}
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:py-0 print:max-w-none">
          {/* Report Document */}
          <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden print:rounded-none print:border-0 print:shadow-none">
            {/* Header */}
            <div className="px-8 py-10 border-b border-zinc-100 bg-gradient-to-br from-zinc-50 to-white print:px-0 print:py-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold tracking-wide text-blue-600 uppercase">
                      Legal Metrology Inspection Report
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                    Packaged Commodity Compliance
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    Legal Metrology (Packaged Commodities) Rules, 2011
                  </p>
                  {data.category && (
                    <p className="mt-1 text-xs font-medium text-zinc-400">
                      Product category: <span className="text-zinc-600">{data.category}</span>
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-1">Report No.</div>
                  <div className="font-mono text-lg font-semibold text-zinc-900">{reportNo}</div>
                  <div className="mt-3 text-xs text-zinc-500 font-medium uppercase tracking-wide mb-1">Date</div>
                  <div className="text-sm font-medium text-zinc-700">{dateStr}</div>
                </div>
              </div>
            </div>

            {/* Overall Status */}
            <div className={`px-8 py-6 flex items-center justify-between ${overall === 'COMPLIANT' ? 'bg-green-50' : overall === 'NON_COMPLIANT' ? 'bg-red-50' : overall === 'REVIEW_REQUIRED' ? 'bg-amber-50' : 'bg-zinc-50'}`}>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  Overall Compliance Status
                </div>
                <div className={`text-2xl font-bold tracking-tight ${overall === 'COMPLIANT' ? 'text-green-700' : overall === 'NON_COMPLIANT' ? 'text-red-700' : overall === 'REVIEW_REQUIRED' ? 'text-amber-700' : 'text-zinc-600'}`}>
                  {statusLabel[overall] || overall}
                </div>
              </div>
              <div className="flex gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{counts.pass}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Pass</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{counts.review}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Review</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{counts.fail}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Fail</div>
                </div>
              </div>
            </div>

            <div className="px-8 py-8 space-y-10 print:px-0">
              {/* Product / Declarations */}
              <section>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 text-zinc-800">
                  Extracted Declarations
                </h2>
                {data.productName && (
                  <p className="mb-3 text-sm text-zinc-600">
                    <span className="font-semibold text-zinc-800">Product:</span> {data.productName}
                  </p>
                )}
                {data.declarations && Object.keys(data.declarations).length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field</th>
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Value</th>
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Confidence</th>
                        <th className="text-left py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {Object.entries(data.declarations)
                        .filter(([key]) => !key.startsWith('_'))
                        .map(([key, val]) => (
                          <tr key={key}>
                            <td className="py-2.5 pr-4 font-medium text-zinc-800">{formatFieldName(key)}</td>
                            <td className="py-2.5 pr-4 text-zinc-600 break-words">{formatValue(key, val.value)}</td>
                            <td className="py-2.5 pr-4">
                              <ConfidenceMeter confidence={val.confidence} showText />
                            </td>
                            <td className="py-2.5">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${val.is_deterministic ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                {val.is_deterministic ? 'Regex' : 'AI'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-zinc-500">No declarations extracted.</p>
                )}

                {data.missing_fields && data.missing_fields.length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-semibold text-amber-800 mb-1">Not Detected</p>
                    <p className="text-sm text-amber-700">
                      {data.missing_fields.map(formatFieldName).join(', ')}
                    </p>
                  </div>
                )}
              </section>

              {/* Findings */}
              <section>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-4 text-zinc-800">
                  Rule Checks &amp; Findings
                </h2>
                {data.findings && data.findings.length > 0 ? (
                  <div className="space-y-3">
                    {data.findings.map((f, i) => (
                      <div key={`${f.ruleId}-${f.field}-${i}`} className="border border-zinc-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                          <div>
                            <div className="text-sm font-semibold text-zinc-800">
                              {f.ruleId}
                              {f.ruleVersion ? <span className="ml-2 text-xs font-normal text-zinc-500">v{f.ruleVersion}</span> : null}
                            </div>
                            <div className="text-xs text-zinc-500">{formatFieldName(f.field)}</div>
                            {f.sourceReference && (
                              <div className="text-[11px] text-zinc-400 mt-0.5">{f.sourceReference}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {f.severity === 'HIGH' && (
                              <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 px-2 py-0.5 rounded-full">High</span>
                            )}
                            {f.requiresHumanReview && (
                              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                Human Review
                              </span>
                            )}
                            <StatusBadge status={f.status} showIcon={false} />
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Observed</div>
                            <div className="text-zinc-800 font-medium break-words">{f.observedValue || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Expected</div>
                            <div className="text-zinc-800 font-medium break-words">{f.expectedCondition || '—'}</div>
                          </div>
                        </div>
                        {f.explanation && (
                          <div className="px-4 pb-3 text-sm text-zinc-600 leading-relaxed">{f.explanation}</div>
                        )}
                        <div className="px-4 pb-3 flex items-center justify-between gap-3 text-xs text-zinc-400 border-t border-zinc-100 pt-3">
                          <strong>Confidence:</strong>
                          <ConfidenceMeter confidence={f.confidence} showText />
                          {f.evidenceImageId && (
                            <a href={f.evidenceImageId} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline">
                              <Scan className="w-3.5 h-3.5" />
                              {f.boundingBox ? `Evidence region ${f.boundingBox.width}x${f.boundingBox.height}` : 'Evidence image'}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No findings for this inspection.</p>
                )}
              </section>

              {/* AI Disclosure */}
              <section className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <ThumbsUp className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 mb-1">
                      AI-Assisted Report &mdash; Human Verification Required
                    </p>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      This report was generated automatically. AI is used only for extracting and
                      classifying declarations from the label{data.llm_assisted ? ' (including LLM-based extraction)' : ''};
                      every legal determination is made by a versioned, deterministic rule engine.
                      Findings are advisory and must be verified by an authorized officer before any
                      enforcement action. Where evidence was insufficient or uncertain, the finding is
                      marked for human review. The raw OCR text, extracted declarations and evidence
                      regions above provide the basis for each finding.
                    </p>
                  </div>
                </div>
              </section>

              {/* Raw OCR */}
              {data.raw_ocr && (
                <section>
                  <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 text-zinc-800">
                    Raw OCR Evidence
                  </h2>
                  <pre className="text-xs leading-relaxed text-zinc-600 font-mono bg-zinc-50 border border-zinc-200 rounded-xl p-4 whitespace-pre-wrap">
                    {data.raw_ocr}
                  </pre>
                </section>
              )}

              {/* Footer signature */}
              <section className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">Inspector</div>
                  <div className="text-sm font-semibold text-zinc-800 mt-2">
                    {
                      !data.inspectorId ? 'Inspector not recorded' :
                      typeof data.inspectorId === 'string' ? data.inspectorId :
                      (data.inspectorId.name || data.inspectorId.email || 'Inspector not recorded')
                    }
                  </div>
                  <div className="h-px bg-zinc-300 mt-4"></div>
                  <div className="text-xs text-zinc-400 mt-1">Name &amp; Signature</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">Supervisor / Approving Authority</div>
                  <div className="h-px bg-zinc-300 mt-6"></div>
                  <div className="text-xs text-zinc-400 mt-1">Name &amp; Signature</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <p className="text-zinc-500">Loading report…</p>
        </div>
      }
    >
      <ReportPageContent />
    </Suspense>
  );
}