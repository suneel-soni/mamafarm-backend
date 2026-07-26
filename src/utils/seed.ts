import User from '../models/User';
import Supplier from '../models/Supplier';
import Material from '../models/Material';
import Shop from '../models/Shop';
import ActivityLog from '../models/ActivityLog';
import Settings from '../models/Settings';
import bcrypt from 'bcryptjs';

export const seedData = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Suraj@7264', salt);

    // 1. Ensure Owner User with phone 8130188878 exists
    await User.findOneAndUpdate(
      { phone: '8130188878' },
      {
        name: 'MamaFarm Owner',
        email: 'contact@mamafarm.com',
        password: hashedPassword,
        role: 'admin',
        phone: '8130188878',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // 2. Clean up any legacy dummy seed shops if present
    await Shop.deleteMany({
      shopName: { $in: ['Fresh Veggies Mart', 'Green Grocery Hub', 'Organic Life Supermarket'] },
    });

    const supplierCount = await Supplier.countDocuments();
    const materialCount = await Material.countDocuments();

    if (supplierCount > 0 || materialCount > 0) {
      console.log('Database already contains user data (Suppliers/Materials). Skipping static seed.');
      return;
    }

    console.log('Seeding initial MamaFarm data...');

    // 2. Settings
    await Settings.create({
      businessName: 'MamaFarm',
      phone: '+91 81301 88878',
      email: 'contact@mamafarm.com',
      address: 'Bengaluru, Karnataka',
      gstNumber: '07AAACM1234F1Z9',
    });

    // 3. Suppliers
    const supplier1 = await Supplier.create({
      name: 'Agro Pulse Traders',
      contactPerson: 'Ramesh Kumar',
      phone: '+91 9811223344',
      email: 'ramesh@agropulses.com',
      address: 'Deverabisanahalli',
      gstNumber: '07AGROP1234A1Z1',
      totalPurchased: 0,
      pendingPayment: 0,
    });

    const supplier2 = await Supplier.create({
      name: 'EcoPack Containers Ltd',
      contactPerson: 'Anil Gupta',
      phone: '+91 9899887766',
      email: 'sales@ecopack.com',
      address: 'Deverabisanahalli',
      gstNumber: '09ECOPK5678B2Z4',
      totalPurchased: 0,
      pendingPayment: 0,
    });

    // 4. Raw Materials
    await Material.create({
      name: 'Raw Green Moong Grain',
      category: 'Raw Bean',
      supplier: supplier1._id,
      quantity: 1,
      unit: 'kg',
      purchasePrice: 110,
      gstPercent: 5,
      minStockAlert: 1,
      paymentStatus: 'partial',
    });

    await Material.create({
      name: 'Desi Brown Chana Grain',
      category: 'Raw Bean',
      supplier: supplier1._id,
      quantity: 1,
      unit: 'kg',
      purchasePrice: 85,
      gstPercent: 5,
      minStockAlert: 1,
      paymentStatus: 'paid',
    });

    await Material.create({
      name: 'Sprout Pouches',
      category: 'Packaging',
      supplier: supplier2._id,
      quantity: 50,
      unit: 'pcs',
      purchasePrice: 3,
      gstPercent: 12,
      minStockAlert: 10,
      paymentStatus: 'paid',
    });

    // 5. Activity Log
    await ActivityLog.create([
      { action: 'Database Seed', description: 'Initial MamaFarm database populated with owner account 8130188878.' },
    ]);

    console.log('MamaFarm Seed Completed Successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  }
};
