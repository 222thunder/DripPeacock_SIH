import mongoose, { Document, Schema } from 'mongoose';

export enum InspectionStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  PENDING = 'PENDING',
}

export type FindingStatus =
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'UNABLE_TO_VERIFY'
  | 'CONFIRMED_NON_COMPLIANT'
  | 'NOT_APPLICABLE';

export interface IInspectionFinding {
  ruleId: string;
  ruleVersion: string;
  field: string;
  observedValue: string | null;
  expectedCondition: string;
  status: FindingStatus;
  severity: string;
  explanation: string;
  sourceReference: string;
  evidenceImageId?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence?: number | null;
  requiresHumanReview: boolean;
}

export type ReviewDecision = 'VERIFIED' | 'REJECTED';

export type HumanReviewStatus = ReviewDecision | 'PENDING';

export interface IInspectionReviewEntry {
  reviewStatus: HumanReviewStatus;
  reviewedBy?: mongoose.Types.ObjectId | string;
  reviewedByName?: string;
  reviewedAt: Date;
  reviewComment?: string;
  previousStatus: string;
  previousFinding?: IInspectionFinding | null;
  resultingStatus?: string;
}

export interface IInspection extends Document {
  inspectionId: string;
  productId: mongoose.Types.ObjectId;
  inspectorId: mongoose.Types.ObjectId;
  status: InspectionStatus;
  category?: string;
  images: string[];
  extractedDeclarations: Record<string, any>;
  notes?: string;
  reviewStatus?: string;
  findings: IInspectionFinding[];
  reviewedFindings: Map<string, IInspectionReviewEntry>;
  createdAt: Date;
  updatedAt: Date;
}

const FindingSchema = new Schema<IInspectionFinding>({
  ruleId: { type: String, required: true },
  ruleVersion: { type: String, required: true },
  field: { type: String, required: true },
  observedValue: { type: String }, // Made optional (can be null/missing)
  expectedCondition: { type: String, required: true },
  status: { type: String, required: true },
  severity: { type: String, required: true },
  explanation: { type: String, required: true },
  sourceReference: { type: String },
  evidenceImageId: { type: String },
  boundingBox: {
    x: { type: Number },
    y: { type: Number },
    width: { type: Number },
    height: { type: Number },
  },
  confidence: { type: Number } as any, // Made optional (null when unknown)
  requiresHumanReview: { type: Boolean, default: false },
});

const ReviewEntrySchema = new Schema<IInspectionReviewEntry>(
  {
    reviewStatus: { type: String, enum: ['VERIFIED', 'REJECTED', 'PENDING'], required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String },
    reviewedAt: { type: Date, default: Date.now },
    reviewComment: { type: String },
    previousStatus: { type: String, required: true },
    previousFinding: { type: FindingSchema },
    resultingStatus: { type: String },
  },
  { _id: false }
);

const InspectionSchema: Schema = new Schema(
  {
    inspectionId: { type: String, required: true, unique: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' }, // Made optional
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User' }, // Made optional
    status: {
      type: String,
      enum: Object.values(InspectionStatus),
      default: InspectionStatus.PENDING,
      required: true,
    },
    category: { type: String },
    images: [{ type: String }],
    extractedDeclarations: { type: Schema.Types.Mixed },
    notes: { type: String },
    reviewStatus: { type: String },
    findings: [FindingSchema],
    reviewedFindings: { type: Map, of: ReviewEntrySchema, default: {} },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedName: { type: String },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

InspectionSchema.index({ createdAt: -1 });
InspectionSchema.index({ status: 1 });
InspectionSchema.index({ inspectorId: 1 });
InspectionSchema.index({ productId: 1 });
InspectionSchema.index({ category: 1 });

export const Inspection = mongoose.models.Inspection || mongoose.model<IInspection>('Inspection', InspectionSchema);