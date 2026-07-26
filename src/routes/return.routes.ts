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

  const deliveries = await Delivery.find({ shop: shopId });
  const payments = await Payment.find({ shop: shopId });
  const returns = await ReturnOrder.find({ shop: shopId });

  let totalReturnedQty = 0;
  let totalRefunds = 0;
  returns.forEach((r) => {
    totalRefunds += r.totalRefundAmount || 0;
    r.items.forEach((item: any) => {
      totalReturnedQty += item.quantity || 0;
    });
  });

  const totalDeliveredValue = deliveries.reduce((sum, d) => sum + (d.netAmount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  shop.totalReturnedQuantity = totalReturnedQty;
  shop.outstandingBalance = Math.max(0, totalDeliveredValue - totalPaid - totalRefunds);
  await shop.save();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const returns = await ReturnOrder.find().sort({ returnDate: -1 });
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

    const count = await ReturnOrder.countDocuments();
    const returnNumber = `RET-${Date.now().toString().slice(-4)}-${count + 1}`;

    const totalRefundAmount = body.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.rate,
      0
    );

    const newReturn = await ReturnOrder.create({
      ...body,
      returnNumber,
      shopName: shop.shopName,
      totalRefundAmount,
    });

    await recalculateShop(String(shop._id));

    return successResponse(res, newReturn, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error processing return order', 500);
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
