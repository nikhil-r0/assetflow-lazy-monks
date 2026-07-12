import express from 'express';
import cors from 'cors';
import { errorHandler } from './shared/errors.js';
import { prisma } from './prismaClient.js';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routes
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/assets', assetRoutes);
// ...

app.get('/api/v1/health', async (req, res, next) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: true });
  } catch (error) {
    res.status(500).json({ status: 'error', db: false });
  }
});

// Global error handler MUST be last
app.use(errorHandler);
