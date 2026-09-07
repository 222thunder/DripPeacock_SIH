'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { apiClient, type Finding } from '@/lib/api';
import { StatusBadge, type ComplianceStatus } from '@/components/findings/StatusBadge';

interface InspectionItem {
  _id?: string;
  inspectionId?: string;
  status?: string;
  createdAt?: string;
  category?: string;
  productId?: string | { name?: string; brand?: string; category?: string } | null;
  extractedDeclarations?: Record<string, { value: unknown }>;
  findings?: Finding[];
  reviewedFindings?: Record<string, unknown>;
}

export default function Dashboard() {
  const router = useRouter();
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiClient.getInspections();
        setInspections(data);
      } catch (err) {
        console.error('Failed to load inspections:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const compliantCount = inspections.filter(i => i.status === 'COMPLIANT').length;
  const nonCompliantCount = inspections.filter(i => i.status === 'NON_COMPLIANT').length;
  const reviewCount = inspections.filter(i => i.status === 'REVIEW_REQUIRED').length;

  const pendingReviews = useMemo(
    () =>
      inspections.reduce((total, i) => {
        const reviewed = i.reviewedFindings ? new Set(Object.keys(i.reviewedFindings)) : new Set<string>();
        const due = (i.findings || []).filter(
          (f) => f.requiresHumanReview && !reviewed.has(`${f.ruleId}:${f.field}`)
        ).length;
        return total + due;
      }, 0),
    [inspections]
  );

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    inspections.forEach((i) => {
      const key = i.category?.trim() || 'Unspecified';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [inspections]);

  const violationTrends = useMemo(() => {
    const counts = new Map<string, number>();
    inspections.forEach((i) => {
      (i.findings || [])
        .filter((f) => f.status === 'CONFIRMED_NON_COMPLIANT')
        .forEach((f) => counts.set(f.ruleId, (counts.get(f.ruleId) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [inspections]);

  const maxCategory = categoryBreakdown.length ? Math.max(...categoryBreakdown.map(([, n]) => n)) : 0;
  const maxViolation = violationTrends.length ? Math.max(...violationTrends.map(([, n]) => n)) : 0;

  const getProductName = (inspection: InspectionItem) => {
    if (inspection.productId && typeof inspection.productId === 'object' && inspection.productId.name) {
      return inspection.productId.name;
    }
    return (inspection.extractedDeclarations?.commodity_name?.value as string) || 'Unknown Entity';
  };


  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 space-y-16">
      
      {/* Header */}
      <header className="border-b-2 border-[#1C1B1A] dark:border-[#F9F8F6] pb-8">
        <h1 className="font-display text-4xl lg:text-5xl text-[#1C1B1A] dark:text-[#F9F8F6] tracking-tight">Platform Metrics</h1>
        <p className="font-sans text-sm text-[#57534E] dark:text-[#A8A29E] mt-4 uppercase tracking-widest font-semibold">
          Current Operating Posture
        </p>
      </header>

      {/* Stats - Editorial Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        <StatBlock title="Total Processed" value={loading ? '—' : inspections.length.toString()} />
        <StatBlock title="Verified Compliant" value={loading ? '—' : compliantCount.toString()} />
        <StatBlock title="Non-Compliant" value={loading ? '—' : nonCompliantCount.toString()} />
        <StatBlock title="Pending Review" value={loading ? '—' : reviewCount.toString()} />
        <StatBlock title="Findings Awaiting Review" value={loading ? '—' : pendingReviews.toString()} />
      </section>

      {/* Breakdowns */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-[#E7E5E4] dark:border-[#292524] p-8">
          <h3 className="font-display text-2xl text-[#1C1B1A] dark:text-[#F9F8F6] mb-6">Categories Audited</h3>
          {loading ? (
            <p className="text-sm uppercase tracking-widest text-[#A8A29E]">Synchronizing...</p>
          ) : categoryBreakdown.length === 0 ? (
            <p className="text-sm uppercase tracking-widest text-[#A8A29E]">No data.</p>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] truncate">{cat}</span>
                  <div className="flex-1 h-2 bg-[#E7E5E4] dark:bg-[#292524]">
                    <div className="h-2 bg-[#1C1B1A] dark:bg-[#F9F8F6]" style={{ width: `${maxCategory ? (n / maxCategory) * 100 : 0}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-sm text-[#1C1B1A] dark:text-[#F9F8F6]">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-[#E7E5E4] dark:border-[#292524] p-8">
          <h3 className="font-display text-2xl text-[#1C1B1A] dark:text-[#F9F8F6] mb-6">Confirmed Violations by Rule</h3>
          {loading ? (
            <p className="text-sm uppercase tracking-widest text-[#A8A29E]">Synchronizing...</p>
          ) : violationTrends.length === 0 ? (
            <p className="text-sm uppercase tracking-widest text-[#A8A29E]">No confirmed violations recorded.</p>
          ) : (
            <div className="space-y-4">
              {violationTrends.map(([rule, n]) => (
                <div key={rule} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 font-mono text-xs text-[#1C1B1A] dark:text-[#F9F8F6] truncate">{rule}</span>
                  <div className="flex-1 h-2 bg-[#E7E5E4] dark:bg-[#292524]">
                    <div className="h-2 bg-[#B91C1C]" style={{ width: `${maxViolation ? (n / maxViolation) * 100 : 0}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-sm text-[#1C1B1A] dark:text-[#F9F8F6]">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Table Section */}
      <section className="pt-8 border-t border-[#E7E5E4] dark:border-[#292524]">
        <div className="flex justify-between items-end mb-8">
          <h2 className="font-display text-3xl text-[#1C1B1A] dark:text-[#F9F8F6]">Ledger</h2>
          <Link
            href="/inspections"
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#1C1B1A] dark:text-[#F9F8F6] hover:opacity-70 transition-opacity"
          >
            View Complete Index <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#1C1B1A] dark:border-[#F9F8F6]">
                <th className="py-4 pr-6 font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Reference ID</th>
                <th className="py-4 px-6 font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Commodity Name</th>
                <th className="py-4 px-6 font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Date Registered</th>
                <th className="py-4 pl-6 font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#292524]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-semibold uppercase tracking-widest text-[#A8A29E]">Synchronizing...</td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-semibold uppercase tracking-widest text-[#A8A29E]">No records exist.</td>
                </tr>
              ) : (
                inspections.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => item._id && router.push(`/inspections/${item._id}`)}
                    className="cursor-pointer hover:bg-[#F5F5F4] dark:hover:bg-[#1C1B1A] transition-colors"
                  >
                    <td className="py-5 pr-6 font-mono text-sm font-semibold text-[#1C1B1A] dark:text-[#F9F8F6]">{item.inspectionId}</td>
                    <td className="py-5 px-6 font-sans text-sm text-[#57534E] dark:text-[#E7E5E4] max-w-[300px] truncate">
                      {getProductName(item)}
                    </td>
                    <td className="py-5 px-6 font-mono text-xs text-[#57534E] dark:text-[#A8A29E]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-5 pl-6 text-right">
                      <StatusBadge status={item.status as ComplianceStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

function StatBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex flex-col border-l border-[#1C1B1A] dark:border-[#F9F8F6] pl-6">
      <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E] mb-2">{title}</span>
      <span className="font-display text-5xl tracking-tight text-[#1C1B1A] dark:text-[#F9F8F6]">{value}</span>
    </div>
  );
}
