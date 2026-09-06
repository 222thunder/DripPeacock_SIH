'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileText, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { ConfidenceMeter } from './ConfidenceMeter';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DeclarationValue {
  value: any;
  raw_text?: string;
  confidence?: number;
  is_deterministic?: boolean;
  source?: string;
  bounding_box?: object;
  source_line?: string;
}

interface ExtractedDeclarationsProps {
  declarations: Record<string, DeclarationValue>;
  missing_fields?: string[];
}

const formatFieldName = (key: string): string => {
  const overrides: Record<string, string> = {
    mrp: 'MRP',
    mfg_date: 'Manufacturing Date',
    fssai_lic_no: 'FSSAI License No.',
  };
  if (overrides[key]) return overrides[key];
  
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatValue = (key: string, val: any): string => {
  if (val === null || val === undefined) return '—';
  
  if (key === 'mrp') {
    return `₹${val}`;
  }
  
  return String(val);
};

const getGroup = (key: string): string => {
  if (['mrp', 'mrp_inclusive_of_taxes', 'unit_sale_price'].includes(key)) return 'Pricing';
  if (['mfg_date', 'expiry_date', 'use_by_date', 'best_before'].includes(key)) return 'Dates';
  if (['net_quantity', 'net_weight', 'gross_weight'].includes(key)) return 'Quantity';
  if (['manufacturer_name', 'manufacturer_address', 'packer_name', 'packer_address'].includes(key)) return 'Identity';
  if (['customer_care_email', 'customer_care_phone', 'customer_care_address'].includes(key)) return 'Consumer Care';
  return 'Regulatory';
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.96 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring' as const, bounce: 0, duration: 0.4 }
  }
};

export function ExtractedDeclarations({ declarations, missing_fields = [] }: ExtractedDeclarationsProps) {
  const entries = Object.entries(declarations).filter(([key]) => !key.startsWith('_'));
  
  const grouped = entries.reduce((acc, [key, data]) => {
    const group = getGroup(key);
    if (!acc[group]) acc[group] = [];
    acc[group].push({ key, data });
    return acc;
  }, {} as Record<string, Array<{key: string, data: DeclarationValue}>>);

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([groupName, items]) => (
        <div key={groupName} className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-zinc-400" />
            {groupName}
          </h3>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {items.map(({ key, data }) => (
              <motion.div
                key={key}
                variants={itemVariants}
                className="group relative flex flex-col p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatFieldName(key)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {data.is_deterministic ? (
                      <span className="text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/30">
                        Regex
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-800/30">
                        AI
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 tracking-tight break-words">
                  {formatValue(key, data.value)}
                </div>
                
                <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center">
                  {data.confidence !== undefined ? (
                    <ConfidenceMeter confidence={data.confidence} />
                  ) : <div />}
                  
                  {data.raw_text && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 max-w-[50%] truncate" title={data.raw_text}>
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{data.raw_text}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}

      {missing_fields.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Missing Declarations
          </h3>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {missing_fields.map((field) => (
              <motion.div
                key={field}
                variants={itemVariants}
                className="flex items-center gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-800/30 backdrop-blur-xl border border-dashed border-zinc-200 dark:border-zinc-700/50 rounded-2xl opacity-70"
              >
                <AlertCircle className="w-5 h-5 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {formatFieldName(field)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
