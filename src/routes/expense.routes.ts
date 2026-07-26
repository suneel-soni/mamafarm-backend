import { Router, Request, Response } from 'express';
import Expense from '../models/Expense';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const expenses = await Expense.find().sort({ expenseDate: -1 });

    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'misc';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (e.amount || 0);
    });

    return successResponse(res, {
      expenses,
      totalExpense,
      categoryBreakdown,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error fetching expenses', 500);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.title || !body.amount) {
      return errorResponse(res, 'Expense title and amount are required', 400);
    }

    const newExpense = await Expense.create(body);
    return successResponse(res, newExpense, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error recording expense', 500);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedExpense = await Expense.findByIdAndDelete(id);
    if (!deletedExpense) return errorResponse(res, 'Expense not found', 404);

    return successResponse(res, { message: 'Expense deleted successfully' });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Error deleting expense', 500);
  }
});

export default router;
