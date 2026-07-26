import { Router, Request, Response } from 'express';
import Material from '../models/Material';
import Supplier from '../models/Supplier';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const materials = await Material.find().populate('supplier').sort({ createdAt: -1 });
    return successResponse(res, materials);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching materials', 500);
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { filter, startDate, endDate } = req.query;
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (filter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === 'this_week') {
      const day = now.getDay() || 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    } else if (filter === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === 'custom' && startDate) {
      start = new Date(startDate as string);
      if (endDate) end = new Date(endDate as string);
    }

    const query: any = {};
    if (start) {
      query.purchaseDate = { $gte: start };
      if (end) query.purchaseDate.$lte = end;
    }

    const materials = await Material.find(query).populate('supplier').sort({ purchaseDate: -1, createdAt: -1 });

    let totalPurchaseCost = 0;
    const categoryTotals: Record<string, { category: string; totalCost: number; itemsCount: number }> = {
      'Raw Bean': { category: 'Raw Bean', totalCost: 0, itemsCount: 0 },
      'Packaging': { category: 'Packaging', totalCost: 0, itemsCount: 0 },
      'Chemicals/Cleaning': { category: 'Chemicals/Cleaning', totalCost: 0, itemsCount: 0 },
      'Other': { category: 'Other', totalCost: 0, itemsCount: 0 },
    };

    const groupedMap: Record<string, { date: string; timestamp: number; totalCost: number; materials: any[] }> = {};

    materials.forEach((mat: any) => {
      const itemCost = (mat.purchasePrice || 0) * (mat.quantity || 0);
      totalPurchaseCost += itemCost;

      const cat = mat.category || 'Other';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { category: cat, totalCost: 0, itemsCount: 0 };
      }
      categoryTotals[cat].totalCost += itemCost;
      categoryTotals[cat].itemsCount += 1;

      const d = new Date(mat.purchaseDate || mat.createdAt || Date.now());
      const dateKey = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timestamp = d.getTime();

      if (!groupedMap[dateKey]) {
        groupedMap[dateKey] = {
          date: dateKey,
          timestamp,
          totalCost: 0,
          materials: [],
        };
      }
      groupedMap[dateKey].totalCost += itemCost;
      groupedMap[dateKey].materials.push(mat);
    });

    const groupedSummary = Object.values(groupedMap).sort((a, b) => b.timestamp - a.timestamp);

    return successResponse(res, {
      totalPurchaseCost,
      numberOfPurchases: materials.length,
      categoryBreakdown: Object.values(categoryTotals),
      groupedSummary,
      materials,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching materials summary', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || body.purchasePrice === undefined) {
      return errorResponse(res, 'Material name and purchase price are required', 400);
    }

    const newMaterial = await Material.create(body);

    if (body.supplier) {
      const itemTotal = (body.purchasePrice || 0) * (body.quantity || 0);
      const supplier = await Supplier.findById(body.supplier);
      if (supplier) {
        supplier.totalPurchased += itemTotal;
        if (body.paymentStatus === 'pending') {
          supplier.pendingPayment += itemTotal;
        }
        await supplier.save();
      }
    }

    return successResponse(res, newMaterial, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error adding material', 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const material = await Material.findById(id).populate('supplier');
    if (!material) return errorResponse(res, 'Material not found', 404);

    return successResponse(res, material);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching material', 500);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updatedMaterial = await Material.findByIdAndUpdate(id, body, { new: true });
    if (!updatedMaterial) return errorResponse(res, 'Material not found', 404);

    return successResponse(res, updatedMaterial);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error updating material', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedMaterial = await Material.findByIdAndDelete(id);
    if (!deletedMaterial) return errorResponse(res, 'Material not found', 404);

    return successResponse(res, { message: 'Material deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting material', 500);
  }
});

export default router;
