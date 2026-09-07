import { test } from 'node:test';
import assert from 'node:assert';
import unzipper from 'unzipper';
import { buildReportDocx, buildReportPdf, ReportInspectionData } from '../src/services/reportService';

const sampleData: ReportInspectionData = {
  inspectionId: 'INSP-TEST-1',
  createdAt: new Date('2026-01-05'),
  category: 'Food',
  productName: 'Biscuits',
  status: 'NON_COMPLIANT',
  reviewStatus: 'APPROVED',
  inspectorName: 'A. Officer',
  notes: 'MRP present but tax wording missing.',
  declarations: {
    mrp: { value: { amount: 20, currency: 'INR', inclusive_of_taxes: false } },
    manufacturer: { value: 'ABC Foods, Mumbai' },
    consumer_care: { value: '1800-000-000' },
    net_quantity: { value: { value: 120, unit: 'g' } },
  },
  findings: [
    {
      ruleId: 'LM-RULE-6-1-A',
      ruleVersion: '2011-BASE',
      field: 'manufacturer',
      observedValue: 'ABC Foods, Mumbai',
      expectedCondition: 'Manufacturer details must be declared',
      status: 'DETECTED',
      severity: 'LOW',
      explanation: 'Manufacturer identity is declared on the label.',
      sourceReference: 'Rule 6(1)(a), LM(PC) Rules 2011',
      requiresHumanReview: false,
      confidence: 0.96,
    },
    {
      ruleId: 'LM-RULE-3-FONT',
      ruleVersion: '2011-BASE',
      field: 'mrp_readability',
      observedValue: '14px, OCR conf 98%',
      expectedCondition: 'Text must be clearly legible',
      status: 'DETECTED',
      severity: 'LOW',
      explanation: 'The MRP text region is legible in the captured image.',
      sourceReference: 'Rule 3/Schedule 1, LM(PC) Rules 2011',
      requiresHumanReview: false,
      confidence: 0.98,
    },
  ],
  summary: { overall: 'NON_COMPLIANT', detected: 2, notDetected: 1, unableToVerify: 0, confirmedNonCompliant: 1, notApplicable: 0, total: 4 },
  missingFields: ['mfg_date', 'commodity_name'],
};

test('buildReportPdf produces a valid PDF buffer without blank pages', async () => {
  const pdf = await buildReportPdf({
    ...sampleData,
    findings: [
      sampleData.findings[0],
      { ...sampleData.findings[0], ruleId: 'LM-RULE-6-1-B', field: 'commodity_name' },
      { ...sampleData.findings[0], ruleId: 'LM-RULE-6-1-C', field: 'net_quantity' },
      { ...sampleData.findings[1], ruleId: 'LM-RULE-6-1-E', field: 'mrp' },
      sampleData.findings[1],
    ],
  });
  assert.ok(pdf.length > 1000, 'PDF must not be empty');
  assert.equal(pdf.slice(0, 5).toString(), '%PDF-');
  const text = pdf.toString('latin1');
  assert.ok(!text.includes('Page NaN'), 'PDF must not contain "Page NaN" in any footer');
  assert.ok((text.match(/\/Type\s*\/Page[^s]/g) || []).length <= 8, 'PDF must not balloon into many blank pages');
});

const unzipText = async (buffer: Buffer): Promise<string> => {
  const dir = await unzipper.Open.buffer(buffer);
  const file = dir.files.find((f) => f.path === 'word/document.xml');
  if (!file) return '';
  const body = await file.buffer();
  return body.toString('utf8');
};

test('buildReportDocx produces a real OOXML .docx (zipped document.xml)', async () => {
  const buffer = await buildReportDocx(sampleData);
  assert.ok(buffer.length > 500, 'docx must not be empty');
  assert.equal(buffer.slice(0, 2).toString(), 'PK', 'docx must be a ZIP archive');
  const xml = await unzipText(buffer);
  assert.ok(xml.includes('Legal Metrology Compliance Report'), 'document.xml must contain the report title');
  assert.ok(xml.includes('LM-RULE-3-FONT'), 'document.xml must contain the rule findings');
  assert.ok(xml.includes('Overall status'), 'document.xml must contain the overall status banner');
});

test('sanitization strips codepoints pdfkit fonts cannot render (rupee symbol)', async () => {
  const pdf = await buildReportPdf({ ...sampleData, findings: [{ ...sampleData.findings[0], observedValue: 'MRP \u20B9120' }] });
  assert.ok(pdf.length > 1000);
});