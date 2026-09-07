# Architecture

SIH PS 26034 — Legal Metrology Packaged Commodity Compliance System.

## System Boundary

The platform is an **AI-assisted enforcement tool**. It never decides legal compliance by
itself: AI/OCR is used only to read and classify label evidence, and every legal determination
comes from a versioned, deterministic rule engine. Every result is explainable, evidence-backed,
and subject to officer verification.

## Components

```
Browser (Next.js, :3000)
     │
     ▼
Express API (:5001) ──► MongoDB (inspection/products/users repository)
     │
     ├──► AI Service (FastAPI, :8000) ──► OCR (Tesseract/cloud) + OpenCV bbox + LLM classification
     │              └──► structured declarations {value, confidence, bounding_box, source}
     │
     ├──► Rule Engine (deterministic, in-process) ──► ComplianceSummary + Findings
     │        • versioned rules, per-rule source references
     │        • statuses: DETECTED / NOT_DETECTED / UNABLE_TO_VERIFY / CONFIRMED_NON_COMPLIANT / NOT_APPLICABLE
     │
     ├──► Review service (human verification, re-runs rules after edits)
     ├──► Report service (PDF via pdfkit, editable DOC via HTML)
     └──► Evidence (Cloudinary URLs + OCR/bbox metadata stored on the inspection)
```

## Key Design Rules

1. **Deterministic-first extraction.** MRP, currency, quantity/unit, phone/email, dates and
   presence checks use regex/normalization. AI/LLM is used only where it adds value: text-region
   detection, semantic field mapping, poor-quality OCR, ambiguous classification.
2. **Rules are data, not code scattered around controllers.** A rule update (new version,
   effective dates, category applicability, threshold) requires only the rule layer + tests.
3. **Human verification flow.** An inspector can VERIFY or REJECT a finding with a mandatory
   comment on rejection. The original AI finding is preserved (previousFinding / previousStatus);
   a rejected or verified finding drives a deterministic rule re-run to produce resultingStatus.
   Verification does NOT auto-equal compliance — the rule engine decides.
4. **Honesty on unverifiable evidence.** When scale/calibration is unavailable (e.g., physical
   font size), the system returns `UNABLE_TO_VERIFY` / `REVIEW_REQUIRED`, never a fabricated
   measurement.
5. **Auditability.** Raw OCR, confidence, bounding boxes, evidence image URLs, reviewer
   identities and timestamps are stored. Original evidence is never deleted when data is corrected.

## Data Flow (one inspection)

1. Inspector uploads 1–5 package images (`POST /api/inspections`, multipart).
2. Images uploaded to Cloudinary; each is sent to the AI service.
3. Declarations merged into a single structured map (first-found-wins), tagged with the source
   evidence image id.
4. `evaluateRules(declarations, { category })` returns findings; `summarizeFindings` sets the
   inspection status (COMPLIANT / NON_COMPLIANT / REVIEW_REQUIRED / PENDING).
5. Inspection persisted (or run in-memory if MongoDB is unavailable) and returned to the UI.
6. Inspector reviews/corrects fields; the backend re-evaluates rules and records the audit trail.
7. Findings requiring review are resolved via `POST /inspections/:id/findings/:findingId/review`.
8. Supervisor can finalize (`POST /inspections/:id/finalize`, role-gated).
9. Report exported as PDF or editable DOC (`GET /inspections/:id/report?format=pdf|doc`).

## Roles (RBAC enforced on the backend)

- ADMIN: users, rules, global reports.
- INSPECTOR: scan, review OCR, run inspections, generate reports, verify/reject findings.
- SUPERVISOR: review inspections, approve/finalize reports, analytics.

Client-side role checks (AuthGuard / Navbar) are UX only; every privileged route re-checks the
JWT role on the server.

## Rule Engine Reference

Rules live in `backend/src/rules/ruleEngine.ts` (+ types in `types.ts`). Current set:

| Rule | Basis |
| --- | --- |
| LM-RULE-6-1-A | Manufacturer/packer identity — Rule 6(1)(a) |
| LM-RULE-6-1-B | Name/description of commodity — Rule 6(1)(b) |
| LM-RULE-6-1-C | Net quantity — Rule 6(1)(c) |
| LM-RULE-6-1-D | Month/year of manufacture/packing — Rule 6(1)(d) |
| LM-RULE-6-1-E | MRP inclusive of all taxes — Rule 6(1)(e) |
| LM-RULE-6-1-H | Consumer care details — Rule 6(1)(h) |
| LM-RULE-3-FONT | Font size / readability (legibility in capture; physical size flagged for officer verification) — Rule 3/Schedule 1 |

Every rule carries `version`, `sourceReference`, `effectiveFrom`, `applicableCategories`, and is
unit-tested with valid/invalid/missing/not-applicable/boundary cases.

## Frontend Map

- `/scanner` — upload + analyze + extracted declarations + rule checks.
- `/inspections` — repository with search, status/inspector/date/category/violation filters.
- `/inspections/[id]` — dossier: evidence, declarations (edit), findings ledger, human-review
  panel, supervisor finalize button.
- `/dashboard` — metrics, category breakdown, confirmed violations by rule, pending reviews.
- `/report?id=...` — printable report with PDF / editable DOC export.

## Error Handling & Resilience

- Missing MongoDB → inspection still analyzed and returned (persistence attempted).
- AI-service failure → backend isolates OCR errors; failed field extraction is not fabricated.
- Uploads validated for type/size; uploaded files never trusted by extension alone.