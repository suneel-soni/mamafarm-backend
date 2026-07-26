# MamaFarm Backend API

Node.js + Express + Mongoose REST API server for MamaFarm Organic Sprouts Business Tracker.

## Prerequisites
- Node.js v18+
- npm or yarn

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://suneelsoni4u_db:MuniyA7264@tracker.dbbwb2b.mongodb.net/mamafarm?retryWrites=true&w=majority&appName=tracker
   JWT_SECRET=mamafarm_secret_key_2026
   CLIENT_URL=http://localhost:3000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The API server will run at `http://localhost:5000`.

## API Endpoints

- `GET /health` - Health check
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user details
- `GET /api/shops` - List active shops
- `POST /api/shops` - Create shop
- `GET /api/deliveries` - List deliveries
- `POST /api/deliveries` - Create delivery dispatch
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/materials` - List materials
- `GET /api/suppliers` - List suppliers
- `GET /api/expenses` - List expenses
- `GET /api/inventory` - Stock valuation & low stock alerts
- `GET /api/dashboard` - Dashboard KPI summary
- `GET /api/dashboard/sales` - Sales analytics & trajectory
- `GET /api/reports` - Business profit & loss report
- `POST /api/reset-sales` - Reset sales test data

## Deployment (Render / Railway)
Set the environment variables in your Render / Railway dashboard and set the build / start commands:
- Build Command: `npm run build`
- Start Command: `npm start`
