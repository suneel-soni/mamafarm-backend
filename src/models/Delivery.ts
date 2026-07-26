import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryItem {
  sproutType: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface IDelivery extends Document {
  deliveryNumber: string;
  shop: mongoose.Types.ObjectId;
  shopName: string;
  deliveryDate: Date;
  items: IDeliveryItem[];
  subTotal: number;
  discount: number;
  netAmount: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  deliveryPerson: string;
  invoiceUrl: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>(
  {
    deliveryNumber: { type: String, required: true, unique: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    shopName: { type: String, default: '' },
    deliveryDate: { type: Date, default: Date.now },
    items: [
      {
        sproutType: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: 'packets' },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' },
    deliveryPerson: { type: String, default: 'Self' },
    invoiceUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', deliverySchema);
