import { Router, Request, Response } from 'express';
import Inventory from '../models/Inventory';
import Material from '../models/Material';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

// GET all inventory items
router.get('/', async (req: Request, res: Response) => {
  try {
    let items = await Inventory.find().sort({ itemName: 1 });

    // Seed default inventory items if collection is empty
    if (items.length === 0) {
      const rawMaterials = await Material.find();
      const seedItems = [
        {
          itemName: 'Green Moong Beans (Organic)',
          type: 'raw_material',
          quantity: 250,
          unit: 'kg',
          minThreshold: 50,
          valuationPerUnit: 110,
          location: 'Main Warehouse',
        },
        {
          itemName: 'Fresh Organic Sprouts (Packed)',
          type: 'finished_sprout',
          quantity: 400,
          unit: 'packets',
          minThreshold: 100,
          valuationPerUnit: 25,
          location: 'Cold Storage',
        },
        {
          itemName: 'Stand-up Packaging Pouches (200g)',
          type: 'packaging',
          quantity: 5000,
          unit: 'pcs',
          minThreshold: 1000,
          valuationPerUnit: 2.5,
          location: 'Packaging Room',
        },
      ];

      // Also map any materials present
      rawMaterials.forEach((mat) => {
        if (!seedItems.some((s) => s.itemName.toLowerCase() === mat.name.toLowerCase())) {
          seedItems.push({
            itemName: mat.name,
            type: 'raw_material',
            quantity: mat.quantity || 0,
            unit: mat.unit || 'kg',
            minThreshold: mat.minStockAlert || 10,
            valuationPerUnit: mat.purchasePrice || 0,
            location: 'Main Store',
          });
        }
      });

      items = await Inventory.insertMany(seedItems);
    }

    return successResponse(res, items);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching inventory', 500);
  }
});

// CREATE new inventory item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { itemName, type, quantity, unit, minThreshold, valuationPerUnit, location } = req.body;

    if (!itemName) {
      return errorResponse(res, 'Item name is required', 400);
    }

    const newItem = await Inventory.create({
      itemName,
      type: type || 'raw_material',
      quantity: Number(quantity) || 0,
      unit: unit || 'kg',
      minThreshold: Number(minThreshold) || 10,
      valuationPerUnit: Number(valuationPerUnit) || 0,
      location: location || 'Main Store',
    });

    return successResponse(res, newItem, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error creating inventory item', 500);
  }
});

// UPDATE inventory item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return errorResponse(res, 'Inventory item not found', 404);
    }
    return successResponse(res, updated);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error updating inventory item', 500);
  }
});

// DELETE single inventory item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Inventory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return errorResponse(res, 'Inventory item not found', 404);
    }
    return successResponse(res, { message: 'Item deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting inventory item', 500);
  }
});

// DELETE all inventory items
router.delete('/', async (req: Request, res: Response) => {
  try {
    await Inventory.deleteMany({});
    return successResponse(res, { message: 'All inventory items cleared successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error clearing inventory', 500);
  }
});

export default router;
