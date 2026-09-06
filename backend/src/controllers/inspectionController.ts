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

    // Process all images
    for (const image of files) {
      // 1. Upload to Cloudinary
      let imageUrl = image.originalname;
      try {
        imageUrl = await uploadToCloudinary(image.buffer, `inspections/${Date.now()}`);
      } catch (err) {
        console.error('Failed to upload image to Cloudinary', err);
      }
      uploadedImageUrls.push(imageUrl);

      // 2. Analyze
      const aiResults = await analyzeImage(image.buffer, image.originalname, image.mimetype, category);

      // Merge declarations (keep first found), remembering which image each came from
      if (aiResults.declarations) {
        for (const [key, value] of Object.entries(aiResults.declarations)) {
          if (!extractedDeclarations[key]) {
            extractedDeclarations[key] = value as DeclaredField;
            evidenceImageByField[key] = imageUrl;
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

    const inspection = new Inspection({
      inspectionId: `INSP-${Date.now()}`,
      productId: productId || null,
      inspectorId: (req as any).user?.id || null,
      status: summary.overall,
      category: category || null,
      images: uploadedImageUrls,
      extractedDeclarations,
      findings,
    });

    try {
      await inspection.save();
    } catch (dbError) {
      console.error('MongoDB save error:', dbError);
      console.warn('Could not save to MongoDB. Returning data without persisting.');
    }

    // Return both the inspection DB object and the aggregated raw AI results for the UI
    res.status(201).json({
      ...inspection.toObject(),
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

export const getInspections = async (req: Request, res: Response) => {
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
      ...inspection.toObject(),
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
    ...inspection.toObject(),
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
      ...inspection.toObject(),
      declarations: updatedDeclarations,
      missing_fields,
      findings,
      summary
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update declarations', details: error.message });
  }
};
