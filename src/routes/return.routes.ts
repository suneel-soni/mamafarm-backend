import { Router, Request, Response } from 'express';
import ReturnOrder from '../models/ReturnOrder';
import Shop from '../models/Shop';
import Delivery from '../models/Delivery';
import Payment from '../models/Payment';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

async function recalculateShop(shopId: string) {
  const shop = await Shop.findById(shopId);
  if (!shop) return;

  const deliveries = await Delivery.find({ $or: [{ shop: shopId }, { shopId: shopId }] });
  const payments = await Payment.find({ $or: [{ shop: shopId }, { shopId: shopId }] });
  const returns = await ReturnOrder.find({ $or: [{ shop: shopId }, { shopId: shopId }] });

  let totalReturnedQty = 0;
  let totalReplacedQty = 0;
  let totalRefunds = 0;

  returns.forEach((r) => {
    const isRep = r.type === 'replacement' || r.isReplacement;
    if (isRep) {
      r.items.forEach((item: any) => {
        totalReplacedQty += Number(item.quantity || 0);
      });
    } else {
      totalRefunds += Number(r.totalRefundAmount || 0);
      r.items.forEach((item: any) => {
        totalReturnedQty += Number(item.quantity || 0);
      });
    }
  });

  const isDeliveryPayment = (p: any) => {
    const notes = (p.notes || '').toLowerCase();
    return (
      notes.includes('delivery') ||
      notes.includes('dispatch') ||
      notes.includes('order') ||
      notes.includes('collected') ||
      notes.includes('immediate') ||
      notes.includes('settlement') ||
      Boolean(p.delivery) ||
      Boolean(p.deliveryId)
    );
  };

  const standalonePayments = payments.filter((p: any) => !isDeliveryPayment(p));

  const grossDeliveredValue = deliveries.reduce((sum, d) => sum + Number(d.netAmount || 0), 0);
  const totalDeliveryPaid = deliveries.reduce((sum, d) => sum + Number(d.amountPaid || 0), 0);
  const totalStandalonePaid = standalonePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const grossPaid = totalDeliveryPaid + totalStandalonePaid;

  const totalDeliveredQty = deliveries.reduce(
    (sum, d) => sum + (d.items?.reduce((iSum: number, item: any) => iSum + (item.quantity || 0), 0) || 0),
    0
  );

  const netSalesVal = Math.max(0, grossDeliveredValue - totalRefunds);
  const netSalesPayment = Math.min(grossPaid, netSalesVal);
  const calculatedOutstanding = Math.max(0, netSalesVal - grossPaid);

  shop.totalDeliveredQuantity = totalDeliveredQty;
  shop.totalReturnedQuantity = totalReturnedQty;
  shop.totalReplacedQuantity = totalReplacedQty;
  shop.totalDeliveredValue = netSalesVal;
  shop.totalPaidAmount = netSalesPayment;
  shop.outstandingBalance = calculatedOutstanding;
  shop.currentQuantity = Math.max(0, totalDeliveredQty - totalReturnedQty);
  await shop.save();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.query;
    const filter: any = {};
    if (shopId) {
      filter.$or = [{ shop: shopId }, { shopId: shopId }];
    }
    const returns = await ReturnOrder.find(filter).sort({ returnDate: -1, createdAt: -1 });
    return successResponse(res, returns);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching return orders', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const targetShopId = body.shopId || body.shop;
    if (!targetShopId || !body.items || body.items.length === 0) {
      return errorResponse(res, 'Shop and return items are required', 400);
    }

    const shop = await Shop.findById(targetShopId);
    if (!shop) return errorResponse(res, 'Shop not found', 400);

    const isReplacement = body.type === 'replacement' || body.isReplacement === true;
    const count = await ReturnOrder.countDocuments();
    const prefix = isReplacement ? 'REP' : 'RET';
    const returnNumber = `${prefix}-${Date.now().toString().slice(-4)}-${count + 1}`;

    const normalizedItems = (body.items || []).map((item: any) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return {
        ...item,
        quantity: qty,
        rate: rate,
        amount: isReplacement ? 0 : (item.amount !== undefined ? Number(item.amount) : qty * rate),
      };
    });

    const totalRefundAmount = isReplacement
      ? 0
      : normalizedItems.reduce((sum: number, item: any) => sum + item.amount, 0);

    const newReturn = await ReturnOrder.create({
      ...body,
      type: isReplacement ? 'replacement' : 'return',
      isReplacement,
      items: normalizedItems,
      shop: shop._id,
      shopId: shop._id,
      returnNumber,
      shopName: shop.shopName,
      totalRefundAmount,
      reason: body.reason || (isReplacement ? 'Expired Packet Replacement' : 'Unsold / Expired Return'),
    });

    await recalculateShop(String(shop._id));

    return successResponse(res, newReturn, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error processing return order', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existingReturn = await ReturnOrder.findById(id);
    if (!existingReturn) {
      return errorResponse(res, 'Return/Replacement record not found', 404);
    }

    const isReplacement = body.type === 'replacement' || body.isReplacement === true;
    const rawItems = body.items || existingReturn.items || [];

    const normalizedItems = rawItems.map((item: any) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return {
        ...item,
        quantity: qty,
        rate: rate,
        amount: isReplacement ? 0 : (item.amount !== undefined ? Number(item.amount) : qty * rate),
      };
    });

    const totalRefundAmount = isReplacement
      ? 0
      : normalizedItems.reduce((sum: number, item: any) => sum + item.amount, 0);

    const updated = await ReturnOrder.findByIdAndUpdate(
      id,
      {
        ...body,
        type: isReplacement ? 'replacement' : 'return',
        isReplacement,
        items: normalizedItems,
        totalRefundAmount,
      },
      { new: true }
    );

    if (updated) {
      await recalculateShop(String(updated.shop));
    }

    return successResponse(res, updated);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error updating return record', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const returnOrder = await ReturnOrder.findByIdAndDelete(id);
    if (!returnOrder) return errorResponse(res, 'Return order not found', 404);

    await recalculateShop(String(returnOrder.shop));

    return successResponse(res, { message: 'Return order deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting return order', 500);
  }
});

export default router;
