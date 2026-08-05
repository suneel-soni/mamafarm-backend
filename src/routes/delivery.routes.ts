import { Router, Request, Response } from 'express';
import Delivery from '../models/Delivery';
import Shop from '../models/Shop';
import Payment from '../models/Payment';
import ReturnOrder from '../models/ReturnOrder';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

async function recalculateShopCounters(shopId: string) {
  const shop = await Shop.findById(shopId);
  if (!shop) return;

  const deliveries = await Delivery.find({ shop: shopId });
  const payments = await Payment.find({ shop: shopId });
  const returns = await ReturnOrder.find({ shop: shopId });

  let totalDeliveredQty = 0;
  let totalDeliveredValue = 0;

  deliveries.forEach((d) => {
    totalDeliveredValue += d.netAmount || 0;
    d.items.forEach((item: any) => {
      totalDeliveredQty += item.quantity || 0;
    });
  });

  let totalReturnedQty = 0;
  let totalReplacedQty = 0;
  let totalRefunds = 0;
  returns.forEach((r) => {
    const isRep = r.type === 'replacement' || r.isReplacement;
    if (isRep) {
      r.items?.forEach((item: any) => {
        totalReplacedQty += Number(item.quantity || 0);
      });
    } else {
      totalRefunds += Number(r.totalRefundAmount || 0);
      r.items?.forEach((item: any) => {
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

  const totalDeliveryPaid = deliveries.reduce((sum, d) => sum + Number(d.amountPaid || 0), 0);
  const totalStandalonePaid = standalonePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const grossPaid = totalDeliveryPaid + totalStandalonePaid;

  const netSalesVal = Math.max(0, totalDeliveredValue - totalRefunds);
  const netSalesPayment = Math.min(grossPaid, netSalesVal);
  const outstandingBalance = Math.max(0, netSalesVal - grossPaid);

  shop.totalDeliveredQuantity = totalDeliveredQty;
  shop.totalReturnedQuantity = totalReturnedQty;
  shop.totalReplacedQuantity = totalReplacedQty;
  shop.totalDeliveredValue = netSalesVal;
  shop.totalPaidAmount = netSalesPayment;
  shop.outstandingBalance = outstandingBalance;
  shop.currentQuantity = Math.max(0, totalDeliveredQty - totalReturnedQty);
  if (deliveries.length > 0) {
    const sorted = [...deliveries].sort((a, b) => new Date(b.deliveryDate || b.createdAt).getTime() - new Date(a.deliveryDate || a.createdAt).getTime());
    shop.lastDeliveryDate = sorted[0].deliveryDate;
  }
  await shop.save();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const deliveries = await Delivery.find().sort({ deliveryDate: -1 });
    return successResponse(res, deliveries);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching deliveries', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const targetShopId = body.shopId || body.shop;
    if (!targetShopId || !body.items || body.items.length === 0) {
      return errorResponse(res, 'Shop and items are required', 400);
    }

    const shop = await Shop.findById(targetShopId);
    if (!shop) return errorResponse(res, 'Invalid Shop ID', 400);

    const count = await Delivery.countDocuments();
    const deliveryNumber = `DEL-${Date.now().toString().slice(-4)}-${count + 1}`;

    const normalizedItems = body.items.map((item: any) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return {
        ...item,
        unit: item.unit || 'packets',
        quantity: qty,
        rate: rate,
        amount: item.amount !== undefined ? Number(item.amount) : qty * rate,
      };
    });

    const subTotal = normalizedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const discount = body.discount || 0;
    const netAmount = Math.max(0, subTotal - discount);
    const amountPaid = body.amountPaid || 0;

    let paymentStatus: 'paid' | 'unpaid' | 'partial' = 'unpaid';
    if (amountPaid >= netAmount && netAmount > 0) paymentStatus = 'paid';
    else if (amountPaid > 0) paymentStatus = 'partial';

    const delivery = await Delivery.create({
      ...body,
      items: normalizedItems,
      shop: shop._id,
      shopId: shop._id,
      shopName: shop.shopName,
      deliveryNumber,
      subTotal,
      netAmount,
      paymentStatus,
    });

    if (amountPaid > 0) {
      const payCount = await Payment.countDocuments();
      await Payment.create({
        paymentNumber: `PAY-${Date.now().toString().slice(-4)}-${payCount + 1}`,
        entityType: 'shop',
        shop: shop._id,
        partyName: shop.shopName,
        amount: amountPaid,
        paymentMethod: body.paymentMethod || 'cash',
        notes: `Immediate payment at delivery ${deliveryNumber}`,
      });
    }

    await recalculateShopCounters(String(shop._id));

    return successResponse(res, delivery, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error creating delivery', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existingDelivery = await Delivery.findById(id);
    if (!existingDelivery) return errorResponse(res, 'Delivery not found', 404);

    if (body.items) {
      const normalizedItems = body.items.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        return {
          ...item,
          unit: item.unit || 'packets',
          quantity: qty,
          rate: rate,
          amount: item.amount !== undefined ? Number(item.amount) : qty * rate,
        };
      });
      body.items = normalizedItems;
      const subTotal = normalizedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
      const discount = body.discount !== undefined ? body.discount : existingDelivery.discount;
      body.subTotal = subTotal;
      body.netAmount = Math.max(0, subTotal - discount);
    }

    const updatedDelivery = await Delivery.findByIdAndUpdate(id, body, { new: true });
    if (updatedDelivery) {
      await recalculateShopCounters(String(updatedDelivery.shop));
    }

    return successResponse(res, updatedDelivery);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error updating delivery', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.findByIdAndDelete(id);
    if (!delivery) return errorResponse(res, 'Delivery not found', 404);

    await recalculateShopCounters(String(delivery.shop));

    return successResponse(res, { message: 'Delivery deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting delivery', 500);
  }
});

export default router;
