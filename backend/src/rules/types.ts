export type FindingStatus =
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'UNABLE_TO_VERIFY'
  | 'CONFIRMED_NON_COMPLIANT'
  | 'NOT_APPLICABLE';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DeclaredField {
  value: any;
  raw_text?: string | null;
  confidence?: number | null;
  bounding_box?: BoundingBox | null;
  source_line?: string | null;
  is_deterministic?: boolean;
  source?: string | null;
  evidenceImageId?: string | null;
  originalValue?: any;
  reviewedValue?: any;
  manuallyVerified?: boolean;
  editedBy?: string;
  editedAt?: string;
}

export interface FindingResult {
  ruleId: string;
  ruleVersion: string;
  field: string;
  observedValue: string | null;
  expectedCondition: string;
  status: FindingStatus;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  sourceReference: string;
  confidence: number | null;
  evidenceImageId?: string | null;
  boundingBox?: BoundingBox | null;
  requiresHumanReview: boolean;
}

export interface RuleContext {
  declarations: Record<string, DeclaredField>;
  category?: string;
}

export interface Rule {
  ruleId: string;
  version: string;
  title: string;
  category: string;
  sourceReference: string;
  effectiveFrom: string;
  applicableCategories: string[]; // ['*'] = applies to all categories
  evaluate: (ctx: RuleContext) => FindingResult[];
}