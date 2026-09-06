import mongoose, { Document, Schema } from 'mongoose';

export interface IRule extends Document {
  ruleId: string;
  version: string;
  title: string;
  description: string;
  category: string;
  applicability: any;
  validationType: string;
  parameters: any;
  sourceReference: string;
  active: boolean;
}

const RuleSchema: Schema = new Schema(
  {
    ruleId: { type: String, required: true, unique: true },
    version: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    applicability: { type: Schema.Types.Mixed },
    validationType: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed },
    sourceReference: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Rule = mongoose.models.Rule || mongoose.model<IRule>('Rule', RuleSchema);
