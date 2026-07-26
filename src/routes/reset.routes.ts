import { Router, Request, Response } from 'express';
import Delivery from '../models/Delivery';
import Payment from '../models/Payment';
import ReturnOrder from '../models/ReturnOrder';
import Shop from '../models/Shop';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

async function performReset(res: Response) {
  try {
    await Delivery.deleteMany({});
    await Payment.deleteMany({});
    await ReturnOrder.deleteMany({});

    await Shop.updateMany(
      {},
      {
        totalDeliveredQuantity: 0,
        totalReturnedQuantity: 0,
        outstandingBalance: 0,
        totalDeliveredValue: 0,
        totalPaidAmount: 0,
        lastDeliveryDate: null,
      }
    );

    return successResponse(res, {
      message: 'Successfully cleared all sales, dispatches, payments, and return orders. Reset shop financial balances to zero.',
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to reset sales data', 500);
  }
}

router.post('/', async (req: Request, res: Response) => {
  return performReset(res);
});

router.get('/', async (req: Request, res: Response) => {
  return performReset(res);
});

export default router;
