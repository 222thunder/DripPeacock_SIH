import { Request, Response } from 'express';
import { Inspection } from '../models/Inspection';
import { analyzeImage } from '../services/aiService';
import { evaluateRules } from '../rules/ruleEngine';

export const createInspection = async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No images uploaded' });
      return;
    }

    let extractedDeclarations: Record<string, any> = {};
    let combinedOcr = "";
    let llmAssisted = false;

    // Process all images
    for (const image of files) {
      const aiResults = await analyzeImage(image.buffer, image.originalname, image.mimetype);
      
      // Merge declarations (keep first found or combine)
      if (aiResults.declarations) {
        for (const [key, value] of Object.entries(aiResults.declarations)) {
          if (!extractedDeclarations[key]) {
            extractedDeclarations[key] = value;
          }
        }
      }
      
      if (aiResults.raw_ocr) {
        combinedOcr += aiResults.raw_ocr + "\n\n";
      }

      if (aiResults.llm_assisted) {
        llmAssisted = true;
      }
    }

    const MANDATORY_FIELDS = [
      "mrp", "mrp_inclusive_of_taxes", "net_quantity", "mfg_date", 
      "pkd_date", "consumer_care_email", "consumer_care_phone", 
      "manufacturer", "packer", "commodity_name", "country_of_origin"
    ];
    
    const missingFields = MANDATORY_FIELDS.filter(f => !extractedDeclarations[f]);

    // Evaluate the Legal Metrology Rules
    const findings = evaluateRules(extractedDeclarations);
    
    const inspection = new Inspection({
      inspectionId: `INSP-${Date.now()}`,
      productId: productId || null,
      status: missingFields.length > 0 ? 'REVIEW_REQUIRED' : 'COMPLIANT',
      images: files.map(f => f.originalname),
      extractedDeclarations,
      findings
    });
    
    try {
      await inspection.save();
    } catch (dbError) {
      console.warn('Could not save to MongoDB (likely disconnected). Returning mock data.');
    }
    
    // Return both the inspection DB object and the aggregated raw AI results for the UI
    res.status(201).json({
      ...inspection.toObject(),
      declarations: extractedDeclarations,
      missing_fields: missingFields,
      raw_ocr: combinedOcr.trim(),
      llm_assisted: llmAssisted,
      findings
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInspections = async (req: Request, res: Response) => {
  try {
    const inspections = await Inspection.find().sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInspectionById = async (req: Request, res: Response) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      res.status(404).json({ error: 'Inspection not found' });
      return;
    }
    res.json(inspection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
