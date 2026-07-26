import mongoose, { Schema, Document } from 'mongoose';

export interface IInventory extends Document {
  itemName: string;
  type: 'raw_material' | 'finished_sprout' | 'packaging';
  quantity: number;
  unit: string;
  minThreshold: number;
  valuationPerUnit: number;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    itemName: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ['raw_material', 'finished_sprout', 'packaging'], required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true, default: 'kg' },
    minThreshold: { type: Number, default: 10 },
    valuationPerUnit: { type: Number, default: 0 },
    location: { type: String, default: 'Main Store' },
  },
  { timestamps: true }
);

export default mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', inventorySchema);
