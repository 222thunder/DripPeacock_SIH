import type { Finding } from '@/lib/api';

export interface StatusCounts {
  pass: number;
  review: number;
  fail: number;
  notApplicable: number;
  total: number;
}

export type OverallStatus = 'COMPLIANT' | 'REVIEW_REQUIRED' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

export function countStatuses(findings: Finding[] | undefined): StatusCounts {
  const counts: StatusCounts = { pass: 0, review: 0, fail: 0, notApplicable: 0, total: findings?.length || 0 };
  for (const f of findings || []) {
    if (f.status === 'DETECTED') counts.pass += 1;
    else if (f.status === 'CONFIRMED_NON_COMPLIANT') counts.fail += 1;
    else if (f.status === 'NOT_APPLICABLE') counts.notApplicable += 1;
    else counts.review += 1; // NOT_DETECTED + UNABLE_TO_VERIFY
  }
  return counts;
}

export function overallStatus(counts: StatusCounts): OverallStatus {
  if (counts.total === 0) return 'NOT_APPLICABLE';
  if (counts.fail > 0) return 'NON_COMPLIANT';
  if (counts.review > 0) return 'REVIEW_REQUIRED';
  if (counts.total === counts.pass + counts.notApplicable) return 'COMPLIANT';
  return 'REVIEW_REQUIRED';
}