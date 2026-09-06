# AGENTS.md

## Project: Legal Metrology Packaged Commodity Compliance System

### Problem Statement
**SIH Problem Statement ID:** 26034  
**Title:** Software System to check compliance of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules, 2011 by scanning products, images and labels.

## 1. Project Goal

Build an AI-assisted software platform that scans packaged commodity images, labels, and product listings; extracts mandatory declarations; validates them against the applicable Legal Metrology (Packaged Commodities) Rules, 2011; identifies potential non-compliances; stores inspection evidence and history; and generates compliance reports.

The system is intended to assist enforcement officials. It must distinguish between:
- Confirmed/deterministic rule violations
- Warnings or possible violations
- Cases requiring human verification
- Compliant declarations

Do not present an AI prediction as a legally conclusive finding unless the applicable rule and evidence support that conclusion.

---

## 2. Core Workflow

The primary workflow is:

**Image/Product Listing → Image Processing → OCR → Information Extraction → Rule Engine → Compliance Result → Evidence Storage → Report Generation → Dashboard**

Example:

1. Inspector uploads one or more product/label images.
2. System preprocesses the images.
3. OCR extracts visible text.
4. Information extraction maps text to structured declarations.
5. Computer vision identifies declaration regions/bounding boxes where required.
6. Rule engine selects applicable requirements and validates extracted declarations.
7. System produces PASS / FAIL / REVIEW results for individual checks.
8. Inspector can review, correct, or annotate extracted information.
9. Images and inspection metadata are stored as evidence.
10. A PDF/editable report is generated.
11. Inspection and product history are available from the dashboard.

---

## 3. Mandatory Functional Modules

### 3.1 Authentication and RBAC
Support secure authentication and role-based access.

Suggested roles:
- **Admin:** users, system configuration, rule management, global reports
- **Inspector:** scan products, review OCR, perform inspections, generate reports
- **Supervisor:** review inspections, approve/finalize reports, analytics

Never expose privileged operations through client-side authorization alone. Enforce permissions on the backend.

### 3.2 Product Scanner
Support:
- Image upload
- Camera/mobile capture where applicable
- Multiple images per product
- Front/back/side/label evidence
- Product/category metadata
- Scan/inspection ID generation

### 3.3 OCR
Extract text from package images.

Potential implementation:
- PaddleOCR or Tesseract for initial/local OCR
- Optional cloud OCR as a configurable provider

OCR output should preserve:
- Extracted text
- Confidence
- Bounding box
- Source image
- Page/region information

Do not discard raw OCR output; it is useful for auditability and debugging.

### 3.4 Declaration Extraction
Map OCR/CV output to structured fields, such as:
- Manufacturer/packer/importer
- Name/address information
- Net quantity
- MRP
- Tax-inclusive MRP wording where applicable
- Date/month/year declarations
- Consumer care details
- Other declarations applicable to the product/category

Use deterministic parsing (regex, patterns, normalization) wherever practical. Use ML/LLM extraction only where it provides a meaningful advantage.

### 3.5 Rule Engine
The rule engine is a critical component.

Rules must be:
- Versioned
- Testable
- Explainable
- Product/category aware
- Traceable to the applicable legal source
- Separated from UI code

Each compliance result should identify:
- Rule/check ID
- Requirement
- Observed value
- Expected condition
- Result
- Evidence
- Confidence, where applicable
- Whether human review is required

Do not hard-code legal assumptions from memory. Use the current authoritative legal text and maintain a rule-source/version field.

### 3.6 Font Size and Readability
Where applicable, assess:
- Text visibility
- OCR confidence
- Character/text dimensions
- Applicable minimum-size requirements

A normal photograph does not always provide enough information to determine real-world physical font size accurately. If scale/calibration is unavailable, return **REVIEW / UNABLE TO VERIFY** instead of inventing a measurement.

### 3.7 Placement and Presentation
Where a rule specifies placement/presentation:
- Detect declaration bounding boxes.
- Analyze relative position/visibility.
- Compare against the applicable requirement.
- Store the image region used as evidence.

Avoid claiming legal compliance solely from a generic computer-vision heuristic.

### 3.8 Violation Detection
Classify findings as:
- `COMPLIANT`
- `NON_COMPLIANT`
- `REVIEW_REQUIRED`
- `NOT_APPLICABLE`
- `INSUFFICIENT_EVIDENCE`

Every non-compliant/review result should have an explanation.

### 3.9 Inspection Repository
Store:
- Product information
- Images/evidence
- OCR output
- Extracted declarations
- Rule results
- Inspector
- Timestamp
- Inspection status
- Notes
- Report references
- Review/approval history

Support search/filter by:
- Product
- Category
- Inspection ID
- Date
- Compliance status
- Violation type
- Inspector

### 3.10 Reports
Generate:
- Compliance report
- Violation summary
- Inspection evidence
- Extracted declarations
- Rule/check results
- Reviewer/inspector details
- Report version

Export formats:
- PDF
- Editable document format where required

Reports should clearly indicate AI-assisted findings and human review status.

### 3.11 Dashboard
Dashboard should show:
- Total inspections
- Compliant products
- Non-compliant products
- Review-required cases
- Violation trends
- Product/category breakdown
- Recent inspections
- Pending reviews

---

## 4. Suggested Technical Architecture

Preferred architecture:

```text
                    React / Next.js
                         │
                         ▼
                  Node.js + Express
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          MongoDB     AI/OCR API   Rule Engine
                         │
                    Python/FastAPI
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
            OCR       OpenCV       ML/NLP
             │           │           │
             └───────────┼───────────┘
                         ▼
                Structured Declarations
                         │
                         ▼
                   Compliance Rules
                         │
                         ▼
                 Compliance Findings
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
          Evidence Store       Report Service
                                   │
                              PDF / Editable
```

The exact technology can change if there is a strong reason, but architecture boundaries should remain clear.

---

## 5. Backend API Principles

Use REST APIs with clear resource boundaries.

Suggested resources:

```text
/auth
/users
/products
/inspections
/images
/ocr
/declarations
/rules
/compliance
/violations
/reports
/dashboard
```

Example:

```http
POST /api/inspections
POST /api/inspections/:id/images
POST /api/inspections/:id/analyze
GET  /api/inspections/:id
GET  /api/inspections
GET  /api/inspections/:id/report
```

Backend must validate all incoming data.

Never trust:
- Client-supplied roles
- Compliance results
- Product IDs
- File metadata
- Extracted fields
- Report status

---

## 6. Suggested Data Model

### Product

```javascript
{
  _id,
  name,
  brand,
  category,
  manufacturer,
  createdAt,
  updatedAt
}
```

### Inspection

```javascript
{
  _id,
  inspectionId,
  productId,
  inspectorId,
  status,
  images: [],
  extractedDeclarations: {},
  findings: [],
  notes,
  reviewStatus,
  createdAt,
  updatedAt
}
```

### Finding

```javascript
{
  ruleId,
  ruleVersion,
  field,
  observedValue,
  expectedCondition,
  status,
  severity,
  explanation,
  evidenceImageId,
  confidence,
  requiresHumanReview
}
```

### Rule

```javascript
{
  ruleId,
  version,
  title,
  description,
  category,
  applicability,
  validationType,
  parameters,
  sourceReference,
  effectiveFrom,
  effectiveTo,
  active
}
```

---

## 7. AI/OCR Design Rules

### Prefer deterministic logic for:
- MRP pattern detection
- Currency extraction
- Quantity/unit parsing
- Phone/email detection
- Date pattern detection
- Required-field presence
- Numeric comparisons

### Use AI/ML for:
- Text region detection
- Poor-quality OCR assistance
- Semantic field classification
- Label understanding
- Ambiguous declaration mapping
- Image quality assessment

### AI safety/quality requirements
- Store confidence scores.
- Preserve raw OCR.
- Allow human correction.
- Do not silently overwrite inspector edits.
- Keep model/provider/version metadata.
- Never fabricate missing declarations.
- If evidence is insufficient, return `REVIEW_REQUIRED`.

---

## 8. Legal Rule Handling

Legal requirements can change. Therefore:

- Do not scatter legal rules throughout controllers/components.
- Store rules in a dedicated rule layer/database.
- Version rules.
- Keep source references.
- Track effective dates where available.
- Support category-specific applicability.
- Add automated unit tests for every rule.
- Provide an admin/reviewer mechanism for updating rules.

The system should be designed so that a rule update does not require rewriting the entire application.

---

## 9. Evidence and Auditability

Every finding should be traceable to evidence.

For example:

```text
Finding: MRP declaration detected
Source image: back_label.jpg
Bounding box: [x, y, width, height]
OCR text: "MRP ₹120"
OCR confidence: 0.97
Rule: <rule ID/version>
Result: COMPLIANT
```

Maintain an audit trail for:
- Initial extraction
- Inspector edits
- Rule evaluation
- Review
- Approval
- Report generation
- Report revisions

Do not delete original evidence when corrected data is entered.

---

## 10. Security

Implement:
- Password hashing
- JWT/session security
- Role-based authorization
- Input validation
- File-type validation
- File-size limits
- Secure image/document storage
- Rate limiting where appropriate
- Audit logs
- Secure environment variables
- No secrets committed to Git

Uploaded files must not be trusted merely because they have an image extension.

---

## 11. Frontend UX

The main inspection screen should be simple:

```text
Upload Product Images
        ↓
Analyze
        ↓
Extracted Declarations
        ↓
Rule Checks
        ↓
Findings
        ↓
Inspector Review
        ↓
Finalize
        ↓
Generate Report
```

Use clear visual states:
- PASS
- FAIL
- REVIEW
- NOT APPLICABLE

Always show the reason behind a finding.

Allow the inspector to:
- Zoom/crop evidence
- View OCR regions
- Correct extracted values
- Add notes
- Mark a finding as reviewed
- Attach additional evidence

---

## 12. Development Priorities

### Phase 1 — MVP
1. Authentication/RBAC
2. Product image upload
3. OCR
4. Basic declaration extraction
5. Rule engine with a small validated rule set
6. Compliance result
7. Inspection storage
8. Basic report generation

### Phase 2 — AI/CV
1. Better label detection
2. Bounding boxes
3. Image quality analysis
4. Semantic declaration extraction
5. Font/readability analysis
6. Placement checks

### Phase 3 — Enforcement Platform
1. Dashboard
2. Search/history
3. Evidence management
4. Supervisor review
5. Rule version management
6. Advanced reporting
7. Analytics

---

## 13. Testing Requirements

Test each layer independently.

### OCR tests
- Clear image
- Blurry image
- Rotated image
- Low-light image
- Multiple languages where supported
- Different fonts

### Rule tests
For every rule, create:
- Valid example
- Invalid example
- Missing-data example
- Not-applicable example
- Boundary case

### API tests
Test:
- Authentication
- Authorization
- Validation
- File uploads
- Inspection lifecycle
- Report generation

### End-to-end test

```text
Upload image
→ OCR
→ Extract fields
→ Apply rules
→ Generate findings
→ Review
→ Save inspection
→ Generate report
```

---

## 14. Coding Standards

- Use meaningful names.
- Keep controllers thin.
- Put business logic in services.
- Keep legal rules isolated from UI/API code.
- Avoid duplicated validation logic.
- Use environment variables for configuration.
- Add error handling around OCR/AI services.
- Return consistent API responses.
- Add tests for important business logic.
- Document non-obvious legal/computer-vision assumptions.
- Prefer small, maintainable modules over a monolithic implementation.

---

## 15. Example Compliance Response

```json
{
  "inspectionId": "LM-2026-000123",
  "status": "NON_COMPLIANT",
  "findings": [
    {
      "ruleId": "RULE-XXX",
      "field": "consumerCare",
      "status": "NON_COMPLIANT",
      "severity": "HIGH",
      "observedValue": null,
      "explanation": "Required consumer-care declaration was not detected.",
      "requiresHumanReview": true
    },
    {
      "ruleId": "RULE-YYY",
      "field": "mrp",
      "status": "COMPLIANT",
      "observedValue": "₹120",
      "requiresHumanReview": false
    }
  ]
}
```

---

## 16. Important Product Principle

This is an **AI-assisted enforcement tool**, not an autonomous legal authority.

The system should:
- Explain every result.
- Preserve evidence.
- Show uncertainty.
- Allow human review.
- Use versioned legal rules.
- Avoid fabricated information.
- Make it easy for an authorized officer to verify the finding.

The goal is to **reduce inspection effort while improving consistency, traceability, and coverage**.

---

## 17. Definition of Done for an Inspection

An inspection is complete only when:

- Product images are stored.
- OCR has been executed.
- Extracted declarations are available.
- Applicable rules have been evaluated.
- Every finding has an explanation.
- Evidence is linked to findings where applicable.
- Inspector has reviewed editable/uncertain fields.
- Final status is recorded.
- Audit information is stored.
- Report can be generated successfully.

---

## 18. SIH Demonstration Scenario

For the final demo, demonstrate one complete product:

1. Upload package images.
2. Show OCR extraction.
3. Show structured declarations.
4. Show automatic rule checks.
5. Highlight a missing/incorrect declaration.
6. Show evidence image and detected region.
7. Let the inspector review the finding.
8. Generate the compliance report.
9. Open the inspection in the repository.
10. Show the dashboard updating with the inspection.

The demo should clearly communicate:

**"We don't just read the label—we understand the declarations, apply applicable rules, explain potential violations, preserve evidence, and generate an inspection-ready report."**
