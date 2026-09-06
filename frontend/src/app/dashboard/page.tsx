'use client';

import { motion } from 'framer-motion';
import { Activity, Shield, ShieldAlert, ShieldQuestion, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import Link from 'next/link';

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

const mockInspections = [
  { id: 'LM-2026-00047', product: 'Organic Honey 500g', date: 'Sep 4, 2026', status: 'Compliant', inspector: 'A. Sharma' },
  { id: 'LM-2026-00046', product: 'Premium Tea Leaves', date: 'Sep 4, 2026', status: 'Review Required', inspector: 'R. Patel' },
  { id: 'LM-2026-00045', product: 'Almond Milk 1L', date: 'Sep 3, 2026', status: 'Non-Compliant', inspector: 'A. Sharma' },
  { id: 'LM-2026-00044', product: 'Whole Wheat Bread', date: 'Sep 3, 2026', status: 'Compliant', inspector: 'K. Singh' },
  { id: 'LM-2026-00043', product: 'Basmati Rice 5kg', date: 'Sep 2, 2026', status: 'Compliant', inspector: 'R. Patel' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'Compliant') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30">Compliant</span>;
  if (status === 'Non-Compliant') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">Non-Compliant</span>;
  if (status === 'Review Required') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Review Required</span>;
  return null;
}

export default function Dashboard() {
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
          {/* Stat Card 1 */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">47</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Total Inspections</div>
            <div className="flex items-center gap-1 mt-4 text-sm text-zinc-500">
              <TrendingUp className="w-4 h-4" /> <span className="font-medium">+12%</span> this week
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t-4 border-t-green-500 border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">31</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Compliant</div>
            <div className="flex items-center gap-1 mt-4 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" /> <span className="font-medium">+5</span> this week
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t-4 border-t-red-500 border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">8</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Non-Compliant</div>
            <div className="flex items-center gap-1 mt-4 text-sm text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" /> <span className="font-medium">-2</span> this week
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-t-4 border-t-amber-500 border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <ShieldQuestion className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50 tracking-tight">8</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Review Required</div>
            <div className="flex items-center gap-1 mt-4 text-sm text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" /> <span className="font-medium">+3</span> this week
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-zinc-100 dark:border-white/5">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Recent Inspections</h2>
            <Link href="/inspections" className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-white/5 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {mockInspections.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{item.id}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{item.product}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{item.date}</td>
                    <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{item.inspector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-12 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Compliance Trend</h3>
          <p className="text-zinc-500 dark:text-zinc-400">Compliance trends and analytics will appear here.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
