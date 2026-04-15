import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: "ok", service: "HashBazaar Backend" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 HashBazaar backend running on http://localhost:${PORT}`);
  console.log(`🔔 Webhook endpoint: POST http://localhost:${PORT}/api/webhook/hashkey`);
});
