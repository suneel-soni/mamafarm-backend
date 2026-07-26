import mongoose, { Schema, Document } from 'mongoose';

export interface IProduction extends Document {
  batchNumber: string;
  rawMaterialName: string;
  rawMaterialQty: number;
  unit: string;
  sproutType: string;
  sproutsProducedQty: number;
  sproutsUnit: string;
  wasteQty: number;
  lossPercent: number;
  soakingStartDate: Date;
  completionDate: Date;
  status: 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const productionSchema = new Schema<IProduction>(
  {
    batchNumber: { type: String, required: true, unique: true },
    rawMaterialName: { type: String, required: true },
    rawMaterialQty: { type: Number, required: true },
    unit: { type: String, default: 'kg' },
    sproutType: { type: String, required: true },
    sproutsProducedQty: { type: Number, required: true },
    sproutsUnit: { type: String, default: 'packets' },
    wasteQty: { type: Number, default: 0 },
    lossPercent: { type: Number, default: 0 },
    soakingStartDate: { type: Date, default: Date.now },
    completionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['in_progress', 'completed', 'cancelled'], default: 'completed' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Production || mongoose.model<IProduction>('Production', productionSchema);
