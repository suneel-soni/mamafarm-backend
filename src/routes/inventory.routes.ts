import { Router, Request, Response } from 'express';
import Material from '../models/Material';
import Shop from '../models/Shop';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const rawMaterials = await Material.find().sort({ name: 1 });

    const inventoryItems = rawMaterials.map((mat) => {
      const isLowStock = (mat.quantity || 0) <= (mat.minStockAlert || 10);
      return {
        _id: mat._id,
        name: mat.name,
        category: mat.category,
        quantity: mat.quantity,
        unit: mat.unit,
        pricePerUnit: mat.purchasePrice,
        minAlert: mat.minStockAlert,
        valuation: (mat.quantity || 0) * (mat.purchasePrice || 0),
        status: isLowStock ? 'low_stock' : 'in_stock',
      };
    });

    const totalValuation = inventoryItems.reduce((sum, item) => sum + item.valuation, 0);
    const lowStockCount = inventoryItems.filter((i) => i.status === 'low_stock').length;

    return successResponse(res, {
      items: inventoryItems,
      totalValuation,
      lowStockCount,
      totalTypes: inventoryItems.length,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching inventory', 500);
  }
});

export default router;
