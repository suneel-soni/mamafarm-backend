import mongoose, { Schema, Document } from 'mongoose';

export interface IReturnItem {
  sproutType: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface IReturnOrder extends Document {
  returnNumber: string;
  shop: mongoose.Types.ObjectId;
  shopName: string;
  deliveryId?: mongoose.Types.ObjectId;
  returnDate: Date;
  items: IReturnItem[];
  totalRefundAmount: number;
  reason: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const returnOrderSchema = new Schema<IReturnOrder>(
  {
    returnNumber: { type: String, required: true, unique: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    shopName: { type: String, default: '' },
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    returnDate: { type: Date, default: Date.now },
    items: [
      {
        sproutType: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: 'packets' },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    totalRefundAmount: { type: Number, required: true },
    reason: { type: String, default: 'Unsold / Expired Return' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.ReturnOrder || mongoose.model<IReturnOrder>('ReturnOrder', returnOrderSchema);
