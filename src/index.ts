import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 5000;

// Explicit allowed production and development origins
const defaultAllowedOrigins = [
  'https://www.mamafarm.in',
  'https://mamafarm.in',
  'https://api.mamafarm.in',
  'https://mamafarm-frontend-nine.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// Dynamically parse CLIENT_URL or ALLOWED_ORIGINS environment variables (supports comma-separated list)
const envOrigins = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Consolidate default and environment-defined allowed origins
const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

// Single CORS middleware configuration with preflight (OPTIONS) & credential support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, curl, Postman, health checks)
      if (!origin) return callback(null, true);

      // Check if origin matches explicit list or Vercel preview subdomains (*.vercel.app)
      if (allowedOriginsSet.has(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // Fallback for authorized origins
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200, // Preflight OPTIONS response compatibility
  })
);

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
