'use client';

import { motion } from 'framer-motion';
import { Activity, Shield, ShieldAlert, ShieldQuestion, Loader2, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, bounce: 0, duration: 0.4 },
  },
};

interface InspectionItem {
  _id?: string;
  inspectionId?: string;
  status?: string;
  createdAt?: string;
  extractedDeclarations?: { commodity_name?: { value?: string } };
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'COMPLIANT') return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-md bg-green-600 text-white border-2 border-green-700">Compliant</span>;
  if (status === 'NON_COMPLIANT') return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-md bg-red-600 text-white border-2 border-red-700">Non-Compliant</span>;
  if (status === 'REVIEW_REQUIRED') return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-md bg-amber-500 text-white border-2 border-amber-600">Review Required</span>;
  return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide shadow-md bg-zinc-500 text-white border-2 border-zinc-600">{status || 'PENDING'}</span>;
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <motion.div 
        className="max-w-6xl mx-auto space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Dashboard</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Overview of recent metrology inspections.</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">
              {loading ? <Loader2 className="w-8 h-8 animate-spin text-zinc-400" /> : inspections.length}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Total Inspections</div>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t-4 border-t-green-500 border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">
              {loading ? <Loader2 className="w-8 h-8 animate-spin text-zinc-400" /> : compliantCount}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Compliant</div>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t-4 border-t-red-500 border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">
              {loading ? <Loader2 className="w-8 h-8 animate-spin text-zinc-400" /> : nonCompliantCount}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Non-Compliant</div>
          </div>

          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t-4 border-t-amber-500 border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <ShieldQuestion className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">
              {loading ? <Loader2 className="w-8 h-8 animate-spin text-zinc-400" /> : reviewCount}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Review Required</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-zinc-100 dark:border-white/5">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Recent Inspections</h2>
            <Link
              href="/inspections"
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors group"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="overflow-x-auto min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : inspections.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                No inspections found.
                <Link href="/scanner" className="mt-3 block text-blue-600 hover:text-blue-700 font-medium">
                  Go scan a product →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/5 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Product</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {inspections.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => item._id && router.push(`/inspections/${item._id}`)}
                      className="cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{item.inspectionId}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{item.extractedDeclarations?.commodity_name?.value || 'Unknown Product'}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-6 py-4">
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
