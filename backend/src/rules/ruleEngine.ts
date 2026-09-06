import { FindingResult, FindingStatus, Rule, RuleContext, DeclaredField } from './types';

export { FindingResult, FindingStatus, Rule, RuleContext, DeclaredField } from './types';

/** Same keys that the AI service treats as mandatory under the 2011 Rules. */
export const MANDATORY_FIELDS = [
  'mrp',
  'net_quantity',
  'mfg_date',
  'pkd_date',
  'manufacturer',
  'packer',
  'consumer_care',
  'commodity_name',
  'country_of_origin',
];

export type EvidenceLevel = 'reliable' | 'uncertain' | 'missing';

export const evidenceLevel = (field: DeclaredField | null | undefined): EvidenceLevel => {
  if (!field || field.value == null || field.value === '') return 'missing';
  const c = field.confidence;
  if (c == null) return 'uncertain'; // LLM-only or no measurable OCR confidence
  return c >= 0.8 ? 'reliable' : 'uncertain';
};

export const getField = (declarations: Record<string, DeclaredField>, key: string): DeclaredField | null =>
  declarations[key] ?? null;

export const formatValue = (val: any): string => {
  if (val == null) return '';
  if (typeof val !== 'object') return String(val);
  if ('amount' in val && typeof val.amount === 'number') {
    const parts = [`${val.currency || '₹'}${val.amount}`];
    if (val.inclusive_of_taxes) parts.push('(incl. of all taxes)');
    return parts.join(' ');
  }
  if ('value' in val && 'unit' in val && typeof val.unit === 'string') {
    return `${val.value} ${val.unit}`;
  }
  if (typeof val.name === 'string') {
    return val.address ? `${val.name}, ${val.address}` : val.name;
  }
  const parts = Object.values(val)
    .filter((v) => v != null && v !== '' && (typeof v !== 'boolean' || v === true))
    .map(String);
  return parts.length ? parts.join(', ') : String(val);
};

const statusForLevel = (level: EvidenceLevel): FindingStatus =>
  level === 'missing' ? 'NOT_DETECTED' : level === 'uncertain' ? 'UNABLE_TO_VERIFY' : 'DETECTED';

interface FindingOpts {
  rule: Rule;
  field: string;
  observedValue: string | null;
  expectedCondition: string;
  status: FindingStatus;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  evidence?: DeclaredField | null;
  confidence?: number | null;
}

const makeFinding = (opts: FindingOpts): FindingResult => {
  const { rule, field, observedValue, expectedCondition, status, severity, explanation, evidence, confidence } = opts;

  const needsReview =
    status === 'NOT_DETECTED' || status === 'UNABLE_TO_VERIFY' || status === 'CONFIRMED_NON_COMPLIANT';

  const fieldConfidence =
    confidence !== undefined ? confidence : evidence != null ? (evidence.confidence ?? null) : null;

  return {
    ruleId: rule.ruleId,
    ruleVersion: rule.version,
    field,
    observedValue,
    expectedCondition,
    status,
    severity,
    explanation,
    sourceReference: rule.sourceReference,
    confidence: fieldConfidence,
    evidenceImageId: evidence?.evidenceImageId ?? null,
    boundingBox: evidence?.bounding_box ?? null,
    requiresHumanReview: needsReview,
  };
};

// ---------------------------------------------------------------------------
// Rules are versioned and traceable to the legal source. New legal rules should
// be added here (or loaded from a rule store) without touching controllers/UI.
// ---------------------------------------------------------------------------

const legalMetrologyRules: Rule[] = [
  {
    ruleId: 'LM-RULE-6-1-A',
    version: '2011-BASE',
    title: 'Manufacturer or Packer Identity',
    category: 'Identity',
    sourceReference: 'Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011',
    effectiveFrom: '2011-03-01',
    applicableCategories: ['*'],
    evaluate: ({ declarations }) => {
      const mfg = getField(declarations, 'manufacturer');
      const packer = getField(declarations, 'packer');
      const evidence = mfg ?? packer;
      const field = mfg ? 'manufacturer' : packer ? 'packer' : 'manufacturer/packer';
      const level = evidenceLevel(mfg) !== 'missing' ? evidenceLevel(mfg) : evidenceLevel(packer);
      const present = evidence != null && evidence.value != null && String(evidence.value).trim().length > 0;

      let status: FindingStatus;
      let explanation: string;
      let observed: string | null;

      if (!present || level === 'missing') {
        status = 'NOT_DETECTED';
        observed = 'Not detected';
        explanation =
          'Neither manufacturer nor packer details were found on the label. This is a preliminary finding pending human verification.';
      } else if (level === 'uncertain') {
        status = 'UNABLE_TO_VERIFY';
        observed = formatValue(evidence.value);
        explanation =
          'Manufacturer/Packer details were detected but OCR/AI confidence is insufficient to confirm the declaration.';
      } else {
        status = 'DETECTED';
        observed = formatValue(evidence.value);
        explanation = 'Manufacturer/Packer identity is declared on the label.';
      }

      return [
        makeFinding({
          rule: legalMetrologyRules[0],
          field,
          observedValue: observed,
          expectedCondition: 'Name and address of manufacturer or packer must be present',
          status,
          severity: 'HIGH',
          explanation,
          evidence: present ? evidence : null,
        }),
      ];
    },
  },
  {
    ruleId: 'LM-RULE-6-1-B',
    version: '2011-BASE',
    title: 'Commodity Name',
    category: 'Identity',
    sourceReference: 'Rule 6(1)(b) of Legal Metrology (Packaged Commodities) Rules, 2011',
    effectiveFrom: '2011-03-01',
    applicableCategories: ['*'],
    evaluate: ({ declarations }) => {
      const field = getField(declarations, 'commodity_name');
      const level = evidenceLevel(field);
      const present = field != null && field.value != null && String(field.value).trim().length > 0;

      const status = !present ? 'NOT_DETECTED' : statusForLevel(level);
      const explanation =
        !present
          ? 'Commodity name is missing. This is a preliminary finding pending human verification.'
          : level === 'uncertain'
            ? 'Commodity name was detected but confidence is insufficient to confirm the declaration.'
            : 'Common or generic name of the commodity is declared.';

      return [
        makeFinding({
          rule: legalMetrologyRules[1],
          field: 'commodity_name',
          observedValue: present ? formatValue(field.value) : 'Not detected',
          expectedCondition: 'Common or generic name of the commodity must be present',
          status,
          severity: 'HIGH',
          explanation,
          evidence: present ? field : null,
        }),
      ];
    },
  },
  {
    ruleId: 'LM-RULE-6-1-C',
    version: '2011-BASE',
    title: 'Net Quantity',
    category: 'Quantity',
    sourceReference: 'Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011',
    effectiveFrom: '2011-03-01',
    applicableCategories: ['*'],
    evaluate: ({ declarations }) => {
      const field = getField(declarations, 'net_quantity');
      const level = evidenceLevel(field);
      const present = field != null && field.value != null && String(formatValue(field.value)).trim().length > 0;

      const status = !present ? 'NOT_DETECTED' : statusForLevel(level);
      const explanation =
        !present
          ? 'Net quantity declaration was not detected. This is a preliminary finding pending human verification.'
          : level === 'uncertain'
            ? 'Net quantity was detected but confidence is insufficient to confirm the declaration.'
            : 'Net quantity is declared in a standard unit of weight, measure or number.';

      return [
        makeFinding({
          rule: legalMetrologyRules[2],
          field: 'net_quantity',
          observedValue: present ? formatValue(field.value) : 'Not detected',
          expectedCondition: 'Net quantity must be declared in standard units of weight, measure or number',
          status,
          severity: 'HIGH',
          explanation,
          evidence: present ? field : null,
        }),
      ];
    },
  },
  {
    ruleId: 'LM-RULE-6-1-D',
    version: '2011-BASE',
    title: 'Month and Year of Manufacture/Packaging',
    category: 'Dates',
    sourceReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011',
    effectiveFrom: '2011-03-01',
    applicableCategories: ['*'],
    evaluate: ({ declarations }) => {
      const mfg = getField(declarations, 'mfg_date');
      const pkd = getField(declarations, 'pkd_date');
      const evidence = mfg ?? pkd;
      const field = mfg ? 'mfg_date' : pkd ? 'pkd_date' : 'mfg_date/pkd_date';
      const level = evidenceLevel(mfg) !== 'missing' ? evidenceLevel(mfg) : evidenceLevel(pkd);
      const present = evidence != null && evidence.value != null && String(evidence.value).trim().length > 0;

      const status = !present ? 'NOT_DETECTED' : statusForLevel(level);
      const explanation =
        !present
          ? 'Manufacturing or packaging date is missing. This is a preliminary finding pending human verification.'
          : level === 'uncertain'
            ? 'Manufacturing/Packaging date was detected but confidence is insufficient to confirm the declaration.'
            : 'Month and year of manufacture or pre-packing is declared.';

      return [
        makeFinding({
          rule: legalMetrologyRules[3],
          field,
          observedValue: present ? formatValue(evidence.value) : 'Not detected',
          expectedCondition: 'Month and year of manufacture or pre-packing must be declared',
          status,
          severity: 'HIGH',
          explanation,
          evidence: present ? evidence : null,
        }),
      ];
    },
  },
  {
    ruleId: 'LM-RULE-6-1-E',
    version: '2011-BASE',
    title: 'Maximum Retail Price (MRP)',
    category: 'Pricing',
    sourceReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
    effectiveFrom: '2011-03-01',
    applicableCategories: ['*'],
    evaluate: ({ declarations }) => {
      const mrp = getField(declarations, 'mrp');
      const level = evidenceLevel(mrp);
      const present = mrp != null && mrp.value != null && mrp.value.amount != null;

      const mrpFinding = makeFinding({
        rule: legalMetrologyRules[4],
        field: 'mrp',
        observedValue: present ? formatValue(mrp.value) : 'Not detected',
        expectedCondition: 'Retail sale price (MRP) must be declared',
        status: !present ? 'NOT_DETECTED' : statusForLevel(level),
        severity: 'HIGH',
        explanation: !present
          ? 'MRP declaration was not detected. This is a preliminary finding pending human verification.'
          : level === 'uncertain'
            ? 'MRP was detected but confidence is insufficient to confirm the declaration.'
            : 'MRP is declared on the label.',
        evidence: present ? mrp : null,
      });

      // Inclusive-of-taxes wording is mandatory when MRP is declared (Rule 6(1)(e)).
      const inclusiveValue =
        present && mrp.value && typeof mrp.value === 'object' && mrp.value.inclusive_of_taxes === true;

      let taxStatus: FindingStatus;
      let taxExplanation: string;
      if (!present) {
        taxStatus = 'NOT_DETECTED';
        taxExplanation = 'Cannot assess "Inclusive of all taxes" wording because MRP was not detected.';
      } else if (level === 'uncertain') {
        taxStatus = 'UNABLE_TO_VERIFY';
        taxExplanation = '"Inclusive of all taxes" wording could not be verified at current confidence.';
      } else if (inclusiveValue) {
        taxStatus = 'DETECTED';
        taxExplanation = '"Inclusive of all taxes" text accompanies the MRP.';
      } else {
        taxStatus = 'CONFIRMED_NON_COMPLIANT';
        taxExplanation =
          'MRP is declared but the mandatory "Inclusive of all taxes" wording was not detected on the label.';
      }

      const taxFinding = makeFinding({
        rule: legalMetrologyRules[4],
        field: 'mrp_inclusive_of_taxes',
        observedValue: taxStatus === 'DETECTED' ? 'Included' : taxStatus === 'CONFIRMED_NON_COMPLIANT' ? 'Not detected' : 'Not verifiable',
        expectedCondition: 'MRP must state "Inclusive of all taxes"',
        status: taxStatus,
        severity: 'HIGH',
        explanation: taxExplanation,
        evidence: present ? mrp : null,
        confidence: inclusiveValue ? (mrp.confidence ?? null) : null,
      });

      return [mrpFinding, taxFinding];
    },
  },
  {
    ruleId: 'LM-RULE-6-1-H',
    version: '2011-BASE',
    title: 'Consumer Care Details',
    category: 'Consumer Care',
    sourceReference: 'Rule 6(1)(h) of Legal Metrology (Packaged Commodities) Rules, 2011',
    effectiveFrom: '2011-03-01',
    applicableCategories: ['*'],
    evaluate: ({ declarations }) => {
      const field = getField(declarations, 'consumer_care');
      const level = evidenceLevel(field);
      const contact = field?.value ? (field.value.email || field.value.phone) : null;
      const present = field != null && !!contact;

      let status: FindingStatus;
      let explanation: string;
      if (!present) {
        status = 'NOT_DETECTED';
        explanation =
          'No consumer care contact information (phone or email) was detected. This is a preliminary finding pending human verification.';
      } else if (level === 'uncertain') {
        status = 'UNABLE_TO_VERIFY';
        explanation = 'Consumer care details were detected but confidence is insufficient to confirm the declaration.';
      } else {
        status = 'DETECTED';
        explanation = 'Consumer care contact details are declared on the label.';
      }

      return [
        makeFinding({
          rule: legalMetrologyRules[5],
          field: 'consumer_care',
          observedValue: present ? formatValue(field.value) : 'Not detected',
          expectedCondition: 'Consumer care contact details (phone/email) must be provided',
          status,
          severity: 'HIGH',
          explanation,
          evidence: present ? field : null,
        }),
      ];
    },
  },
];

const notApplicableFinding = (rule: Rule): FindingResult => ({
  ruleId: rule.ruleId,
  ruleVersion: rule.version,
  field: rule.category,
  observedValue: null,
  expectedCondition: 'Rule is applicable to this product category',
  status: 'NOT_APPLICABLE',
  severity: 'LOW',
  explanation: `Rule "${rule.title}" applies only to categories: ${rule.applicableCategories.join(', ')}.`,
  sourceReference: rule.sourceReference,
  confidence: null,
  requiresHumanReview: false,
});

export const evaluateRules = (
  declarations: Record<string, DeclaredField>,
  ctx: { category?: string } = {}
): FindingResult[] => {
  const allFindings: FindingResult[] = [];
  for (const rule of legalMetrologyRules) {
    if (!rule.applicableCategories.includes('*') && !rule.applicableCategories.includes(ctx.category ?? '')) {
      allFindings.push(notApplicableFinding(rule));
      continue;
    }
    allFindings.push(...rule.evaluate({ declarations, category: ctx.category }));
  }
  return allFindings;
};

export interface ComplianceSummary {
  detected: number;
  notDetected: number;
  unableToVerify: number;
  confirmedNonCompliant: number;
  notApplicable: number;
  overall: 'COMPLIANT' | 'REVIEW_REQUIRED' | 'NON_COMPLIANT';
}

export const summarizeFindings = (findings: FindingResult[]): ComplianceSummary => {
  const summary: ComplianceSummary = {
    detected: 0,
    notDetected: 0,
    unableToVerify: 0,
    confirmedNonCompliant: 0,
    notApplicable: 0,
    overall: 'COMPLIANT',
  };

  for (const f of findings) {
    if (f.status === 'DETECTED') summary.detected += 1;
    else if (f.status === 'NOT_DETECTED') summary.notDetected += 1;
    else if (f.status === 'UNABLE_TO_VERIFY') summary.unableToVerify += 1;
    else if (f.status === 'CONFIRMED_NON_COMPLIANT') summary.confirmedNonCompliant += 1;
    else if (f.status === 'NOT_APPLICABLE') summary.notApplicable += 1;
  }

  if (summary.confirmedNonCompliant > 0) summary.overall = 'NON_COMPLIANT';
  else if (summary.notDetected + summary.unableToVerify > 0) summary.overall = 'REVIEW_REQUIRED';

  return summary;
};