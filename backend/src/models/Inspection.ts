import mongoose, { Document, Schema } from 'mongoose';

export enum InspectionStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  PENDING = 'PENDING',
}

export interface IInspectionFinding {
  ruleId: string;
  ruleVersion: string;
  field: string;
  observedValue: string;
  expectedCondition: string;
  status: string;
  severity: string;
  explanation: string;
  evidenceImageId?: string;
  confidence: number;
  requiresHumanReview: boolean;
}

export interface IInspection extends Document {
  inspectionId: string;
  productId: mongoose.Types.ObjectId;
  inspectorId: mongoose.Types.ObjectId;
  status: InspectionStatus;
  images: string[];
  extractedDeclarations: Record<string, any>;
  notes?: string;
  reviewStatus?: string;
  findings: IInspectionFinding[];
  createdAt: Date;
  updatedAt: Date;
}

const FindingSchema = new Schema<IInspectionFinding>({
  ruleId: { type: String, required: true },
  ruleVersion: { type: String, required: true },
  field: { type: String, required: true },
  observedValue: { type: String, required: true },
  expectedCondition: { type: String, required: true },
  status: { type: String, required: true },
  severity: { type: String, required: true },
  explanation: { type: String, required: true },
  evidenceImageId: { type: String },
  confidence: { type: Number, required: true },
  requiresHumanReview: { type: Boolean, default: false },
});

const InspectionSchema: Schema = new Schema(
  {
    inspectionId: { type: String, required: true, unique: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(InspectionStatus),
      default: InspectionStatus.PENDING,
      required: true,
    },
    images: [{ type: String }],
    extractedDeclarations: { type: Schema.Types.Mixed },
    notes: { type: String },
    reviewStatus: { type: String },
    findings: [FindingSchema],
  },
  { timestamps: true }
);

export const Inspection = mongoose.models.Inspection || mongoose.model<IInspection>('Inspection', InspectionSchema);
