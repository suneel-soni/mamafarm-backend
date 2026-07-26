import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/db';

import authRoutes from './routes/auth.routes';
import shopRoutes from './routes/shop.routes';
import deliveryRoutes from './routes/delivery.routes';
import paymentRoutes from './routes/payment.routes';
import returnRoutes from './routes/return.routes';
import materialRoutes from './routes/material.routes';
import supplierRoutes from './routes/supplier.routes';
import expenseRoutes from './routes/expense.routes';
import inventoryRoutes from './routes/inventory.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import resetRoutes from './routes/reset.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'MamaFarm Backend API', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reset-sales', resetRoutes);

connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MamaFarm Backend API Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to DB:', err);
});
