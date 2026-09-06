import { FindingResult, ComplianceSummary, DeclaredField, evaluateRules, summarizeFindings } from '../rules/ruleEngine';
import { IInspectionFinding, IInspectionReviewEntry, ReviewDecision } from '../models/Inspection';

export { ReviewDecision };

export interface ReviewerIdentity {
  id?: string;
  name?: string;
}

export interface ApplyHumanReviewOptions {
  findings: IInspectionFinding[];
  extractedDeclarations: Record<string, DeclaredField>;
  reviewedFindings: Record<string, IInspectionReviewEntry>;
  category?: string;
  findingId: string;
  decision: ReviewDecision;
  comment?: string;
  user: ReviewerIdentity;
}

export interface ApplyHumanReviewResult {
  reviewRecord: IInspectionReviewEntry;
  findings: FindingResult[];
  summary: ComplianceSummary;
  overall: ComplianceSummary['overall'];
}

/** Stable identity for a finding: `${ruleId}:${field}`. */
export const findingKey = (ruleId: string, field: string): string => `${ruleId}:${field}`;

/**
 * Maps a finding's logical field to the declaration key(s) on the label.
 * Composite findings (manufacturer/packer, dates) and derived findings
 * (mrp_inclusive_of_taxes) read from an underlying declaration.
 */
export const declarationKeysForFinding = (field: string): string[] => {
  if (field === 'manufacturer/packer') return ['manufacturer', 'packer'];
  if (field === 'mfg_date/pkd_date') return ['mfg_date', 'pkd_date'];
  if (field === 'mrp_inclusive_of_taxes') return ['mrp'];
  return [field];
};

export type ReviewValidation = { ok: true } | { ok: false; message: string };

export const validateReviewRequest = (decision: unknown, comment: unknown): ReviewValidation => {
  if (decision !== 'VERIFIED' && decision !== 'REJECTED') {
    return { ok: false, message: 'Decision must be either VERIFIED or REJECTED.' };
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string' && typeof comment !== 'number') {
    return { ok: false, message: 'Review comment must be a string.' };
  }
  if (decision === 'REJECTED' && (typeof comment !== 'string' || comment.trim().length === 0)) {
    return { ok: false, message: 'A comment/reason is required when rejecting a finding.' };
  }
  return { ok: true };
};

/**
 * Builds the declaration set used for rule evaluation after human reviews:
 *  - VERIFIED fields are treated as reliable evidence (confidence 1).
 *  - REJECTED fields are treated as unreliable (confidence null), so the
 *    deterministic engine never fabricates a result from a rejected extraction.
 * The original stored declarations are never mutated.
 */
export const evidenceAdjustedDeclarations = (
  declarations: Record<string, DeclaredField>,
  reviewedFindings: Record<string, IInspectionReviewEntry> | null | undefined
): Record<string, DeclaredField> => {
  const adjusted: Record<string, DeclaredField> = {};
  for (const [key, field] of Object.entries(declarations || {})) {
    adjusted[key] = { ...field };
  }

  for (const [finderId, record] of Object.entries(reviewedFindings || {})) {
    if (!record?.reviewStatus) continue;
    const field = finderId.slice(finderId.indexOf(':') + 1);
    for (const declKey of declarationKeysForFinding(field)) {
      const existing = adjusted[declKey];
      if (!existing) continue;
      const clone: DeclaredField = { ...existing };
      if (record.reviewStatus === 'VERIFIED') {
        clone.confidence = 1;
        clone.manuallyVerified = true;
      } else if (record.reviewStatus === 'REJECTED') {
        clone.confidence = null;
      }
      adjusted[declKey] = clone;
    }
  }
  return adjusted;
};

/**
 * Applies a single human review to an inspection and re-runs the affected rule
 * using the current canonical extracted value. The original AI finding is
 * preserved inside the review record.
 */
export const applyHumanReview = (opts: ApplyHumanReviewOptions): ApplyHumanReviewResult => {
  const { findings, extractedDeclarations, reviewedFindings, category, findingId, decision, comment, user } = opts;

  const previous = findings.find((f) => findingKey(f.ruleId, f.field) === findingId);

  const validation = validateReviewRequest(decision, comment);
  if (!validation.ok) {
    throw Object.assign(new Error(validation.message), { statusCode: 400 });
  }

  if (!previous) {
    throw Object.assign(new Error(`Finding "${findingId}" does not belong to this inspection.`), {
      statusCode: 404,
    });
  }

  if (reviewedFindings?.[findingId]) {
    throw Object.assign(
      new Error(`Finding "${findingId}" has already been reviewed. Duplicate or conflicting reviews are not allowed.`),
      { statusCode: 409 }
    );
  }

  const reviewRecord: IInspectionReviewEntry = {
    reviewStatus: decision,
    reviewedBy: user.id,
    reviewedByName: user.name,
    reviewedAt: new Date(),
    reviewComment: comment?.trim() || undefined,
    previousStatus: previous.status,
    previousFinding: { ...(previous as IInspectionFinding) },
  };

  const nextReviewed: Record<string, IInspectionReviewEntry> = {
    ...(reviewedFindings || {}),
    [findingId]: reviewRecord,
  };

  const adjusted = evidenceAdjustedDeclarations(extractedDeclarations || {}, nextReviewed);
  const findingsAfter = evaluateRules(adjusted, { category });
  const summary = summarizeFindings(findingsAfter);

  const resulting = findingsAfter.find((f) => findingKey(f.ruleId, f.field) === findingId);
  reviewRecord.resultingStatus = resulting?.status ?? reviewRecord.previousStatus;

  return { reviewRecord, findings: findingsAfter, summary, overall: summary.overall };
};