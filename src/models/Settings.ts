import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  currency: string;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    businessName: { type: String, default: 'MamaFarm Sprouts' },
    phone: { type: String, default: '+91 81301 88878' },
    email: { type: String, default: 'contact@mamafarm.com' },
    address: { type: String, default: 'Plot 42, Organic Agro Hub, India' },
    gstNumber: { type: String, default: '07AAAAA0000A1Z5' },
    currency: { type: String, default: '₹' },
    lowStockThreshold: { type: Number, default: 20 },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
