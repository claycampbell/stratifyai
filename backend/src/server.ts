import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pool from './config/database';

// Import routes
import authRouter from './routes/auth';
import documentsRouter from './routes/documents';
import ogsmRouter from './routes/ogsm';
import ogsmTemplatesRouter from './routes/ogsmTemplates';
import kpisRouter from './routes/kpis';
import kpiCategoriesRouter from './routes/kpiCategories';
import kpiEnhancementsRouter from './routes/kpiEnhancements';
import aiRouter from './routes/ai';
import aiStrategyRouter from './routes/aiStrategy';
import dashboardRouter from './routes/dashboard';

// Strategic Planning routes
import risksRouter from './routes/risks';
import initiativesRouter from './routes/initiatives';
import scenariosRouter from './routes/scenarios';
import budgetsRouter from './routes/budgets';
import resourcesRouter from './routes/resources';
import dependenciesRouter from './routes/dependencies';

// Staff Plans routes
import staffPlansRouter from './routes/staffPlans';
import planItemsRouter from './routes/planItems';
import planLinksRouter from './routes/planLinks';

// Philosophy routes
import philosophyRouter from './routes/philosophy';

// Admin routes
import adminRouter from './routes/admin';
import usersRouter from './routes/users';

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
app.use('/api/auth', authRouter); // Public auth routes
app.use('/api/documents', documentsRouter);
app.use('/api/ogsm', ogsmRouter);
app.use('/api/ogsm-templates', ogsmTemplatesRouter);
app.use('/api/kpis', kpisRouter);
app.use('/api/kpi-categories', kpiCategoriesRouter);
app.use('/api/kpi-enhancements', kpiEnhancementsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai-strategy', aiStrategyRouter);
app.use('/api/dashboard', dashboardRouter);

// Strategic Planning API Routes
app.use('/api/risks', risksRouter);
app.use('/api/initiatives', initiativesRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/dependencies', dependenciesRouter);

// Staff Plans API Routes
app.use('/api/staff-plans', staffPlansRouter);
app.use('/api/plan-items', planItemsRouter);
app.use('/api/plan-links', planLinksRouter);

// Philosophy API Routes
app.use('/api/philosophy', philosophyRouter);

// Admin API Routes
app.use('/api/admin', adminRouter);
app.use('/api/users', usersRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI-Powered OGSM Management Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      documents: '/api/documents',
      ogsm: '/api/ogsm',
      ogsm_templates: '/api/ogsm-templates',
      kpis: '/api/kpis',
      kpi_enhancements: '/api/kpi-enhancements',
      ai: '/api/ai',
      ai_strategy: '/api/ai-strategy',
      dashboard: '/api/dashboard',
      // Strategic Planning
      risks: '/api/risks',
      initiatives: '/api/initiatives',
      scenarios: '/api/scenarios',
      budgets: '/api/budgets',
      resources: '/api/resources',
      dependencies: '/api/dependencies',
      // Staff Plans
      staff_plans: '/api/staff-plans',
      plan_items: '/api/plan-items',
      plan_links: '/api/plan-links',
      // Philosophy
      philosophy: '/api/philosophy',
      // Admin
      admin: '/api/admin',
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
    console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    // Test connection first with timeout
    const testQuery = await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
    ]);
    console.log('Database connection test successful');

    // In production (dist), __dirname points to /app/dist
    // SQL file is at /app/src/database/init.sql
    const dbPath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '../src/database')
      : path.join(__dirname, 'database');

    // Run init.sql first
    const initSqlPath = path.join(dbPath, 'init.sql');
    const initSQL = fs.readFileSync(initSqlPath, 'utf-8');
    await pool.query(initSQL);
    console.log('Database schema initialized successfully');

    // Run migrations in order
    const migrationsPath = path.join(dbPath, 'migrations');
    if (fs.existsSync(migrationsPath)) {
      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
        .sort();

      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const migrationSQL = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
        await pool.query(migrationSQL);
        console.log(`Migration ${file} completed`);
      }
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error('Database connection details:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      ssl: process.env.DB_HOST?.includes('azure') ? 'enabled' : 'disabled'
    });
    // Don't throw - let the app start anyway so we can see logs
    console.warn('WARNING: Database initialization failed. App will start but database operations will fail.');
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

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  startServer();
}

// Export app for testing
export default app;
