import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRules, DeclaredField } from '../src/rules/ruleEngine';
import { applyHumanReview, evidenceAdjustedDeclarations } from '../src/services/reviewService';

const field = (value: unknown, confidence: number | null = 0.95, extra: Partial<DeclaredField> = {}): DeclaredField => ({
  value,
  confidence,
  is_deterministic: true,
  bounding_box: { x: 10, y: 20, width: 120, height: 30 },
  evidenceImageId: 'https://example.com/img.jpg',
  ...extra,
});

const INSPECTOR = { id: 'user-123', name: 'Sanyam Dhawan' };

test('VERIFY: low-confidence UNABLE_TO_VERIFY finding becomes reliable after human verification', () => {
  const declarations: Record<string, DeclaredField> = {
    net_quantity: field({ value: 250, unit: 'g' }, 0.45),
  };
  const findings = evaluateRules(declarations);
  const before = findings.find((f) => f.field === 'net_quantity');
  assert.equal(before?.status, 'UNABLE_TO_VERIFY');

  const result = applyHumanReview({
    findings,
    extractedDeclarations: declarations,
    reviewedFindings: {},
    findingId: 'LM-RULE-6-1-C:net_quantity',
    decision: 'VERIFIED',
    comment: '250 g clearly visible on package.',
    user: INSPECTOR,
  });

  assert.equal(result.reviewRecord.reviewStatus, 'VERIFIED');
  assert.equal(result.reviewRecord.reviewedBy, 'user-123');
  assert.equal(result.reviewRecord.reviewedByName, 'Sanyam Dhawan');
  assert.equal(result.reviewRecord.previousStatus, 'UNABLE_TO_VERIFY');
  assert.equal(result.reviewRecord.reviewComment, '250 g clearly visible on package.');

  const after = result.findings.find((f) => f.field === 'net_quantity');
  assert.equal(after?.status, 'DETECTED');
  assert.equal(result.reviewRecord.resultingStatus, 'DETECTED');
});

test('REJECT: comment is required and rule is re-run (never a confirmed violation)', () => {
  const declarations: Record<string, DeclaredField> = {
    net_quantity: field({ value: 250, unit: 'g' }, 0.45),
  };
  const findings = evaluateRules(declarations);

  assert.throws(
    () =>
      applyHumanReview({
        findings,
        extractedDeclarations: declarations,
        reviewedFindings: {},
        findingId: 'LM-RULE-6-1-C:net_quantity',
        decision: 'REJECTED',
        user: INSPECTOR,
      }),
    (err: any) => err?.statusCode === 400 && /comment\/reason/.test(err?.message || '')
  );

  const result = applyHumanReview({
    findings,
    extractedDeclarations: declarations,
    reviewedFindings: {},
    findingId: 'LM-RULE-6-1-C:net_quantity',
    decision: 'REJECTED',
    comment: 'That figure is a barcode, not the declared weight.',
    user: INSPECTOR,
  });

  assert.equal(result.reviewRecord.reviewStatus, 'REJECTED');
  const after = result.findings.find((f) => f.field === 'net_quantity');
  assert.equal(after?.status, 'UNABLE_TO_VERIFY');
  assert.ok(result.findings.every((f) => f.status !== 'CONFIRMED_NON_COMPLIANT'));
  assert.equal(result.reviewRecord.resultingStatus, 'UNABLE_TO_VERIFY');
});

test('rejection of a confirmed non-compliance returns to UNABLE_TO_VERIFY', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: false }, 0.97),
  };
  const findings = evaluateRules(declarations);
  const taxBefore = findings.find((f) => f.field === 'mrp_inclusive_of_taxes');
  assert.equal(taxBefore?.status, 'CONFIRMED_NON_COMPLIANT');

  const result = applyHumanReview({
    findings,
    extractedDeclarations: declarations,
    reviewedFindings: {},
    findingId: 'LM-RULE-6-1-E:mrp_inclusive_of_taxes',
    decision: 'REJECTED',
    comment: 'The "Inclusive of all taxes" line exists but OCR missed it.',
    user: INSPECTOR,
  });
  const taxAfter = result.findings.find((f) => f.field === 'mrp_inclusive_of_taxes');
  assert.equal(taxAfter?.status, 'UNABLE_TO_VERIFY');
});

test('VERIFY does NOT mean compliant: the rule engine still decides', () => {
  const declarations: Record<string, DeclaredField> = {
    mrp: field({ amount: 120, currency: 'INR', inclusive_of_taxes: false }, 0.45),
  };
  const findings = evaluateRules(declarations);
  const taxBefore = findings.find((f) => f.field === 'mrp_inclusive_of_taxes');
  assert.equal(taxBefore?.status, 'UNABLE_TO_VERIFY');

  const result = applyHumanReview({
    findings,
    extractedDeclarations: declarations,
    reviewedFindings: {},
    findingId: 'LM-RULE-6-1-E:mrp',
    decision: 'VERIFIED',
    comment: 'MRP ₹120 is clearly visible.',
    user: INSPECTOR,
  });

  // Verified extraction, but the inclusive-of-taxes wording is still absent -> NON_COMPLIANT
  const taxAfter = result.findings.find((f) => f.field === 'mrp_inclusive_of_taxes');
  assert.equal(taxAfter?.status, 'CONFIRMED_NON_COMPLIANT');
});

test('VERIFY of a missing field does not fabricate a value (stays NOT_DETECTED)', () => {
  const findings = evaluateRules({});
  const mfgFinding = findings.find((f) => f.field.includes('mfg_date'));
  assert.ok(mfgFinding);

  const result = applyHumanReview({
    findings,
    extractedDeclarations: {},
    reviewedFindings: {},
    findingId: `${mfgFinding.ruleId}:${mfgFinding.field}`,
    decision: 'VERIFIED',
    comment: 'Nothing to verify - not visible in image.',
    user: INSPECTOR,
  });

  const after = result.findings.find((f) => f.ruleId === mfgFinding.ruleId && f.field === mfgFinding.field);
  assert.equal(after?.status, 'NOT_DETECTED');
});

test('original AI/OCR finding is preserved in the review record and never overwritten', () => {
  const declarations: Record<string, DeclaredField> = {
    net_quantity: field({ value: 250, unit: 'g' }, 0.45),
  };
  const findings = evaluateRules(declarations);
  const before = findings.find((f) => f.field === 'net_quantity');

  const result = applyHumanReview({
    findings,
    extractedDeclarations: declarations,
    reviewedFindings: {},
    findingId: 'LM-RULE-6-1-C:net_quantity',
    decision: 'VERIFIED',
    comment: '250 g clearly visible on package.',
    user: INSPECTOR,
  });

  assert.deepEqual(result.reviewRecord.previousFinding?.observedValue, before?.observedValue);
  assert.equal(result.reviewRecord.previousFinding?.status, 'UNABLE_TO_VERIFY');
  assert.equal(declarations.net_quantity.confidence, 0.45, 'stored declaration must be untouched');

  const adjusted = evidenceAdjustedDeclarations(declarations, {});
  assert.equal(adjusted.net_quantity.confidence, 0.45);
});

test('existing review blocks duplicate or conflicting reviews', () => {
  const declarations: Record<string, DeclaredField> = {
    net_quantity: field({ value: 250, unit: 'g' }, 0.45),
  };
  const findings = evaluateRules(declarations);
  const first = applyHumanReview({
    findings,
    extractedDeclarations: declarations,
    reviewedFindings: {},
    findingId: 'LM-RULE-6-1-C:net_quantity',
    decision: 'VERIFIED',
    comment: 'Confirmed from package.',
    user: INSPECTOR,
  });

  assert.throws(
    () =>
      applyHumanReview({
        findings: first.findings,
        extractedDeclarations: declarations,
        reviewedFindings: { 'LM-RULE-6-1-C:net_quantity': first.reviewRecord },
        findingId: 'LM-RULE-6-1-C:net_quantity',
        decision: 'REJECTED',
        comment: 'Changed my mind.',
        user: INSPECTOR,
      }),
    (err: any) => err?.statusCode === 409
  );
});

test('invalid decision and unknown finding are rejected', () => {
  const findings = evaluateRules({});
  assert.throws(
    () =>
      applyHumanReview({
        findings,
        extractedDeclarations: {},
        reviewedFindings: {},
        findingId: 'LM-RULE-6-1-C:net_quantity',
        decision: 'APPROVED' as any,
        user: INSPECTOR,
      }),
    (err: any) => err?.statusCode === 400
  );

  assert.throws(
    () =>
      applyHumanReview({
        findings,
        extractedDeclarations: {},
        reviewedFindings: {},
        findingId: 'LM-RULE-6-1-XX:mystery_field',
        decision: 'VERIFIED',
        user: INSPECTOR,
      }),
    (err: any) => err?.statusCode === 404
  );
});