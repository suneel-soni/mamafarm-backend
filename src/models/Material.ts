import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterial extends Document {
  name: string;
  category: 'Raw Bean' | 'Packaging' | 'Chemicals/Cleaning' | 'Other';
  supplier?: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  purchasePrice: number;
  gstPercent: number;
  minStockAlert: number;
  invoiceNumber: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
  purchaseDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Raw Bean', 'Packaging', 'Chemicals/Cleaning', 'Other'], default: 'Raw Bean' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    quantity: { type: Number, default: 0 },
    unit: { type: String, required: true, default: 'kg' },
    purchasePrice: { type: Number, required: true, default: 0 },
    gstPercent: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 10 },
    invoiceNumber: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['paid', 'pending', 'partial'], default: 'paid' },
    purchaseDate: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Material || mongoose.model<IMaterial>('Material', materialSchema);
