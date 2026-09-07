import { Request, Response } from 'express';
import { Inspection, IInspectionReviewEntry, ReviewDecision } from '../models/Inspection';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { analyzeImage } from '../services/aiService';
import {
  evaluateRules,
  MANDATORY_FIELDS,
  summarizeFindings,
  DeclaredField,
  FindingResult,
  ComplianceSummary,
} from '../rules/ruleEngine';
import { applyHumanReview, ReviewerIdentity } from '../services/reviewService';
import { buildReportDocx, buildReportPdf, ReportInspectionData } from '../services/reportService';
import { uploadToCloudinary } from '../config/cloudinary';

export const createInspection = async (req: Request, res: Response) => {
  try {
    const { productId, category } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images uploaded' });
      return;
    }

    let extractedDeclarations: Record<string, DeclaredField> = {};
    const evidenceImageByField: Record<string, string> = {};
    let combinedOcr = '';
    let llmAssisted = false;
    const uploadedImageUrls: string[] = [];

    // Process all images in parallel for speed
    const imageResults = [];
  for (let idx = 0; idx < files.length; idx++) {
    const image = files[idx];
    const imageUrl = await uploadToCloudinary(image.buffer, image.mimetype);
    const aiResults = await analyzeImage(image.buffer, image.originalname, image.mimetype, category);
    imageResults.push({ imageUrl, aiResults, idx });
  }

    // Sort by original index to keep OCR text in upload order
    imageResults.sort((a, b) => a.idx - b.idx);

    for (const { imageUrl, aiResults } of imageResults) {
      uploadedImageUrls.push(imageUrl);

      // Confidence-aware merge: keep the extraction with the higher confidence,
      // or the non-null value if only one image found the field.
      if (aiResults.declarations) {
        for (const [key, value] of Object.entries(aiResults.declarations)) {
          const incoming = value as DeclaredField;
          const existing = extractedDeclarations[key];

          if (!existing) {
            // Field not yet seen — accept it
            extractedDeclarations[key] = incoming;
            evidenceImageByField[key] = imageUrl;
          } else {
            // Field already found — prefer the one with higher confidence,
            // or prefer a non-null value over a null one.
            const existingConf = typeof existing.confidence === 'number' ? existing.confidence : 0;
            const incomingConf = typeof incoming.confidence === 'number' ? incoming.confidence : 0;
            const existingHasValue = existing.value != null && existing.value !== '';
            const incomingHasValue = incoming.value != null && incoming.value !== '';

            const shouldReplace =
              (!existingHasValue && incomingHasValue) ||
              (incomingHasValue && incomingConf > existingConf);

            if (shouldReplace) {
              extractedDeclarations[key] = incoming;
              evidenceImageByField[key] = imageUrl;
            }
          }
        }
      }

      if (aiResults.raw_ocr) {
        combinedOcr += aiResults.raw_ocr + '\n\n';
      }

      if (aiResults.llm_assisted) {
        llmAssisted = true;
      }
    }

    // Attach the source image id to each declaration for evidence traceability
    for (const [key, field] of Object.entries(extractedDeclarations)) {
      if (field && typeof field === 'object' && evidenceImageByField[key]) {
        extractedDeclarations[key] = { ...field, evidenceImageId: evidenceImageByField[key] };
      }
    }

    const missingFields = MANDATORY_FIELDS.filter((f) => !extractedDeclarations[f]);

    // Evaluate the Legal Metrology Rules (deterministic; never AI-decided)
    const findings = evaluateRules(extractedDeclarations, { category });
    const summary = summarizeFindings(findings);

    // Register a product from the extracted label so inspections are linkable,
    // unless the inspector already selected an existing product.
    const flatValue = (v: unknown): string => {
      if (v == null) return '';
      if (typeof v === 'string') return v.trim();
      if (typeof v === 'object') return String((v as Record<string, unknown>).name || '').trim();
      return String(v).trim();
    };
    let linkedProductId = productId || null;
    if (!linkedProductId) {
      const commodity = flatValue(extractedDeclarations.commodity_name?.value);
      const manufacturer = flatValue(extractedDeclarations.manufacturer?.value) || flatValue(extractedDeclarations.packer?.value);
      try {
        const product = await Product.create({
          name: commodity || 'Unlabelled Commodity',
          brand: '',
          category: category || 'general',
          manufacturer: manufacturer || 'Not declared',
        });
        linkedProductId = product._id;
      } catch (dbError) {
        console.error('Could not auto-register product from label:', dbError);
      }
    }

    const inspection = new Inspection({
      inspectionId: `INSP-${Date.now()}`,
      productId: linkedProductId,
      inspectorId: (req as any).user?.id || null,
      status: summary.overall,
      category: category || null,
      images: uploadedImageUrls,
      extractedDeclarations,
      findings,
    });

    await inspection.save();

    // Return both the inspection DB object and the aggregated raw AI results for the UI
    res.status(201).json({
      ...inspection.toObject({ flattenMaps: true }),
      declarations: extractedDeclarations,
      missing_fields: missingFields,
      raw_ocr: combinedOcr.trim(),
      llm_assisted: llmAssisted,
      findings,
      summary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInspections = async (_req: Request, res: Response) => {
  try {
    const inspections = await Inspection.find()
      .populate('inspectorId', 'name email role')
      .populate('productId', 'name brand category')
      .sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInspectionById = async (req: Request, res: Response) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('inspectorId', 'name email role')
      .populate('productId', 'name brand category');
      
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    const missingFields = MANDATORY_FIELDS.filter((f) => !inspection.extractedDeclarations?.[f]);

    res.json({
      ...inspection.toObject({ flattenMaps: true }),
      missing_fields: missingFields,
      summary: summarizeFindings(inspection.findings || []),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getReviewerIdentity = async (req: Request): Promise<ReviewerIdentity> => {
  const userId = (req as any).user?.id;
  if (!userId) return {};
  const user = await User.findById(userId).select('name email');
  if (!user) return { id: userId };
  const name = (user as any).name || (user as any).email;
  return { id: userId, name };
};

const asMapObject = <T>(value: unknown): Record<string, T> => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  return value as Record<string, T>;
};

const reviewResponseBody = (inspection: any, findings: FindingResult[], summary: ComplianceSummary, extra?: Record<string, unknown>) => {
  const missingFields = MANDATORY_FIELDS.filter((f) => !inspection.extractedDeclarations?.[f]);
  return {
    ...inspection.toObject({ flattenMaps: true }),
    declarations: inspection.extractedDeclarations,
    missing_fields: missingFields,
    findings,
    summary,
    ...extra,
  };
};

export const reviewFinding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const findingId = req.params.findingId as string;
    const { decision, comment } = (req.body || {}) as { decision?: unknown; comment?: unknown };

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }
    // Prevent duplicate reviews for this finding
    if (inspection.reviewedFindings && inspection.reviewedFindings.get(findingId)) {
      res.status(400).json({ error: `Finding "${findingId}" has already been reviewed.` });
      return;
    }

    const reviewer = await getReviewerIdentity(req);

    let result;
    try {
      result = applyHumanReview({
        findings: (inspection.findings as any) || [],
        extractedDeclarations: inspection.extractedDeclarations || {},
        reviewedFindings: asMapObject<IInspectionReviewEntry>(inspection.reviewedFindings),
        category: inspection.category,
        findingId,
        decision: decision as ReviewDecision,
        comment: typeof comment === 'string' ? comment : undefined,
        user: reviewer,
      });
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ error: err?.message || 'Review could not be saved' });
      return;
    }

    inspection.reviewedFindings.set(findingId, result.reviewRecord);
    inspection.findings = result.findings as any;
    inspection.status = result.overall as any;
    await inspection.save();

    res.json(reviewResponseBody(inspection, result.findings, result.summary));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInspectionReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewedFindings, notes } = req.body as {
      reviewedFindings?: Record<string, { decision?: unknown; reviewStatus?: unknown; comment?: unknown; note?: unknown }>;
      notes?: string;
    };

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    const reviewer = await getReviewerIdentity(req);
    const alreadyReviewed = asMapObject<IInspectionReviewEntry>(inspection.reviewedFindings);
    const pending: Record<string, IInspectionReviewEntry> = {};

    for (const [key, entry] of Object.entries(reviewedFindings || {})) {
      const decision = (entry?.decision ?? entry?.reviewStatus) as ReviewDecision;
      const comment = (typeof entry?.comment === 'string' ? entry.comment : typeof entry?.note === 'string' ? entry.note : undefined);
      try {
        const result = applyHumanReview({
          findings: (inspection.findings as any) || [],
          extractedDeclarations: inspection.extractedDeclarations || {},
          reviewedFindings: { ...alreadyReviewed, ...pending },
          category: inspection.category,
          findingId: key,
          decision,
          comment,
          user: reviewer,
        });
        pending[key] = result.reviewRecord;
        inspection.findings = result.findings as any;
        inspection.status = result.overall as any;
      } catch (err: any) {
        res.status(err?.statusCode || 400).json({ error: err?.message || 'Review could not be saved' });
        return;
      }
    }

    for (const [key, record] of Object.entries(pending)) {
      inspection.reviewedFindings.set(key, record);
    }
    if (notes !== undefined) inspection.notes = notes;

    await inspection.save();
    const summary = summarizeFindings(inspection.findings || []);
    res.json(reviewResponseBody(inspection, inspection.findings as any, summary));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
export const updateDeclarations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { extractedDeclarations, category } = req.body as {
      extractedDeclarations: Record<string, DeclaredField>;
      category?: string;
    };

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    // Merge new declarations intelligently to preserve metadata
    const updatedDeclarations = { ...inspection.extractedDeclarations };
    
    for (const [key, fieldUpdate] of Object.entries(extractedDeclarations)) {
      const existing = updatedDeclarations[key] || { value: null, source: 'UNKNOWN' };
      updatedDeclarations[key] = {
        ...existing,
        originalValue: existing.originalValue !== undefined ? existing.originalValue : existing.value,
        value: fieldUpdate.value,
        reviewedValue: fieldUpdate.value,
        manuallyVerified: true,
        editedBy: (req as any).user?.id || 'UNKNOWN',
        editedAt: new Date().toISOString(),
      };
    }
    
    // Re-evaluate rules
    const findings = evaluateRules(updatedDeclarations, { category: category || inspection.category });
    const summary = summarizeFindings(findings);

    inspection.extractedDeclarations = updatedDeclarations;
    inspection.findings = findings as any;
    inspection.status = summary.overall as any;
    
    await inspection.save();
    
    const missing_fields = MANDATORY_FIELDS.filter((f) => !updatedDeclarations[f]);

    res.json({
      ...inspection.toObject({ flattenMaps: true }),
      declarations: updatedDeclarations,
      missing_fields,
      findings,
      summary
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update declarations', details: error.message });
  }
};

export const exportInspectionReport = async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'docx' || req.query.format === 'doc' ? 'doc' : 'pdf';
    const dbInspection = await Inspection.findById(req.params.id)
      .populate('inspectorId', 'name email role')
      .populate('productId', 'name brand category');

    if (!dbInspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    const inspection: any = dbInspection.toObject({ flattenMaps: true });
    const findings: FindingResult[] = inspection.findings || [];
    const summary = summarizeFindings(findings);
    const inspector = inspection.inspectorId;
    const product = inspection.productId;
    const missingFields = MANDATORY_FIELDS.filter((f) => !inspection.extractedDeclarations?.[f]);

    const data: ReportInspectionData = {
      inspectionId: inspection.inspectionId || req.params.id,
      createdAt: inspection.createdAt,
      category: inspection.category ?? null,
      productName: product && typeof product === 'object' ? product.name || null : null,
      status: inspection.status,
      reviewStatus: inspection.reviewStatus,
      inspectorName: inspector && typeof inspector === 'object' ? inspector.name || inspector.email || null : null,
      notes: inspection.notes,
      images: inspection.images,
      declarations: inspection.extractedDeclarations || {},
      findings,
      summary,
      missingFields,
    };

    const fileName = `${data.inspectionId}-compliance-report`;

    if (format === 'doc') {
      const docx = await buildReportDocx(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.docx"`);
      res.send(docx);
      return;
    }

    const pdf = await buildReportPdf(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
    res.send(pdf);
  } catch (error: any) {
    res.status(500).json({ error: 'Report generation failed', details: error.message });
  }
};

export const finalizeInspection = async (req: Request, res: Response) => {
  try {
    const inspection: any = await Inspection.findById(req.params.id);
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }

    const reviewer = await getReviewerIdentity(req);
    inspection.reviewStatus = 'APPROVED';
    inspection.finalizedBy = reviewer.id || null;
    inspection.finalizedName = reviewer.name || null;
    inspection.finalizedAt = new Date();
    await inspection.save();

    const findings = (inspection.findings as FindingResult[]) || [];
    res.json({
      ...reviewResponseBody(inspection, findings, summarizeFindings(findings)),
      finalizedByName: inspection.finalizedName,
      finalizedAt: inspection.finalizedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
