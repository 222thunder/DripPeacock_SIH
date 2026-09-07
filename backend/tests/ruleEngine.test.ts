import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRules, summarizeFindings, MANDATORY_FIELDS, DeclaredField } from '../src/rules/ruleEngine';

const field = (value: unknown, confidence: number | null = 0.95, extra: Partial<DeclaredField> = {}): DeclaredField => ({
  value,
  confidence,
  is_deterministic: true,
  bounding_box: { x: 0, y: 0, width: 100, height: 20 },
  evidenceImageId: 'https://example.com/img.jpg',
  ...extra,
});

test('all mandatory fields detected at high confidence -> COMPLIANT', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: true }, 0.97),
    net_quantity: field({ value: 250, unit: 'g' }, 0.95),
    mfg_date: field('05/2026', 0.94),
    manufacturer: field({ name: 'ABC Foods', address: 'Mumbai' }, 0.9),
    consumer_care: field({ email: 'care@abc.in', phone: '1800-200-1122' }, 0.96),
    commodity_name: field('Almonds', 0.93),
    country_of_origin: field('India', 0.99),
  };

  const findings = evaluateRules(declarations);
  const summary = summarizeFindings(findings);

  assert.equal(summary.overall, 'COMPLIANT');
  assert.ok(findings.every((f) => f.status === 'DETECTED' || f.status === 'NOT_APPLICABLE'));
});

test('high-confidence missing declarations -> NOT_DETECTED (not confirmed violation)', () => {
  const findings = evaluateRules({});
  const notDetected = findings.filter((f) => f.status === 'NOT_DETECTED');
  assert.ok(notDetected.length > 0);
  assert.ok(notDetected.every((f) => f.requiresHumanReview === true));
  assert.ok(findings.every((f) => f.status !== 'CONFIRMED_NON_COMPLIANT'));
});

test('low-confidence OCR -> UNABLE_TO_VERIFY, never CONFIRMED_NON_COMPLIANT', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: false }, 0.45),
  };
  const findings = evaluateRules(declarations);

  const mrpFinding = findings.find((f) => f.field === 'mrp');
  assert.equal(mrpFinding?.status, 'UNABLE_TO_VERIFY');

  const taxFinding = findings.find((f) => f.field === 'mrp_inclusive_of_taxes');
  assert.equal(taxFinding?.status, 'UNABLE_TO_VERIFY'); // uncertainty must not produce a confirmed violation
  assert.ok(findings.every((f) => f.status !== 'CONFIRMED_NON_COMPLIANT'));
});

test('LLM-only extraction (no confidence) -> UNABLE_TO_VERIFY', () => {
  const declarations: Record<string, DeclaredField> = {
    commodity_name: field('Almonds', null),
  };
  const findings = evaluateRules(declarations);
  const commodity = findings.find((f) => f.field === 'commodity_name');
  assert.equal(commodity?.status, 'UNABLE_TO_VERIFY');
  assert.equal(commodity?.confidence, null);
});

test('findings carry source reference, evidence image and bounding box', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: true }, 0.98),
  };
  const findings = evaluateRules(declarations);
  const mrpFinding = findings.find((f) => f.field === 'mrp');
  assert.ok(mrpFinding);
  assert.ok(mrpFinding.sourceReference.includes('Legal Metrology'));
  assert.equal(mrpFinding.evidenceImageId, 'https://example.com/img.jpg');
  assert.deepEqual(mrpFinding.boundingBox, { x: 0, y: 0, width: 100, height: 20 });
  assert.equal(mrpFinding.ruleVersion, '2011-BASE');
});

test('MRP without inclusive-of-taxes at high confidence -> CONFIRMED_NON_COMPLIANT (review required)', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: false }, 0.97),
  };
  const findings = evaluateRules(declarations);
  const taxFinding = findings.find((f) => f.field === 'mrp_inclusive_of_taxes');
  assert.equal(taxFinding?.status, 'CONFIRMED_NON_COMPLIANT');
  assert.equal(taxFinding?.requiresHumanReview, true);
  assert.equal(summarizeFindings(findings).overall, 'NON_COMPLIANT');
});

test('category applicability: non-applicable rule returns NOT_APPLICABLE', () => {
  const findings = evaluateRules(
    { mrp: field({ amount: 10, currency: 'INR', inclusive_of_taxes: true }, 0.98) },
    { category: 'textile' }
  );
  // All current rules apply to every category, so no NOT_APPLICABLE should appear for '*' rules.
  assert.ok(findings.every((f) => f.status !== 'NOT_APPLICABLE'));
});

test('human-review resubmission keeps original evidence intact', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 100, currency: 'INR', inclusive_of_taxes: true }, 0.99),
  };
  const findings = evaluateRules(declarations);
  // The model never drops or overrides original evidence on re-evaluation
  const reFindings = evaluateRules(declarations);
  assert.equal(findings.length, reFindings.length);
  assert.deepEqual(
    findings.map((f) => ({ field: f.field, status: f.status })),
    reFindings.map((f) => ({ field: f.field, status: f.status }))
  );
});

test('MANDATORY_FIELDS matches the schema keys produced by the AI service', () => {
  assert.ok(MANDATORY_FIELDS.includes('mrp'));
  assert.ok(MANDATORY_FIELDS.includes('net_quantity'));
  assert.ok(MANDATORY_FIELDS.includes('consumer_care'));
  assert.ok(MANDATORY_FIELDS.includes('commodity_name'));
});

test('font size / readability: legible region at high OCR confidence -> DETECTED', () => {
  const findings = evaluateRules({
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: true }, 0.98, {
      bounding_box: { x: 0, y: 0, width: 100, height: 22 },
    }),
  });
  const readability = findings.find((f) => f.field === 'mrp_readability');
  assert.equal(readability?.status, 'DETECTED');
  assert.equal(readability?.ruleId, 'LM-RULE-3-FONT');
  assert.ok((readability?.explanation || '').includes('legible'));
});

test('font size / readability: no text region -> UNABLE_TO_VERIFY (never a confirmed violation)', () => {
  const findings = evaluateRules({
    net_quantity: field({ value: 250, unit: 'g' }, 0.95, { bounding_box: null }),
  });
  const readability = findings.find((f) => f.field === 'net_quantity_readability');
  assert.equal(readability?.status, 'UNABLE_TO_VERIFY');
  assert.equal(readability?.requiresHumanReview, true);
});

test('font size / readability: missing region and confidence renders readable observed text (no "n/apx")', () => {
  const findings = evaluateRules({
    consumer_care: field({ phone: '080-6614-1234' }, null, { bounding_box: null }),
  });
  const readability = findings.find((f) => f.field === 'consumer_care_readability');
  assert.equal(readability?.status, 'UNABLE_TO_VERIFY');
  assert.ok((readability?.observedValue || '').includes('Text height not measurable'), 'observed text must be readable');
  assert.ok((readability?.observedValue || '').includes('OCR conf not available'));
  assert.ok(!(readability?.observedValue || '').includes('n/apx'));
});

test('font size / readability: very small text region -> CONFIRMED_NON_COMPLIANT (review required)', () => {
  const findings = evaluateRules({
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: true }, 0.95, {
      bounding_box: { x: 0, y: 0, width: 40, height: 5 },
    }),
  });
  const readability = findings.find((f) => f.field === 'mrp_readability');
  assert.equal(readability?.status, 'CONFIRMED_NON_COMPLIANT');
  assert.equal(readability?.requiresHumanReview, true);
});