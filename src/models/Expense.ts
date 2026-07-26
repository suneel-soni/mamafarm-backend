import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  category: 'rent' | 'electricity' | 'labour' | 'transport' | 'packaging' | 'misc';
  amount: number;
  expenseDate: Date;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  receiptUrl: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['rent', 'electricity', 'labour', 'transport', 'packaging', 'misc'],
      default: 'misc',
    },
    amount: { type: Number, required: true },
    expenseDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer'], default: 'cash' },
    receiptUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', expenseSchema);
