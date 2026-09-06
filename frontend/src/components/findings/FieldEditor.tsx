import React from 'react';

interface FieldEditorProps {
  fieldKey: string;
  value: any;
  onChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function FieldEditor({ fieldKey, value, onChange, onSave, onCancel, isSaving }: FieldEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
    if (e.key === 'Escape') onCancel();
  };

  const inputClasses = "w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow";

  if (fieldKey === 'mrp') {
    const v = (typeof value === 'object' && value !== null) ? value : { amount: typeof value === 'number' ? value : null };
    return (
      <div className="flex flex-col gap-2 w-full" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            autoFocus
            type="number"
            placeholder="Amount"
            value={v.amount || ''}
            onChange={(e) => onChange({ ...v, amount: e.target.value ? Number(e.target.value) : null })}
            className={inputClasses}
            disabled={isSaving}
          />
          <input
            type="text"
            placeholder="Currency"
            value={v.currency || ''}
            onChange={(e) => onChange({ ...v, currency: e.target.value })}
            className={inputClasses + " w-24"}
            disabled={isSaving}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={v.inclusive_of_taxes || false}
            onChange={(e) => onChange({ ...v, inclusive_of_taxes: e.target.checked })}
            disabled={isSaving}
            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          Inclusive of taxes
        </label>
      </div>
    );
  }

  if (fieldKey === 'net_quantity') {
    const v = (typeof value === 'object' && value !== null) ? value : { value: value || '' };
    return (
      <div className="flex gap-2 w-full" onKeyDown={handleKeyDown}>
        <input
          autoFocus
          type="number"
          step="any"
          placeholder="Value"
          value={v.value || ''}
          onChange={(e) => onChange({ ...v, value: e.target.value ? Number(e.target.value) : null })}
          className={inputClasses}
          disabled={isSaving}
        />
        <input
          type="text"
          placeholder="Unit (e.g. g, ml)"
          value={v.unit || ''}
          onChange={(e) => onChange({ ...v, unit: e.target.value })}
          className={inputClasses + " w-24"}
          disabled={isSaving}
        />
      </div>
    );
  }

  if (['manufacturer', 'packer', 'importer'].includes(fieldKey)) {
    const v = (typeof value === 'object' && value !== null) ? value : { name: value || '' };
    return (
      <div className="flex flex-col gap-2 w-full" onKeyDown={handleKeyDown}>
        <input
          autoFocus
          type="text"
          placeholder="Name"
          value={v.name || ''}
          onChange={(e) => onChange({ ...v, name: e.target.value })}
          className={inputClasses}
          disabled={isSaving}
        />
        <textarea
          placeholder="Address"
          value={v.address || ''}
          onChange={(e) => onChange({ ...v, address: e.target.value })}
          className={inputClasses + " resize-none h-16"}
          disabled={isSaving}
        />
      </div>
    );
  }

  if (fieldKey === 'consumer_care' || fieldKey === 'consumer_care_details') {
    const v = (typeof value === 'object' && value !== null) ? value : {};
    return (
      <div className="flex flex-col gap-2 w-full" onKeyDown={handleKeyDown}>
        <input
          autoFocus
          type="text"
          placeholder="Name or Designation"
          value={v.name_or_designation || ''}
          onChange={(e) => onChange({ ...v, name_or_designation: e.target.value })}
          className={inputClasses}
          disabled={isSaving}
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Phone"
            value={v.phone || ''}
            onChange={(e) => onChange({ ...v, phone: e.target.value })}
            className={inputClasses}
            disabled={isSaving}
          />
          <input
            type="email"
            placeholder="Email"
            value={v.email || ''}
            onChange={(e) => onChange({ ...v, email: e.target.value })}
            className={inputClasses}
            disabled={isSaving}
          />
        </div>
        <textarea
          placeholder="Address"
          value={v.address || ''}
          onChange={(e) => onChange({ ...v, address: e.target.value })}
          className={inputClasses + " resize-none h-16"}
          disabled={isSaving}
        />
      </div>
    );
  }

  // default
  return (
    <input
      autoFocus
      type="text"
      placeholder={`Enter ${fieldKey.replace(/_/g, ' ')}`}
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className={inputClasses}
      onKeyDown={handleKeyDown}
      disabled={isSaving}
    />
  );
}
