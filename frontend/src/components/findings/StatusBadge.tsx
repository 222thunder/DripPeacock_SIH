import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, HelpCircle, EyeOff, Clock } from 'lucide-react';
import { Badge } from '@/components/Badge';

export type ComplianceStatus =
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'UNABLE_TO_VERIFY'
  | 'CONFIRMED_NON_COMPLIANT'
  | 'NOT_APPLICABLE'
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'REVIEW_REQUIRED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'PENDING';

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<ComplianceStatus, { label: string, color: string, icon: React.ReactNode }> = {
  DETECTED: {
    label: 'Detected',
    color: 'border-[#3F6212] text-[#3F6212] bg-[#ECFCCB] dark:border-[#ECFCCB] dark:text-[#ECFCCB] dark:bg-[#3F6212]/30',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  NOT_DETECTED: {
    label: 'Not Detected',
    color: 'border-[#9A3412] text-[#9A3412] bg-[#FFEDD5] dark:border-[#FFEDD5] dark:text-[#FFEDD5] dark:bg-[#9A3412]/30',
    icon: <EyeOff className="w-3 h-3" />
  },
  UNABLE_TO_VERIFY: {
    label: 'Unable to Verify',
    color: 'border-[#57534E] text-[#57534E] bg-[#F5F5F4] dark:border-[#A8A29E] dark:text-[#A8A29E] dark:bg-[#292524]',
    icon: <HelpCircle className="w-3 h-3" />
  },
  CONFIRMED_NON_COMPLIANT: {
    label: 'Non-Compliant',
    color: 'border-[#991B1B] text-[#991B1B] bg-[#FEE2E2] dark:border-[#FCA5A5] dark:text-[#FCA5A5] dark:bg-[#991B1B]/30',
    icon: <XCircle className="w-3 h-3" />
  },
  NOT_APPLICABLE: {
    label: 'N/A',
    color: 'border-[#57534E] text-[#57534E] bg-[#F5F5F4] dark:border-[#A8A29E] dark:text-[#A8A29E] dark:bg-[#292524]',
    icon: <MinusCircle className="w-3 h-3" />
  },
  COMPLIANT: {
    label: 'Compliant',
    color: 'border-[#3F6212] text-[#3F6212] bg-[#ECFCCB] dark:border-[#ECFCCB] dark:text-[#ECFCCB] dark:bg-[#3F6212]/30',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  NON_COMPLIANT: {
    label: 'Non-Compliant',
    color: 'border-[#991B1B] text-[#991B1B] bg-[#FEE2E2] dark:border-[#FCA5A5] dark:text-[#FCA5A5] dark:bg-[#991B1B]/30',
    icon: <XCircle className="w-3 h-3" />
  },
  REVIEW_REQUIRED: {
    label: 'Review Required',
    color: 'border-[#9A3412] text-[#9A3412] bg-[#FFEDD5] dark:border-[#FFEDD5] dark:text-[#FFEDD5] dark:bg-[#9A3412]/30',
    icon: <AlertCircle className="w-3 h-3" />
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    color: 'border-[#57534E] text-[#57534E] bg-[#F5F5F4] dark:border-[#A8A29E] dark:text-[#A8A29E] dark:bg-[#292524]',
    icon: <HelpCircle className="w-3 h-3" />
  },
  PENDING: {
    label: 'Pending',
    color: 'border-[#57534E] text-[#57534E] bg-[#F5F5F4] dark:border-[#A8A29E] dark:text-[#A8A29E] dark:bg-[#292524]',
    icon: <Clock className="w-3 h-3" />
  }
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.NOT_APPLICABLE;
  return (
    <Badge className={`${config.color} ${className || ''}`}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}
