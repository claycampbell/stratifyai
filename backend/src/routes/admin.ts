import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';

const router = express.Router();

// Check database table status
router.get('/db-status', async (req: Request, res: Response) => {
  try {
    // Get list of all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(row => row.table_name);

    // Check for strategic planning tables specifically
    const strategicTables = [
      'risks',
      'initiatives',
      'initiative_milestones',
      'initiative_kpis',
      'scenarios',
      'scenario_kpi_projections',
      'budgets',
      'budget_transactions',
      'resources',
      'resource_allocations',
      'dependencies'
    ];

    const missingTables = strategicTables.filter(table => !tables.includes(table));
    const existingStrategicTables = strategicTables.filter(table => tables.includes(table));

    res.json({
      success: true,
      totalTables: tables.length,
      allTables: tables,
      strategicPlanningTables: {
        expected: strategicTables.length,
        existing: existingStrategicTables,
        missing: missingTables,
        allPresent: missingTables.length === 0
      }
    });
  } catch (error: any) {
    console.error('Error checking database status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run strategic planning tables migration
router.post('/migrate-strategic-tables', async (req: Request, res: Response) => {
  try {
    console.log('Starting strategic planning tables migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../create-strategic-tables.sql');

    if (!fs.existsSync(migrationPath)) {
      return res.status(404).json({
        success: false,
        error: 'Migration file not found at: ' + migrationPath
      });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log('Migration SQL file loaded, executing...');

    // Execute the migration
    await pool.query(migrationSQL);
    console.log('Migration executed successfully');

    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('risks', 'initiatives', 'scenarios', 'budgets', 'resources', 'dependencies')
      ORDER BY table_name
    `);

    const createdTables = tablesResult.rows.map(row => row.table_name);

    res.json({
      success: true,
      message: 'Strategic planning tables migration completed',
      tablesCreated: createdTables,
      count: createdTables.length
    });
  } catch (error: any) {
    console.error('Error running migration:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || error.stack
    });
  }
});

// Re-run full database initialization
router.post('/reinitialize-db', async (req: Request, res: Response) => {
  try {
    console.log('Re-running full database initialization...');

    // Read the init.sql file
    const initPath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '../../src/database/init.sql')
      : path.join(__dirname, '../database/init.sql');

    console.log('Looking for init.sql at:', initPath);

    if (!fs.existsSync(initPath)) {
      return res.status(404).json({
        success: false,
        error: 'Init SQL file not found at: ' + initPath,
        searchedPaths: [
          initPath,
          path.join(__dirname, '../../src/database/init.sql'),
          path.join(__dirname, '../database/init.sql')
        ]
      });
    }

    const initSQL = fs.readFileSync(initPath, 'utf-8');
    console.log('Init SQL file loaded, size:', initSQL.length, 'bytes');

    // Execute the initialization
    await pool.query(initSQL);
    console.log('Database initialization completed successfully');

    // Get table count
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    res.json({
      success: true,
      message: 'Database reinitialization completed',
      totalTables: parseInt(tablesResult.rows[0].count),
      initFilePath: initPath
    });
  } catch (error: any) {
    console.error('Error reinitializing database:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || error.stack
    });
  }
});

export default router;
