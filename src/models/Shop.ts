import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  shopCode: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  area: string;
  gstNumber: string;
  image: string;
  totalDeliveredQuantity: number;
  totalReturnedQuantity: number;
  totalReplacedQuantity: number;
  outstandingBalance: number;
  totalDeliveredValue: number;
  totalPaidAmount: number;
  lastDeliveryDate?: Date;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const shopSchema = new Schema<IShop>(
  {
    shopCode: { type: String, default: '' },
    shopName: { type: String, required: true, trim: true },
    ownerName: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    area: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    image: {
      type: String,
      default: '/images/shop-placeholder.jpg',
    },
    totalDeliveredQuantity: { type: Number, default: 0 },
    totalReturnedQuantity: { type: Number, default: 0 },
    totalReplacedQuantity: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    totalDeliveredValue: { type: Number, default: 0 },
    totalPaidAmount: { type: Number, default: 0 },
    lastDeliveryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Shop || mongoose.model<IShop>('Shop', shopSchema);
