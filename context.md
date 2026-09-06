# Context Summary – Important Decisions Made for SIH Project

## 1. Field‑type‑aware Editing

- Added **`src/components/findings/FieldEditor.tsx`** – a reusable editor that knows how to handle complex nested declarations (MRP, Net Quantity, Manufacturer, Consumer Care, etc.).
- Replaced the generic `<input>` in **`ExtractedDeclarations.tsx`** with `FieldEditor` for both existing and missing fields.
- Editing state now stores the **raw value** (`any`) instead of a formatted string, preventing `[object Object]` rendering and preserving the original data shape.

## 2. API Payload Simplification

- Updated **`ScannerView.tsx`** and **`inspections/[id]/page.tsx`** `handleSaveField` functions to send only the new `value` (no `source`, `confidence`, or `is_deterministic`).
- Backend now decides how to enrich the stored field with metadata.

## 3. Backend Merge Logic & Audit Trail

- Modified **`backend/src/controllers/inspectionController.ts`** `updateDeclarations`:
  - Merges new declarations **intelligently** – retains original extraction, adds `originalValue`, `reviewedValue`, `manuallyVerified: true`, `editedBy`, `editedAt`.
  - Triggers rule‑engine re‑evaluation after the merge.
- Extended **`DeclaredField`** (and the frontend `DeclarationValue`) schema in **`backend/src/rules/types.ts`** and **`frontend/src/lib/api.ts`** with:
  - `originalValue`, `reviewedValue`, `manuallyVerified`, `editedBy`, `editedAt`.
- Ensures the original AI/OCR result is never overwritten.

## 4. UI Badge Enhancements

- Added a **“Manual Reviewed”** badge (amber) that appears when `data.manuallyVerified` is true.
- Badges are now rendered **outside** of the editable value, keeping tags separate from the input.
- Adjusted tags container (removed `shrink-0`) to allow wrapping without overflow.

## 5. Layout Adjustments – Larger Cards

- Updated the grid in **`ExtractedDeclarations.tsx`** from a 2‑column (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-2`) to a **single‑column** layout (`grid-cols-1`).
- This gives each card full‑width, preventing badge/field overflow and providing more space for the new `FieldEditor` UI.

## 6. Apple Design Motion Tuning

- Enforced Apple‑style spring parameters (`type: 'spring'`, `bounce: 0`, `duration: 0.4`) across staggered animations in **`ScannerView.tsx`** (and other motion variants) per the `/apple-design` audit.

## 7. Build Verification

- Ran **`npm run build`** for both frontend and backend after each change to confirm TypeScript integrity and successful compilation.

## 8. Future Work (Human Verification Workflow)

- The groundwork is now in place for a full _Human Verification_ feature:
  - Field editors preserve raw values and metadata.
  - Backend merge logic records who edited what and when.
  - UI already shows manual‑review badge and can be extended with a modal for rule‑finding verification.

_All modifications respect the existing RBAC system; only authenticated users with the appropriate role can edit fields or submit reviews._
