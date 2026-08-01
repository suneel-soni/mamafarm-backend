import { Router, Request, Response } from 'express';
import Delivery from '../models/Delivery';
import Shop from '../models/Shop';
import Material from '../models/Material';
import Payment from '../models/Payment';
import ReturnOrder from '../models/ReturnOrder';
import ActivityLog from '../models/ActivityLog';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const deliveries = await Delivery.find().sort({ deliveryDate: -1 });

    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.netAmount || 0), 0);
    const totalPacketsDispatched = deliveries.reduce((sum, d) => {
      const itemsQty = d.items?.reduce((iSum: number, item: any) => iSum + (item.quantity || 0), 0) || 0;
      return sum + itemsQty;
    }, 0);

    const totalShopDues = deliveries.reduce(
      (sum, d) => sum + Math.max(0, (d.netAmount || 0) - (d.amountPaid || 0)),
      0
    );

    const materials = await Material.find();
    const totalMaterialCost = materials.reduce(
      (sum, m) => sum + (m.purchasePrice || 0) * (m.quantity || 0),
      0
    );

    const activeShopsCount = await Shop.countDocuments({ isActive: true });
    const lowStockCount = materials.filter((m) => (m.quantity || 0) <= (m.minStockAlert || 10)).length;

    const recentDeliveries = deliveries.slice(0, 5);
    const activityLogs = await ActivityLog.find().sort({ timestamp: -1 }).limit(5);

    return successResponse(res, {
      kpis: {
        totalRevenue,
        totalPacketsDispatched,
        totalShopDues,
        totalMaterialCost,
        activeShopsCount,
        lowStockCount,
      },
      recentDeliveries,
      activityLogs,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching dashboard KPIs', 500);
  }
});

router.get('/sales', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const day = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const deliveries = await Delivery.find().sort({ deliveryDate: -1 });
    const returns = await ReturnOrder.find();

    let todaySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let totalRevenue = 0;
    let totalDeliveredPackets = 0;
    let totalDeliveredAmount = 0;

    deliveries.forEach((d) => {
      const amt = d.netAmount || 0;
      const dDate = new Date(d.deliveryDate);

      totalRevenue += amt;
      totalDeliveredAmount += amt;
      if (dDate >= startOfToday) todaySales += amt;
      if (dDate >= startOfWeek) weeklySales += amt;
      if (dDate >= startOfMonth) monthlySales += amt;

      const itemsQty = d.items?.reduce((iSum: number, item: any) => iSum + Number(item.quantity || 0), 0) || 0;
      totalDeliveredPackets += itemsQty;
    });

    let totalReplacedPackets = 0;
    let totalReplacedAmount = 0;

    returns.forEach((r) => {
      const isRep = r.type === 'replacement' || r.isReplacement;
      if (isRep) {
        r.items?.forEach((item: any) => {
          const qty = Number(item.quantity || 0);
          const rate = Number(item.rate || 0);
          const amt = Number(item.amount || qty * rate);
          totalReplacedPackets += qty;
          totalReplacedAmount += amt;
        });
      }
    });

    const shops = await Shop.find().sort({ totalDeliveredValue: -1 });

    const pendingCollection = deliveries.reduce(
      (sum, d) => sum + Math.max(0, (d.netAmount || 0) - (d.amountPaid || 0)),
      0
    );

    const topPerformingShops = shops.slice(0, 5).map((s) => ({
      _id: s._id,
      shopName: s.shopName,
      totalSales: s.totalDeliveredValue || 0,
      deliveredQty: Math.max(0, (s.totalDeliveredQuantity || 0) - (s.totalReturnedQuantity || 0)),
      image: s.image,
    }));

    const dailyMap: Record<string, { date: string; sales: number; deliveries: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateKey = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
      dailyMap[dateKey] = { date: dateKey, sales: 0, deliveries: 0 };
    }

    deliveries.forEach((d) => {
      const dateKey = new Date(d.deliveryDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].sales += d.netAmount || 0;
        dailyMap[dateKey].deliveries += 1;
      }
    });

    const dailyGraph = Object.values(dailyMap);

    const payments = await Payment.find({ $or: [{ entityType: 'shop' }, { entityType: { $exists: false } }] });
    const totalCollectionAllTime = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = now.getFullYear();

    const monthlyGraph = months.map((m, idx) => {
      const salesInMonth = deliveries
        .filter((d) => {
          const dt = new Date(d.deliveryDate);
          return dt.getMonth() === idx && dt.getFullYear() === currentYear;
        })
        .reduce((sum, d) => sum + (d.netAmount || 0), 0);

      const collectionsInMonth = payments
        .filter((p) => {
          const dt = new Date(p.paymentDate);
          return dt.getMonth() === idx && dt.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        month: m,
        sales: salesInMonth,
        collections: collectionsInMonth,
      };
    });

    return successResponse(res, {
      todaySales,
      weeklySales,
      monthlySales,
      totalRevenue,
      totalSalesAllTime: totalRevenue,
      totalCollectionAllTime,
      pendingCollection,
      totalDeliveredPackets,
      totalDeliveredAmount,
      totalReplacedPackets,
      totalReplacedAmount,
      topPerformingShops,
      dailyGraph,
      monthlyGraph,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching sales performance', 500);
  }
});

export default router;
