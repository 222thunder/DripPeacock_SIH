'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Inbox, Clock, UserRound, ArrowUpDown, Check, ListFilter } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { StatusBadge, type ComplianceStatus } from '@/components/findings/StatusBadge';

interface Inspection {
  _id?: string;
  inspectionId?: string;
  status?: string;
  category?: string;
  extractedDeclarations?: Record<string, any>;
  inspectorId?: { name?: string; email?: string } | string | null;
  productId?: { name?: string } | string | null;
  createdAt?: string;
  findings?: Array<{ status: string; ruleId: string }>;
}


const sortOptions = [
  { value: 'DATE_DESC', label: 'Newest First' },
  { value: 'DATE_ASC', label: 'Oldest First' },
  { value: 'NAME_ASC', label: 'Entity (A-Z)' },
  { value: 'NAME_DESC', label: 'Entity (Z-A)' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inspectorFilter, setInspectorFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [violationFilter, setViolationFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('DATE_DESC');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    apiClient.getInspections()
      .then(data => {
        setInspections(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load inspections', err);
        setLoading(false);
      });
  }, []);

  const getProductName = (inspection: Inspection) => {
    if (typeof inspection.productId === 'string') return 'Unknown Product';
    return inspection.productId?.name || (inspection.extractedDeclarations?.commodity_name?.value as string) || 'Unknown Entity';
  };

  const getInspectorName = (inspection: Inspection) => {
    if (!inspection.inspectorId) return 'Unassigned';
    if (typeof inspection.inspectorId === 'string') return inspection.inspectorId;
    return inspection.inspectorId.name || inspection.inspectorId.email || 'Unassigned';
  };

  const uniqueInspectors = useMemo(() => {
    const names = new Set(inspections.map(getInspectorName).filter(n => n !== 'Unassigned'));
    return Array.from(names).sort();
  }, [inspections]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(inspections.map(i => i.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [inspections]);

  const uniqueViolations = useMemo(() => {
    const rules = new Set<string>();
    inspections.forEach(i => {
      i.findings?.forEach(f => {
        if (f.status === 'CONFIRMED_NON_COMPLIANT' || f.status === 'NON_COMPLIANT') {
          rules.add(f.ruleId);
        }
      });
    });
    return Array.from(rules).sort();
  }, [inspections]);

  const filteredInspections = useMemo(() => {
    return inspections.filter(inspection => {
      // 1. Search Query (Product Name or Inspection ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const productName = getProductName(inspection).toLowerCase();
        const inspId = (inspection.inspectionId || '').toLowerCase();
        if (!productName.includes(query) && !inspId.includes(query)) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && inspection.status !== statusFilter) return false;

      // 3. Inspector Filter
      if (inspectorFilter !== 'ALL') {
        const inspName = getInspectorName(inspection);
        if (inspName !== inspectorFilter) return false;
      }

      // 4. Date Filter
      if (dateFilter && inspection.createdAt) {
        const inspectionDate = new Date(inspection.createdAt).toISOString().split('T')[0];
        if (inspectionDate !== dateFilter) return false;
      }

      // 5. Category Filter
      if (categoryFilter !== 'ALL' && inspection.category !== categoryFilter) return false;

      // 6. Violation Filter
      if (violationFilter !== 'ALL') {
        const hasViolation = inspection.findings?.some(
          f => (f.status === 'CONFIRMED_NON_COMPLIANT' || f.status === 'NON_COMPLIANT') && f.ruleId === violationFilter
        );
        if (!hasViolation) return false;
      }

      return true;
    });
  }, [inspections, searchQuery, statusFilter, inspectorFilter, dateFilter, categoryFilter, violationFilter]);

    const sortedInspections = useMemo(() => {
    const sorted = [...filteredInspections];
    sorted.sort((a, b) => {
      if (sortOrder === 'DATE_DESC') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortOrder === 'DATE_ASC') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (sortOrder === 'NAME_ASC') {
        return getProductName(a).localeCompare(getProductName(b));
      }
      if (sortOrder === 'NAME_DESC') {
        return getProductName(b).localeCompare(getProductName(a));
      }
      return 0;
    });
    return sorted;
  }, [filteredInspections, sortOrder]);

  
  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) + 
    (inspectorFilter !== 'ALL' ? 1 : 0) + 
    (categoryFilter !== 'ALL' ? 1 : 0) + 
    (violationFilter !== 'ALL' ? 1 : 0) + 
    (dateFilter !== '' ? 1 : 0);

  const hasInspections = sortedInspections.length > 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="font-mono text-sm uppercase tracking-widest text-[#A8A29E]">Retrieving dossier list...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 space-y-12">
      
      {/* Header */}
      <header className="border-b-2 border-[#1C1B1A] dark:border-[#F9F8F6] pb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h1 className="font-display text-4xl lg:text-5xl text-[#1C1B1A] dark:text-[#F9F8F6] tracking-tight mb-4">
            Inspections Ledger
          </h1>
          <p className="font-sans text-sm text-[#57534E] dark:text-[#E7E5E4] max-w-lg leading-relaxed">
            A comprehensive record of all metrology compliance verifications. Filter by enforcement status, inspector, or specific legislative violations.
          </p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-wrap justify-center items-center gap-4 border-b border-[#E7E5E4] dark:border-[#292524] pb-6">
        
        {/* Search */}
        <div className="relative flex-grow sm:flex-grow-0 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
          <input 
            type="text" 
            placeholder="Search by entity..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] transition-colors rounded-none placeholder:text-[#A8A29E] dark:placeholder:text-[#57534E]"
          />
        </div>

        {/* Filters Button with Menu */}
        <div className="relative flex-grow sm:flex-grow-0 w-full sm:w-auto">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center justify-between gap-3 w-full sm:w-auto px-4 py-3 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest font-bold hover:bg-[#F5F5F4] dark:hover:bg-[#292524] transition-colors rounded-none cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ListFilter className="w-3.5 h-3.5" /> 
              Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
            </span>
          </button>
          
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)}></div>
              <div className="absolute left-0 mt-2 w-64 bg-[#FFFFFF] dark:bg-[#1C1B1A] border border-[#E7E5E4] dark:border-[#292524] shadow-2xl z-50 p-4 flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] rounded-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLIANT">Compliant</option>
                    <option value="NON_COMPLIANT">Non-Compliant</option>
                    <option value="REVIEW_REQUIRED">Review Required</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Personnel</label>
                  <select
                    value={inspectorFilter}
                    onChange={(e) => setInspectorFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] rounded-none cursor-pointer"
                  >
                    <option value="ALL">All Personnel</option>
                    {uniqueInspectors.map(inspector => (
                      <option key={inspector} value={inspector}>{inspector}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] rounded-none cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Violation</label>
                  <select
                    value={violationFilter}
                    onChange={(e) => setViolationFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] rounded-none cursor-pointer"
                  >
                    <option value="ALL">All Violations</option>
                    {uniqueViolations.map(rule => (
                      <option key={rule} value={rule}>{rule}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] rounded-none"
                    />
                    {dateFilter && (
                      <button 
                        onClick={() => setDateFilter('')}
                        className="px-2 py-2 font-sans text-[10px] uppercase tracking-widest font-bold text-[#1C1B1A] dark:text-[#F9F8F6] hover:bg-[#F5F5F4] dark:hover:bg-[#292524] transition-colors border border-[#E7E5E4] dark:border-[#292524]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button 
                    onClick={() => {
                      setStatusFilter('ALL');
                      setInspectorFilter('ALL');
                      setCategoryFilter('ALL');
                      setViolationFilter('ALL');
                      setDateFilter('');
                    }}
                    className="mt-2 w-full px-4 py-2 bg-[#FEE2E2] text-[#991B1B] dark:bg-[#991B1B]/20 dark:text-[#FCA5A5] font-sans text-xs uppercase tracking-widest font-bold hover:opacity-80 transition-opacity"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sort Button with Menu */}
        <div className="relative flex-grow sm:flex-grow-0 w-full sm:w-auto">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center justify-between gap-3 w-full sm:w-auto px-4 py-3 bg-transparent border border-[#1C1B1A] dark:border-[#F9F8F6] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-xs uppercase tracking-widest font-bold hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A] transition-colors rounded-none cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5" /> 
              Sort
            </span>
          </button>
          
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] dark:bg-[#1C1B1A] border border-[#E7E5E4] dark:border-[#292524] shadow-2xl z-50 py-2">
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortOrder(opt.value);
                      setShowSortMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-left font-sans text-xs uppercase tracking-widest hover:bg-[#F5F5F4] dark:hover:bg-[#292524] transition-colors text-[#1C1B1A] dark:text-[#F9F8F6]"
                  >
                    {opt.label}
                    {sortOrder === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        </div>

      {/* Grid */}
      {hasInspections ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {sortedInspections.map((inspection) => (
            <motion.div 
              key={inspection._id || inspection.inspectionId}
              variants={itemVariants}
              onClick={() => router.push(`/inspections/${inspection._id}`)}
              className="group p-6 bg-transparent border border-[#E7E5E4] dark:border-[#292524] hover:border-[#1C1B1A] dark:hover:border-[#F9F8F6] transition-colors cursor-pointer flex flex-col justify-between min-h-[12rem]"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E]">
                    {inspection.inspectionId}
                  </span>
                  <StatusBadge status={inspection.status as ComplianceStatus} showIcon={false} />
                </div>
                
                <h3 className="font-display text-2xl text-[#1C1B1A] dark:text-[#F9F8F6] leading-tight mb-2 group-hover:underline decoration-1 underline-offset-4">
                  {getProductName(inspection)}
                </h3>
                
                {inspection.category && (
                  <div className="font-sans text-[10px] uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E] mt-3">
                    {inspection.category}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E]">
                <span className="flex items-center gap-2 truncate pr-2">
                  <UserRound className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{getInspectorName(inspection)}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {inspection.createdAt ? new Date(inspection.createdAt).toLocaleDateString('en-GB') : '—'}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center border border-dashed border-[#E7E5E4] dark:border-[#292524]">
          <Inbox className="w-8 h-8 text-[#A8A29E] mb-6" />
          <h3 className="font-sans text-xs uppercase tracking-widest font-semibold text-[#1C1B1A] dark:text-[#F9F8F6] mb-2">No Records Found</h3>
          <p className="font-sans text-sm text-[#57534E] dark:text-[#A8A29E] max-w-sm">
            We couldn't find any dossiers matching your current constraints. Clear your filters to view all records.
          </p>
        </div>
      )}
    </div>
  );
}
