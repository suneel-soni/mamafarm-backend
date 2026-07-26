import { Router, Request, Response } from 'express';
import Supplier from '../models/Supplier';
import Material from '../models/Material';
import Payment from '../models/Payment';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    return successResponse(res, suppliers);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching suppliers', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.phone) {
      return errorResponse(res, 'Supplier name and phone are required', 400);
    }

    const newSupplier = await Supplier.create(body);
    return successResponse(res, newSupplier, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error creating supplier', 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);
    if (!supplier) return errorResponse(res, 'Supplier not found', 404);

    const materials = await Material.find({ supplier: id }).sort({ purchaseDate: -1 });
    const payments = await Payment.find({ supplier: id, entityType: 'supplier' }).sort({ paymentDate: -1 });

    return successResponse(res, {
      supplier,
      materials,
      payments,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching supplier details', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updatedSupplier = await Supplier.findByIdAndUpdate(id, body, { new: true });
    if (!updatedSupplier) return errorResponse(res, 'Supplier not found', 404);

    return successResponse(res, updatedSupplier);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error updating supplier', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedSupplier = await Supplier.findByIdAndDelete(id);
    if (!deletedSupplier) return errorResponse(res, 'Supplier not found', 404);

    return successResponse(res, { message: 'Supplier deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting supplier', 500);
  }
});

export default router;
