import { Router, Request, Response } from 'express';
import Payment from '../models/Payment';
import Shop from '../models/Shop';
import Delivery from '../models/Delivery';
import ReturnOrder from '../models/ReturnOrder';
import Supplier from '../models/Supplier';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

async function recalculateShop(shopId: string) {
  const shop = await Shop.findById(shopId);
  if (!shop) return;

  const deliveries = await Delivery.find({ shop: shopId });
  const payments = await Payment.find({ shop: shopId });
  const returns = await ReturnOrder.find({ shop: shopId });

  const grossDeliveredValue = deliveries.reduce((sum, d) => sum + Number(d.netAmount || 0), 0);
  const grossPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  let totalRefunds = 0;
  returns.forEach((r) => {
    const isRep = r.type === 'replacement' || r.isReplacement;
    if (!isRep) totalRefunds += Number(r.totalRefundAmount || 0);
  });

  const netSalesVal = Math.max(0, grossDeliveredValue - totalRefunds);
  const netSalesPayment = Math.min(grossPaid, netSalesVal);
  const outstandingBalance = Math.max(0, netSalesVal - grossPaid);

  shop.totalDeliveredValue = netSalesVal;
  shop.totalPaidAmount = netSalesPayment;
  shop.outstandingBalance = outstandingBalance;
  await shop.save();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const payments = await Payment.find().sort({ paymentDate: -1 });
    return successResponse(res, payments);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching payments', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.amount || body.amount <= 0) {
      return errorResponse(res, 'Valid payment amount is required', 400);
    }

    const count = await Payment.countDocuments();
    const paymentNumber = `PAY-${Date.now().toString().slice(-4)}-${count + 1}`;

    const targetShopId = body.shopId || body.shop;
    const targetSupplierId = body.supplierId || body.supplier;

    let partyName = body.partyName || '';
    if (body.entityType === 'shop' && targetShopId) {
      const shop = await Shop.findById(targetShopId);
      if (shop) partyName = shop.shopName;
    } else if (body.entityType === 'supplier' && targetSupplierId) {
      const supp = await Supplier.findById(targetSupplierId);
      if (supp) partyName = supp.name;
    }

    const newPayment = await Payment.create({
      ...body,
      ...(targetShopId ? { shop: targetShopId, shopId: targetShopId } : {}),
      ...(targetSupplierId ? { supplier: targetSupplierId, supplierId: targetSupplierId } : {}),
      paymentNumber,
      partyName,
    });

    if (body.entityType === 'shop' && targetShopId) {
      await recalculateShop(String(targetShopId));
    }

    return successResponse(res, newPayment, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error recording payment', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) return errorResponse(res, 'Payment record not found', 404);

    if (payment.entityType === 'shop' && payment.shop) {
      await recalculateShop(String(payment.shop));
    }

    return successResponse(res, { message: 'Payment record deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting payment', 500);
  }
});

export default router;
