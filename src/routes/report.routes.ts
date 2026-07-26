import { Router, Request, Response } from 'express';
import Delivery from '../models/Delivery';
import Material from '../models/Material';
import Expense from '../models/Expense';
import Shop from '../models/Shop';
import Payment from '../models/Payment';
import ReturnOrder from '../models/ReturnOrder';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const deliveries = await Delivery.find();
    const materials = await Material.find();
    const expenses = await Expense.find();
    const shops = await Shop.find({ isActive: true });
    const payments = await Payment.find();
    const returns = await ReturnOrder.find();

    const totalRevenue = deliveries.reduce((sum, d) => sum + (d.netAmount || 0), 0);
    const totalMaterialCost = materials.reduce((sum, m) => sum + (m.purchasePrice || 0) * (m.quantity || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = totalRevenue - (totalMaterialCost + totalExpenses);

    const shopPerformance = shops.map((s) => {
      const shopDeliveries = deliveries.filter((d) => String(d.shop) === String(s._id));
      const shopPayments = payments.filter((p) => String(p.shop) === String(s._id));
      const shopReturns = returns.filter((r) => String(r.shop) === String(s._id));

      const delivered = shopDeliveries.reduce((sum, d) => sum + (d.netAmount || 0), 0);
      const paid = shopPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const refunded = shopReturns.reduce((sum, r) => sum + (r.totalRefundAmount || 0), 0);

      return {
        _id: s._id,
        shopName: s.shopName,
        totalDelivered: delivered,
        totalPaid: paid,
        pendingBalance: Math.max(0, delivered - paid - refunded),
      };
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyTrends = months.map((month, idx) => {
      const monthSales = deliveries
        .filter((d) => {
          const dt = new Date(d.deliveryDate);
          return dt.getMonth() === idx && dt.getFullYear() === currentYear;
        })
        .reduce((sum, d) => sum + (d.netAmount || 0), 0);

      const monthExpenses = expenses
        .filter((e) => {
          const dt = new Date(e.expenseDate);
          return dt.getMonth() === idx && dt.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        month,
        revenue: monthSales,
        expense: monthExpenses,
        profit: monthSales - monthExpenses,
      };
    });

    return successResponse(res, {
      summary: {
        totalRevenue,
        totalMaterialCost,
        totalExpenses,
        netProfit,
      },
      shopPerformance,
      monthlyTrends,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error generating business report', 500);
  }
});

export default router;
