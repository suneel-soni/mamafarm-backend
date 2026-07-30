import { Router, Request, Response } from 'express';
import Shop from '../models/Shop';
import Delivery from '../models/Delivery';
import Payment from '../models/Payment';
import ReturnOrder from '../models/ReturnOrder';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const shops = await Shop.find({ isActive: true }).sort({ createdAt: -1 });
    return successResponse(res, shops);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching shops', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.shopName || !body.phone) {
      return errorResponse(res, 'Shop name and phone are required', 400);
    }

    const count = await Shop.countDocuments();
    const shopCode = body.shopCode || `SHOP-${101 + count}`;

    const newShop = await Shop.create({
      ...body,
      shopCode,
    });

    return successResponse(res, newShop, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error creating shop', 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findById(id);
    if (!shop) {
      return errorResponse(res, 'Shop not found', 404);
    }

    const deliveries = await Delivery.find({ $or: [{ shop: id }, { shopId: id }] }).sort({ deliveryDate: -1 });
    const payments = await Payment.find({ $or: [{ shop: id }, { shopId: id }] }).sort({ paymentDate: -1 });
    const returns = await ReturnOrder.find({ $or: [{ shop: id }, { shopId: id }] }).sort({ returnDate: -1 });

    const grossDeliveredVal = deliveries.reduce((sum, d) => sum + Number(d.netAmount || 0), 0);
    const grossPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    let totalReturnedQty = 0;
    let totalReplacedQty = 0;
    let totalRefunds = 0;

    returns.forEach((r: any) => {
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

    const totalDeliveredQty = deliveries.reduce((sum, d) => sum + (d.items?.reduce((iSum: number, item: any) => iSum + (item.quantity || 0), 0) || 0), 0);

    // Net Total Sales after deducting returned sprout value
    const netSalesVal = Math.max(0, grossDeliveredVal - totalRefunds);

    // Net Sales Payment Collected (capped at Net Sales)
    const netSalesPayment = Math.min(grossPaid, netSalesVal);

    // Outstanding Dues = Net Total Sales - Gross Payments Collected
    const calculatedOutstanding = Math.max(0, netSalesVal - grossPaid);

    if (
      shop.totalDeliveredValue !== netSalesVal ||
      shop.totalPaidAmount !== netSalesPayment ||
      shop.outstandingBalance !== calculatedOutstanding ||
      shop.totalDeliveredQuantity !== totalDeliveredQty ||
      shop.totalReturnedQuantity !== totalReturnedQty ||
      shop.totalReplacedQuantity !== totalReplacedQty
    ) {
      shop.totalDeliveredValue = netSalesVal;
      shop.totalPaidAmount = netSalesPayment;
      shop.outstandingBalance = calculatedOutstanding;
      shop.totalDeliveredQuantity = totalDeliveredQty;
      shop.totalReturnedQuantity = totalReturnedQty;
      shop.totalReplacedQuantity = totalReplacedQty;
      shop.currentQuantity = Math.max(0, totalDeliveredQty - totalReturnedQty);
      await shop.save();
    }

    const formatDateTime = (dateVal: any) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    const deliveryEntries = deliveries.map((d: any) => ({
      _id: d._id,
      id: d._id,
      date: formatDateTime(d.deliveryDate || d.createdAt),
      timestamp: new Date(d.deliveryDate || d.createdAt).getTime(),
      type: 'delivery',
      reference: d.deliveryNumber || 'DEL-2026',
      description: `Dispatched ${d.items?.map((i: any) => `${i.quantity} ${i.sproutType || 'Sprouts'}`).join(', ') || 'Sprouts'}`,
      debit: d.netAmount || 0,
      credit: 0,
      amountPaid: d.amountPaid || 0,
      paymentStatus: d.paymentStatus || ((d.amountPaid || 0) >= (d.netAmount || 0) ? 'paid' : (d.amountPaid || 0) > 0 ? 'partial' : 'unpaid'),
      balance: (d.netAmount || 0) - (d.amountPaid || 0),
    }));

    const standalonePaymentEntries = payments
      .filter((p: any) => {
        const notes = (p.notes || '').toLowerCase();
        return !notes.includes('immediate payment at delivery') && !notes.includes('collected payment for order');
      })
      .map((p: any) => ({
        _id: p._id,
        id: p._id,
        date: formatDateTime(p.paymentDate || p.createdAt),
        timestamp: new Date(p.paymentDate || p.createdAt).getTime(),
        type: 'payment',
        reference: p.paymentNumber || 'PAY-2026',
        description: `Payment Received (${p.paymentMethod || 'Cash'})${p.notes ? ` - ${p.notes}` : ''}`,
        debit: 0,
        credit: p.amount || 0,
        amountPaid: p.amount || 0,
        paymentStatus: 'paid',
        balance: 0,
      }));

    const returnEntries = returns.map((r: any) => {
      const isRep = r.type === 'replacement' || r.isReplacement;
      const itemsList = r.items?.map((i: any) => `${i.quantity} ${i.sproutType || 'Sprouts'}`).join(', ') || 'Sprouts';
      return {
        _id: r._id,
        id: r._id,
        date: formatDateTime(r.returnDate || r.createdAt),
        timestamp: new Date(r.returnDate || r.createdAt).getTime(),
        type: isRep ? 'replacement' : 'return',
        returnType: isRep ? 'replacement' : 'return',
        reference: r.returnNumber || (isRep ? 'REP-2026' : 'RET-2026'),
        description: isRep
          ? `Replaced ${itemsList} (${r.reason || 'Expired Exchange'})`
          : `Returned ${itemsList} (${r.reason || 'Unsold'})`,
        debit: 0,
        credit: isRep ? 0 : (r.totalRefundAmount || 0),
        amountPaid: isRep ? 0 : (r.totalRefundAmount || 0),
        paymentStatus: isRep ? 'replaced' : 'refunded',
        balance: 0,
        items: r.items,
        reason: r.reason,
      };
    });

    const ledger = [...deliveryEntries, ...standalonePaymentEntries, ...returnEntries].sort((a, b) => b.timestamp - a.timestamp);

    const salesGraph = deliveries.map((d: any) => ({
      date: new Date(d.deliveryDate || d.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' }),
      amount: d.netAmount || 0,
    })).reverse();

    const unpaidDeliveries = deliveries.filter((d: any) => (d.netAmount || 0) > (d.amountPaid || 0));
    const dueSyncDate = unpaidDeliveries.length > 0
      ? formatDateTime(unpaidDeliveries[0].deliveryDate || unpaidDeliveries[0].createdAt)
      : (deliveries.length > 0 ? formatDateTime(deliveries[0].deliveryDate || deliveries[0].createdAt) : formatDateTime(new Date()));

    return successResponse(res, {
      shop,
      deliveries,
      payments,
      returns,
      ledger,
      deliveryHistory: deliveryEntries,
      summary: {
        totalDeliveredQty,
        totalReturnedQty,
        totalReplacedQty,
        currentQuantity: Math.max(0, totalDeliveredQty - totalReturnedQty),
        grossDeliveredVal,
        totalDeliveredVal: netSalesVal,
        grossPaid,
        totalPaid: netSalesPayment,
        totalRefunds,
        pendingPayment: calculatedOutstanding,
        dueSyncDate,
      },
      salesGraph: salesGraph.length > 0 ? salesGraph : [
        { date: 'Jul 15', amount: shop.totalDeliveredValue || 2400 },
        { date: 'Jul 18', amount: (shop.totalDeliveredValue || 2400) * 0.8 },
        { date: 'Jul 22', amount: shop.totalDeliveredValue || 3200 },
      ],
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching shop details', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updatedShop = await Shop.findByIdAndUpdate(id, body, { new: true });
    if (!updatedShop) {
      return errorResponse(res, 'Shop not found', 404);
    }

    return successResponse(res, updatedShop);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error updating shop', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedShop = await Shop.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!deletedShop) {
      return errorResponse(res, 'Shop not found', 404);
    }

    return successResponse(res, { message: 'Shop deactivated successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting shop', 500);
  }
});

export default router;
