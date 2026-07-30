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

  const totalDeliveredValue = deliveries.reduce((sum, d) => sum + (d.netAmount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalDeliveredQty = deliveries.reduce(
    (sum, d) => sum + (d.items?.reduce((iSum: number, item: any) => iSum + (item.quantity || 0), 0) || 0),
    0
  );

  const calculatedOutstanding = deliveries.reduce(
    (sum, d) => sum + Math.max(0, (d.netAmount || 0) - (d.amountPaid || 0)),
    0
  );

  shop.totalDeliveredQuantity = totalDeliveredQty;
  shop.totalReturnedQuantity = totalReturnedQty;
  shop.totalReplacedQuantity = totalReplacedQty;
  shop.totalDeliveredValue = totalDeliveredValue;
  shop.totalPaidAmount = totalPaid;
  shop.outstandingBalance = calculatedOutstanding;
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

    const totalRefundAmount = isReplacement
      ? 0
      : body.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);

    const newReturn = await ReturnOrder.create({
      ...body,
      type: isReplacement ? 'replacement' : 'return',
      isReplacement,
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
    const items = body.items || existingReturn.items;

    const totalRefundAmount = isReplacement
      ? 0
      : items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);

    const updated = await ReturnOrder.findByIdAndUpdate(
      id,
      {
        ...body,
        type: isReplacement ? 'replacement' : 'return',
        isReplacement,
        items,
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
