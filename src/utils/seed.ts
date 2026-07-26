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
        email: '8130188878@mamafarm.com',
        password: hashedPassword,
        role: 'admin',
        phone: '8130188878',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const shopCount = await Shop.countDocuments();
    const supplierCount = await Supplier.countDocuments();
    const materialCount = await Material.countDocuments();

    if (shopCount > 0 || supplierCount > 0 || materialCount > 0) {
      console.log('Database already contains user data (Shops/Suppliers/Materials). Skipping static seed.');
      return;
    }

    console.log('Seeding initial MamaFarm data...');

    // 2. Settings
    await Settings.create({
      businessName: 'MamaFarm Organic Sprouts',
      phone: '+91 81301 88878',
      email: 'contact@mamafarm.com',
      address: 'Plot 42, Green Agro Food Park, New Delhi',
      gstNumber: '07AAACM1234F1Z9',
    });

    // 3. Suppliers
    const supplier1 = await Supplier.create({
      name: 'Agro Pulse Traders',
      contactPerson: 'Ramesh Kumar',
      phone: '+91 9811223344',
      email: 'ramesh@agropulses.com',
      address: 'Grain Market Yard, Shop 14, Delhi',
      gstNumber: '07AGROP1234A1Z1',
      totalPurchased: 45000,
      pendingPayment: 5000,
    });

    const supplier2 = await Supplier.create({
      name: 'EcoPack Containers Ltd',
      contactPerson: 'Anil Gupta',
      phone: '+91 9899887766',
      email: 'sales@ecopack.com',
      address: 'Industrial Area Phase 2, Noida',
      gstNumber: '09ECOPK5678B2Z4',
      totalPurchased: 12000,
      pendingPayment: 0,
    });

    // 4. Raw Materials
    await Material.create({
      name: 'Raw Green Moong Grain',
      category: 'Raw Bean',
      supplier: supplier1._id,
      quantity: 250,
      unit: 'kg',
      purchasePrice: 95,
      gstPercent: 5,
      minStockAlert: 50,
      paymentStatus: 'partial',
    });

    await Material.create({
      name: 'Desi Brown Chana Grain',
      category: 'Raw Bean',
      supplier: supplier1._id,
      quantity: 180,
      unit: 'kg',
      purchasePrice: 75,
      gstPercent: 5,
      minStockAlert: 40,
      paymentStatus: 'paid',
    });

    await Material.create({
      name: 'Sprout Pouches',
      category: 'Packaging',
      supplier: supplier2._id,
      quantity: 2000,
      unit: 'pcs',
      purchasePrice: 1.5,
      gstPercent: 12,
      minStockAlert: 300,
      paymentStatus: 'paid',
    });

    // 5. Shops / Clients
    await Shop.create({
      shopCode: 'SHOP-101',
      shopName: 'Fresh Veggies Mart',
      ownerName: 'Suresh Patel',
      phone: '+91 9810012345',
      address: 'Shop 12, Sector 18 Market, Noida',
      area: 'Noida Sector 18',
      gstNumber: '09FRESH1234C1Z3',
      outstandingBalance: 1800,
      totalDeliveredValue: 8500,
      totalPaidAmount: 6700,
    });

    await Shop.create({
      shopCode: 'SHOP-102',
      shopName: 'Green Grocery Hub',
      ownerName: 'Vikram Singh',
      phone: '+91 9871122334',
      address: 'Main Market, Connaught Place, New Delhi',
      area: 'Central Delhi',
      gstNumber: '07GREEN5678D1Z2',
      outstandingBalance: 3200,
      totalDeliveredValue: 12400,
      totalPaidAmount: 9200,
    });

    await Shop.create({
      shopCode: 'SHOP-103',
      shopName: 'Organic Life Supermarket',
      ownerName: 'Neha Sharma',
      phone: '+91 9955443322',
      address: 'Galleria Market, Gurugram',
      area: 'Gurugram',
      gstNumber: '06ORGAN9012E1Z8',
      outstandingBalance: 0,
      totalDeliveredValue: 15600,
      totalPaidAmount: 15600,
    });

    // 6. Activity Log
    await ActivityLog.create([
      { action: 'Database Seed', description: 'Initial MamaFarm database populated with owner account 8130188878.' },
    ]);

    console.log('MamaFarm Seed Completed Successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  }
};
