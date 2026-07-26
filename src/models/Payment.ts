import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentNumber: string;
  entityType: 'shop' | 'supplier';
  shop?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  partyName: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  transactionRef: string;
  paymentDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true },
    entityType: { type: String, enum: ['shop', 'supplier'], required: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    partyName: { type: String, default: '' },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque'], default: 'cash' },
    transactionRef: { type: String, default: '' },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
