'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Inbox, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.4 } },
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLIANT') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30">Compliant</span>;
  if (status === 'NON_COMPLIANT') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">Non-Compliant</span>;
  if (status === 'REVIEW_REQUIRED') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Review Required</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/30">{status}</span>;
}

import type { Inspection } from '@/lib/api';

const getInspectorName = (inspection: Inspection) => {
  if (!inspection.inspectorId) return 'Inspector not recorded';
  if (typeof inspection.inspectorId === 'string') return inspection.inspectorId;
  return inspection.inspectorId.name || inspection.inspectorId.email || 'Inspector not recorded';
};

const getProductName = (inspection: Inspection) => {
  if (!inspection.productId) return 'Product not recorded';
  if (typeof inspection.productId === 'string') return 'Unknown Product';
  return inspection.productId.name || 'Product not recorded';
};

export default function InspectionsList() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inspectorFilter, setInspectorFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD format

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiClient.getInspections();
        setInspections(data);
      } catch (err) {
        console.error('Failed to load inspections', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const uniqueInspectors = useMemo(() => {
    const inspectors = new Set<string>();
    inspections.forEach(i => {
      const name = getInspectorName(i);
      if (name !== 'Inspector not recorded') {
        inspectors.add(name);
      }
    });
    return Array.from(inspectors);
  }, [inspections]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(inspection => {
      const productName = getProductName(inspection).toLowerCase();
      const inspector = getInspectorName(inspection).toLowerCase();
      const status = inspection.status || '';
      const date = new Date(inspection.createdAt as string).toISOString().split('T')[0]; // YYYY-MM-DD

      // 1. Search Bar (Product name match)
      if (searchQuery && !productName.includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // 2. Status Match
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      // 3. Inspector Match
      if (inspectorFilter !== 'ALL' && inspector !== inspectorFilter.toLowerCase()) {
        return false;
      }

      // 4. Date Match
      if (dateFilter && date !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [inspections, searchQuery, statusFilter, inspectorFilter, dateFilter]);

  const hasInspections = filteredInspections.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">Inspections</h1>
            <p className="text-zinc-500 dark:text-zinc-400">View and manage metrology inspection records.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Search (Product Name) */}
            <div className="relative flex-grow sm:flex-grow-0 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-10 w-full sm:w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Filter Group: Status & Inspector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 flex-grow sm:flex-grow-0 sm:w-44 px-3 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="NON_COMPLIANT">Non-Compliant</option>
              <option value="REVIEW_REQUIRED">Review Required</option>
            </select>

            <select
              value={inspectorFilter}
              onChange={(e) => setInspectorFilter(e.target.value)}
              className="h-10 flex-grow sm:flex-grow-0 sm:w-44 px-3 pr-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="ALL">All Inspectors</option>
              {uniqueInspectors.map(inspector => (
                <option key={inspector} value={inspector}>{inspector}</option>
              ))}
            </select>

            {/* Date Filter */}
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 w-full sm:w-auto px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {dateFilter && (
                <button 
                  onClick={() => setDateFilter('')}
                  className="h-10 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {hasInspections ? (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredInspections.map((inspection) => (
              <motion.div 
                key={inspection._id || inspection.inspectionId}
                variants={itemVariants}
                onClick={() => router.push(`/inspections/${inspection._id}`)}
                className="p-5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow cursor-pointer group flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{inspection.inspectionId}</div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{getProductName(inspection)}</h3>
                  </div>
                  <StatusBadge status={inspection.status} />
                </div>
                <div className="flex justify-between items-center text-sm text-zinc-500 mt-2">
                  <span className="flex items-center gap-1.5 truncate pr-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 flex-shrink-0"></span>
                    <span className="truncate">{getInspectorName(inspection)}</span>
                  </span>
                  <span className="flex-shrink-0">{new Date(inspection.createdAt as string).toLocaleDateString()}</span>
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
              We couldn&apos;t find any inspections matching your current filters. Clear your filters or start a new scan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
