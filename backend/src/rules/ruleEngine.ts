import { Inspection } from '../models/Inspection';

export interface Rule {
  ruleId: string;
  version: string;
  title: string;
  category: string;
  sourceReference: string;
  evaluate: (declarations: Record<string, any>) => FindingResult[];
}

export interface FindingResult {
  ruleId: string;
  ruleVersion: string;
  field: string;
  observedValue: string | null;
  expectedCondition: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  requiresHumanReview: boolean;
  confidence?: number;
}

// Helper to ensure values are strings for UI rendering
const formatValue = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    // Try to format common object structures nicely
    if (val.name && val.address) return `${val.name}, ${val.address}`;
    if (val.value && val.unit) return `${val.value} ${val.unit}`;
    return JSON.stringify(val);
  }
  return String(val);
};

// Formalizing the rules from the Legal Metrology (Packaged Commodities) Rules, 2011
export const legalMetrologyRules: Rule[] = [
  {
    ruleId: 'LM-RULE-6-1-A',
    version: '2011-BASE',
    title: 'Manufacturer or Packer Identity',
    category: 'Identity',
    sourceReference: 'Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011',
    evaluate: (declarations) => {
      const results: FindingResult[] = [];
      const mfg = declarations['manufacturer'];
      const packer = declarations['packer'];
      
      if (mfg || packer) {
        results.push({
          ruleId: 'LM-RULE-6-1-A',
          ruleVersion: '2011-BASE',
          field: mfg ? 'manufacturer' : 'packer',
          observedValue: mfg?.value ? formatValue(mfg.value) : (packer?.value ? formatValue(packer.value) : 'Present'),
          expectedCondition: 'Name and address of manufacturer/packer must be present',
          status: 'COMPLIANT',
          severity: 'HIGH',
          explanation: 'Manufacturer/Packer identity was detected.',
          requiresHumanReview: false,
          confidence: mfg?.confidence || packer?.confidence
        });
      } else {
        results.push({
          ruleId: 'LM-RULE-6-1-A',
          ruleVersion: '2011-BASE',
          field: 'manufacturer/packer',
          observedValue: null,
          expectedCondition: 'Name and address of manufacturer/packer must be present',
          status: 'NON_COMPLIANT',
          severity: 'HIGH',
          explanation: 'Neither Manufacturer nor Packer details were found on the label.',
          requiresHumanReview: true
        });
      }
      return results;
    }
  },
  {
    ruleId: 'LM-RULE-6-1-B',
    version: '2011-BASE',
    title: 'Commodity Name',
    category: 'Identity',
    sourceReference: 'Rule 6(1)(b) of Legal Metrology (Packaged Commodities) Rules, 2011',
    evaluate: (declarations) => {
      const field = declarations['commodity_name'];
      return [{
        ruleId: 'LM-RULE-6-1-B',
        ruleVersion: '2011-BASE',
        field: 'commodity_name',
        observedValue: field?.value ? formatValue(field.value) : null,
        expectedCondition: 'Common or generic name of the commodity must be present',
        status: field ? 'COMPLIANT' : 'NON_COMPLIANT',
        severity: 'HIGH',
        explanation: field ? 'Commodity name detected.' : 'Commodity name is missing.',
        requiresHumanReview: !field,
        confidence: field?.confidence
      }];
    }
  },
  {
    ruleId: 'LM-RULE-6-1-C',
    version: '2011-BASE',
    title: 'Net Quantity',
    category: 'Quantity',
    sourceReference: 'Rule 6(1)(c) of Legal Metrology (Packaged Commodities) Rules, 2011',
    evaluate: (declarations) => {
      const field = declarations['net_quantity'];
      return [{
        ruleId: 'LM-RULE-6-1-C',
        ruleVersion: '2011-BASE',
        field: 'net_quantity',
        observedValue: field?.value ? formatValue(field.value) : null,
        expectedCondition: 'Net quantity must be declared in standard units of weight, measure or number',
        status: field ? 'COMPLIANT' : 'NON_COMPLIANT',
        severity: 'HIGH',
        explanation: field ? 'Net quantity detected.' : 'Net quantity is missing.',
        requiresHumanReview: !field,
        confidence: field?.confidence
      }];
    }
  },
  {
    ruleId: 'LM-RULE-6-1-D',
    version: '2011-BASE',
    title: 'Month and Year of Manufacture/Packaging',
    category: 'Dates',
    sourceReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011',
    evaluate: (declarations) => {
      const mfgDate = declarations['mfg_date'];
      const pkdDate = declarations['pkd_date'];
      const field = mfgDate || pkdDate;
      
      return [{
        ruleId: 'LM-RULE-6-1-D',
        ruleVersion: '2011-BASE',
        field: mfgDate ? 'mfg_date' : (pkdDate ? 'pkd_date' : 'mfg_date/pkd_date'),
        observedValue: field?.value ? formatValue(field.value) : null,
        expectedCondition: 'Month and year of manufacture or pre-packing must be declared',
        status: field ? 'COMPLIANT' : 'NON_COMPLIANT',
        severity: 'HIGH',
        explanation: field ? 'Manufacturing or Packaging date detected.' : 'Manufacturing/Packaging date is missing.',
        requiresHumanReview: !field,
        confidence: field?.confidence
      }];
    }
  },
  {
    ruleId: 'LM-RULE-6-1-E',
    version: '2011-BASE',
    title: 'Maximum Retail Price (MRP)',
    category: 'Pricing',
    sourceReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
    evaluate: (declarations) => {
      const results: FindingResult[] = [];
      const mrp = declarations['mrp'];
      const inclusive = declarations['mrp_inclusive_of_taxes'];

      if (!mrp) {
        results.push({
          ruleId: 'LM-RULE-6-1-E',
          ruleVersion: '2011-BASE',
          field: 'mrp',
          observedValue: null,
          expectedCondition: 'Retail sale price (MRP) must be declared',
          status: 'NON_COMPLIANT',
          severity: 'HIGH',
          explanation: 'MRP declaration is missing.',
          requiresHumanReview: true
        });
        return results;
      }

      results.push({
        ruleId: 'LM-RULE-6-1-E',
        ruleVersion: '2011-BASE',
        field: 'mrp',
        observedValue: typeof mrp.value === 'object' ? formatValue(mrp.value) : `₹${mrp.value}`,
        expectedCondition: 'Retail sale price (MRP) must be declared',
        status: 'COMPLIANT',
        severity: 'HIGH',
        explanation: 'MRP is declared.',
        requiresHumanReview: false,
        confidence: mrp.confidence
      });

      if (inclusive && (inclusive.value === true || String(inclusive.value).toLowerCase() === 'true')) {
        results.push({
          ruleId: 'LM-RULE-6-1-E-TAX',
          ruleVersion: '2011-BASE',
          field: 'mrp_inclusive_of_taxes',
          observedValue: 'Included',
          expectedCondition: 'MRP must state "Inclusive of all taxes"',
          status: 'COMPLIANT',
          severity: 'HIGH',
          explanation: '"Inclusive of all taxes" text was found accompanying the MRP.',
          requiresHumanReview: false,
          confidence: inclusive.confidence
        });
      } else {
        results.push({
          ruleId: 'LM-RULE-6-1-E-TAX',
          ruleVersion: '2011-BASE',
          field: 'mrp_inclusive_of_taxes',
          observedValue: 'Not detected',
          expectedCondition: 'MRP must state "Inclusive of all taxes"',
          status: 'NON_COMPLIANT',
          severity: 'HIGH',
          explanation: 'MRP is present but the mandatory "Inclusive of all taxes" declaration is missing.',
          requiresHumanReview: true
        });
      }

      return results;
    }
  },
  {
    ruleId: 'LM-RULE-6-1-H',
    version: '2011-BASE',
    title: 'Consumer Care Details',
    category: 'Consumer Care',
    sourceReference: 'Rule 6(1)(h) of Legal Metrology (Packaged Commodities) Rules, 2011',
    evaluate: (declarations) => {
      const email = declarations['consumer_care_email'];
      const phone = declarations['consumer_care_phone'];
      
      const results: FindingResult[] = [];
      
      if (!email && !phone) {
        results.push({
          ruleId: 'LM-RULE-6-1-H',
          ruleVersion: '2011-BASE',
          field: 'consumer_care',
          observedValue: null,
          expectedCondition: 'Consumer care contact details (phone/email) must be provided',
          status: 'NON_COMPLIANT',
          severity: 'HIGH',
          explanation: 'No consumer care contact information (phone or email) was detected.',
          requiresHumanReview: true
        });
      } else {
        results.push({
          ruleId: 'LM-RULE-6-1-H',
          ruleVersion: '2011-BASE',
          field: 'consumer_care',
          observedValue: [
            phone?.value ? formatValue(phone.value) : null,
            email?.value ? formatValue(email.value) : null
          ].filter(Boolean).join(', '),
          expectedCondition: 'Consumer care contact details (phone/email) must be provided',
          status: 'COMPLIANT',
          severity: 'HIGH',
          explanation: 'Consumer care details detected.',
          requiresHumanReview: false,
          confidence: email?.confidence || phone?.confidence
        });
      }
      return results;
    }
  }
];

export const evaluateRules = (declarations: Record<string, any>): FindingResult[] => {
  const allFindings: FindingResult[] = [];
  for (const rule of legalMetrologyRules) {
    allFindings.push(...rule.evaluate(declarations));
  }
  return allFindings;
};
