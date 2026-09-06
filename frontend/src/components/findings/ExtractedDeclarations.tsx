'use client';

import React from 'react';
import { FieldEditor } from "./FieldEditor";
import { motion } from 'framer-motion';
import { AlertCircle, FileText, LayoutGrid, Scan, Check, X, Edit2, Plus } from 'lucide-react';
import { ConfidenceMeter } from './ConfidenceMeter';
import type { DeclarationValue } from '@/lib/api';

interface ExtractedDeclarationsProps {
  declarations: Record<string, DeclarationValue>;
  missing_fields?: string[];
  onSaveField?: (key: string, value: string) => Promise<void>;
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

const formatValue = (key: string, val: DeclarationValue['value']): string => {
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

const getGroup = (key: string): string => {
  if (['mrp', 'mrp_inclusive_of_taxes', 'unit_sale_price'].includes(key)) return 'Pricing';
  if (['mfg_date', 'pkd_date', 'expiry_date', 'best_before'].includes(key)) return 'Dates';
  if (['net_quantity', 'net_weight', 'gross_weight'].includes(key)) return 'Quantity';
  if (['manufacturer', 'packer', 'importer', 'country_of_origin'].includes(key)) return 'Identity';
  if (['consumer_care'].includes(key)) return 'Consumer Care';
  return 'Regulatory';
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, bounce: 0, duration: 0.4 },
  },
};

export function ExtractedDeclarations({ declarations, missing_fields = [], onSaveField }: ExtractedDeclarationsProps) {
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<any>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const startEdit = (key: string, currentValue: any) => {
    setEditingKey(key);
    // Don't format the value - pass the raw object or primitive to the FieldEditor
    setEditValue(currentValue);
  };

  const handleSave = async (key: string) => {
    if (!onSaveField) return;
    setIsSaving(true);
    try {
      await onSaveField(key, editValue);
      setEditingKey(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const entries = Object.entries(declarations).filter(([key]) => !key.startsWith('_'));

  const grouped = entries.reduce(
    (acc, [key, data]) => {
      const group = getGroup(key);
      if (!acc[group]) acc[group] = [];
      acc[group].push({ key, data });
      return acc;
    },
    {} as Record<string, Array<{ key: string; data: DeclarationValue }>>
  );

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
            className="grid grid-cols-1 gap-4"
          >
            {items.map(({ key, data }) => (
              <motion.div
                key={key}
                variants={itemVariants}
                className="group relative flex flex-col h-full p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    {formatFieldName(key)}
                    {onSaveField && editingKey !== key && (
                      <button onClick={() => startEdit(key, data.value)} className="text-indigo-500 hover:text-indigo-600 transition-colors" title="Edit field">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end ml-2">
                    {data.bounding_box && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-teal-600 text-white px-2 py-0.5 rounded-full shadow-sm border border-teal-700"
                        title={`Bounding box: x=${data.bounding_box.x}, y=${data.bounding_box.y}, ${data.bounding_box.width}x${data.bounding_box.height}`}
                      >
                        <Scan className="w-3 h-3" />
                        Evidence
                      </span>
                    )}
                    {data.is_deterministic ? (
                      <span
                        className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm border border-blue-700"
                        title="Extracted by deterministic regex parsing"
                      >
                        Regex
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide bg-purple-600 text-white px-2 py-0.5 rounded-full shadow-sm border border-purple-700"
                        title={data.source ? `Extracted by ${data.source}` : 'Extracted via AI/LLM'}
                      >
                        AI
                      </span>
                    )}
                    {data.manuallyVerified && (
                      <span
                        className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide bg-amber-600 text-white px-2 py-0.5 rounded-full shadow-sm border border-amber-700"
                        title="Value was manually verified or edited by an inspector"
                      >
                        Manual Reviewed
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4 flex-1 flex flex-col justify-start">
                  {editingKey === key ? (
                    <div className="flex items-start gap-2">
                      <FieldEditor
                        fieldKey={key}
                        value={editValue}
                        onChange={setEditValue}
                        onSave={() => handleSave(key)}
                        onCancel={() => setEditingKey(null)}
                        isSaving={isSaving}
                      />
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => handleSave(key)} disabled={isSaving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingKey(null)} disabled={isSaving} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight break-words">
                      {formatValue(key, data.value)}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center gap-2">
                  <ConfidenceMeter confidence={data.confidence} />

                  {data.raw_text && (
                    <div
                      className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 max-w-[50%] truncate"
                      title={data.raw_text}
                    >
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
            className="grid grid-cols-1 gap-4"
          >
            {missing_fields.map((field) => (
              <motion.div
                key={field}
                variants={itemVariants}
                className="flex flex-col h-full gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-800/30 backdrop-blur-xl border border-dashed border-zinc-200 dark:border-zinc-700/50 rounded-2xl opacity-70"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex-1">
                    {formatFieldName(field)}
                  </span>
                  {onSaveField && editingKey !== field && (
                    <button onClick={() => startEdit(field, '')} className="text-indigo-500 hover:text-indigo-600 transition-colors shrink-0" title="Add field">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {editingKey === field && (
                  <div className="flex items-start gap-2 mt-2">
                    <FieldEditor
                      fieldKey={field}
                      value={editValue}
                      onChange={setEditValue}
                      onSave={() => handleSave(field)}
                      onCancel={() => setEditingKey(null)}
                      isSaving={isSaving}
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleSave(field)} disabled={isSaving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingKey(null)} disabled={isSaving} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}