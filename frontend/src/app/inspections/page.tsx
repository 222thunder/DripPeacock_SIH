'use client';

import { motion } from 'framer-motion';
import { Search, Filter, Inbox } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.4 } },
};

const mockInspections = [
  { id: 'LM-2026-00047', product: 'Organic Honey 500g', date: 'Sep 4, 2026', status: 'Compliant', inspector: 'A. Sharma' },
  { id: 'LM-2026-00046', product: 'Premium Tea Leaves', date: 'Sep 4, 2026', status: 'Review Required', inspector: 'R. Patel' },
  { id: 'LM-2026-00045', product: 'Almond Milk 1L', date: 'Sep 3, 2026', status: 'Non-Compliant', inspector: 'A. Sharma' },
  { id: 'LM-2026-00044', product: 'Whole Wheat Bread', date: 'Sep 3, 2026', status: 'Compliant', inspector: 'K. Singh' },
  { id: 'LM-2026-00043', product: 'Basmati Rice 5kg', date: 'Sep 2, 2026', status: 'Compliant', inspector: 'R. Patel' },
  { id: 'LM-2026-00042', product: 'Filtered Groundnut Oil 1L', date: 'Sep 2, 2026', status: 'Review Required', inspector: 'K. Singh' },
  { id: 'LM-2026-00041', product: 'Roasted Peanuts 250g', date: 'Sep 1, 2026', status: 'Compliant', inspector: 'A. Sharma' },
  { id: 'LM-2026-00040', product: 'Oatmeal Cookies 200g', date: 'Sep 1, 2026', status: 'Non-Compliant', inspector: 'R. Patel' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'Compliant') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30">Compliant</span>;
  if (status === 'Non-Compliant') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">Non-Compliant</span>;
  if (status === 'Review Required') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Review Required</span>;
  return null;
}

export default function InspectionsList() {
  const hasInspections = mockInspections.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Inspections</h1>
            <p className="text-zinc-500 dark:text-zinc-400">View and manage metrology inspection records.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search inspections..." 
                className="pl-9 pr-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors active:scale-[0.97]">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {hasInspections ? (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {mockInspections.map((inspection) => (
              <motion.div 
                key={inspection.id}
                variants={itemVariants}
                className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{inspection.id}</div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{inspection.product}</h3>
                  </div>
                  <StatusBadge status={inspection.status} />
                </div>
                <div className="flex justify-between items-center text-sm text-zinc-500 mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                    {inspection.inspector}
                  </span>
                  <span>{inspection.date}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-white/10 border-dashed">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No inspections found</h3>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
              We couldn't find any inspections matching your current filters. Clear your filters or start a new scan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
