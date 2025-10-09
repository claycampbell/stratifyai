import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pool from './config/database';

// Import routes
import documentsRouter from './routes/documents';
import ogsmRouter from './routes/ogsm';
import kpisRouter from './routes/kpis';
import aiRouter from './routes/ai';
import dashboardRouter from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'OGSM Manager API',
  });
});

// API Routes
app.use('/api/documents', documentsRouter);
app.use('/api/ogsm', ogsmRouter);
app.use('/api/kpis', kpisRouter);
app.use('/api/ai', aiRouter);
app.use('/api/dashboard', dashboardRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI-Powered OGSM Management Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      documents: '/api/documents',
      ogsm: '/api/ogsm',
      kpis: '/api/kpis',
      ai: '/api/ai',
      dashboard: '/api/dashboard',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database initialization
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    // In production (dist), __dirname points to /app/dist
    // SQL file is at /app/src/database/init.sql
    const sqlPath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '../src/database/init.sql')
      : path.join(__dirname, 'database/init.sql');
    const initSQL = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(initSQL);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║  AI-Powered OGSM Management Platform - Backend API       ║
║  Server running on port ${PORT}                          ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
╚═══════════════════════════════════════════════════════════╝
      `);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Documentation: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();
