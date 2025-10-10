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

// Run strategic planning tables migration (direct SQL approach)
router.post('/create-strategic-tables', async (req: Request, res: Response) => {
  try {
    console.log('Creating strategic planning tables directly...');

    // Execute each CREATE TABLE statement directly
    const tables = [
      {
        name: 'risks',
        sql: `CREATE TABLE IF NOT EXISTS risks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          likelihood VARCHAR(20) NOT NULL,
          impact VARCHAR(20) NOT NULL,
          risk_score DECIMAL GENERATED ALWAYS AS (
            CASE likelihood
              WHEN 'very_low' THEN 1
              WHEN 'low' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'high' THEN 4
              WHEN 'very_high' THEN 5
            END *
            CASE impact
              WHEN 'very_low' THEN 1
              WHEN 'low' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'high' THEN 4
              WHEN 'very_high' THEN 5
            END
          ) STORED,
          status VARCHAR(50) DEFAULT 'identified',
          mitigation_strategy TEXT,
          contingency_plan TEXT,
          owner_email VARCHAR(255),
          review_date DATE,
          residual_likelihood VARCHAR(20),
          residual_impact VARCHAR(20),
          tags VARCHAR(255)[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'initiatives',
        sql: `CREATE TABLE IF NOT EXISTS initiatives (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          objective TEXT,
          status VARCHAR(50) DEFAULT 'planning',
          priority VARCHAR(20) DEFAULT 'medium',
          start_date DATE,
          target_end_date DATE,
          actual_end_date DATE,
          completion_percentage DECIMAL DEFAULT 0,
          budget_allocated DECIMAL,
          budget_spent DECIMAL DEFAULT 0,
          owner_email VARCHAR(255),
          team_members VARCHAR(255)[],
          expected_benefits TEXT,
          success_criteria TEXT,
          dependencies TEXT,
          risks TEXT,
          tags VARCHAR(255)[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'initiative_milestones',
        sql: `CREATE TABLE IF NOT EXISTS initiative_milestones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          target_date DATE NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          completed_date DATE,
          deliverables TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'initiative_kpis',
        sql: `CREATE TABLE IF NOT EXISTS initiative_kpis (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
          kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
          target_impact_description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(initiative_id, kpi_id)
        )`
      },
      {
        name: 'scenarios',
        sql: `CREATE TABLE IF NOT EXISTS scenarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          scenario_type VARCHAR(50) DEFAULT 'custom',
          assumptions TEXT,
          is_baseline BOOLEAN DEFAULT FALSE,
          probability DECIMAL,
          status VARCHAR(50) DEFAULT 'draft',
          created_by VARCHAR(255),
          tags VARCHAR(255)[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'scenario_kpi_projections',
        sql: `CREATE TABLE IF NOT EXISTS scenario_kpi_projections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
          kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
          projected_value DECIMAL NOT NULL,
          projection_date DATE NOT NULL,
          confidence_level VARCHAR(20),
          assumptions TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(scenario_id, kpi_id, projection_date)
        )`
      },
      {
        name: 'budgets',
        sql: `CREATE TABLE IF NOT EXISTS budgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ogsm_component_id UUID REFERENCES ogsm_components(id) ON DELETE SET NULL,
          initiative_id UUID REFERENCES initiatives(id) ON DELETE SET NULL,
          budget_name VARCHAR(255) NOT NULL,
          description TEXT,
          budget_type VARCHAR(50) DEFAULT 'project',
          fiscal_year INTEGER,
          fiscal_quarter INTEGER,
          allocated_amount DECIMAL NOT NULL,
          spent_amount DECIMAL DEFAULT 0,
          committed_amount DECIMAL DEFAULT 0,
          remaining_amount DECIMAL GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
          variance_amount DECIMAL GENERATED ALWAYS AS (spent_amount + committed_amount - allocated_amount) STORED,
          variance_percentage DECIMAL GENERATED ALWAYS AS (
            CASE
              WHEN allocated_amount = 0 THEN 0
              ELSE ((spent_amount + committed_amount - allocated_amount) / allocated_amount) * 100
            END
          ) STORED,
          status VARCHAR(50) DEFAULT 'active',
          owner_email VARCHAR(255),
          approval_required BOOLEAN DEFAULT TRUE,
          approved_by VARCHAR(255),
          approved_at TIMESTAMP,
          tags VARCHAR(255)[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'budget_transactions',
        sql: `CREATE TABLE IF NOT EXISTS budget_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
          transaction_type VARCHAR(50) NOT NULL,
          amount DECIMAL NOT NULL,
          transaction_date DATE NOT NULL,
          description TEXT,
          category VARCHAR(100),
          reference_number VARCHAR(100),
          approved_by VARCHAR(255),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'resources',
        sql: `CREATE TABLE IF NOT EXISTS resources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          resource_name VARCHAR(255) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          description TEXT,
          department VARCHAR(100),
          email VARCHAR(255),
          skills VARCHAR(255)[],
          capacity_hours_per_week DECIMAL,
          cost_per_hour DECIMAL,
          availability_status VARCHAR(50) DEFAULT 'available',
          total_allocation_percentage DECIMAL DEFAULT 0,
          location VARCHAR(255),
          tags VARCHAR(255)[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'resource_allocations',
        sql: `CREATE TABLE IF NOT EXISTS resource_allocations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
          initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
          allocation_percentage DECIMAL NOT NULL,
          hours_per_week DECIMAL,
          start_date DATE NOT NULL,
          end_date DATE,
          role VARCHAR(100),
          notes TEXT,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT check_allocation_percentage CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
        )`
      },
      {
        name: 'dependencies',
        sql: `CREATE TABLE IF NOT EXISTS dependencies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_type VARCHAR(50) NOT NULL,
          source_id UUID NOT NULL,
          target_type VARCHAR(50) NOT NULL,
          target_id UUID NOT NULL,
          dependency_type VARCHAR(50) DEFAULT 'depends_on',
          description TEXT,
          strength VARCHAR(20),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(source_type, source_id, target_type, target_id, dependency_type)
        )`
      }
    ];

    const createdTables = [];
    for (const table of tables) {
      await pool.query(table.sql);
      createdTables.push(table.name);
      console.log(`Created table: ${table.name}`);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status)',
      'CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner_email)',
      'CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category)',
      'CREATE INDEX IF NOT EXISTS idx_risks_score ON risks(risk_score DESC)',
      'CREATE INDEX IF NOT EXISTS idx_risks_ogsm ON risks(ogsm_component_id)',
      'CREATE INDEX IF NOT EXISTS idx_risks_tags ON risks USING GIN(tags)',
      'CREATE INDEX IF NOT EXISTS idx_initiatives_status ON initiatives(status)',
      'CREATE INDEX IF NOT EXISTS idx_initiatives_owner ON initiatives(owner_email)',
      'CREATE INDEX IF NOT EXISTS idx_initiatives_priority ON initiatives(priority)',
      'CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, target_end_date)',
      'CREATE INDEX IF NOT EXISTS idx_initiatives_ogsm ON initiatives(ogsm_component_id)',
      'CREATE INDEX IF NOT EXISTS idx_initiatives_tags ON initiatives USING GIN(tags)',
      'CREATE INDEX IF NOT EXISTS idx_initiative_milestones_initiative ON initiative_milestones(initiative_id, target_date)',
      'CREATE INDEX IF NOT EXISTS idx_initiative_kpis_initiative ON initiative_kpis(initiative_id)',
      'CREATE INDEX IF NOT EXISTS idx_initiative_kpis_kpi ON initiative_kpis(kpi_id)',
      'CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status)',
      'CREATE INDEX IF NOT EXISTS idx_scenarios_type ON scenarios(scenario_type)',
      'CREATE INDEX IF NOT EXISTS idx_scenarios_baseline ON scenarios(is_baseline)',
      'CREATE INDEX IF NOT EXISTS idx_scenario_projections_scenario ON scenario_kpi_projections(scenario_id)',
      'CREATE INDEX IF NOT EXISTS idx_scenario_projections_kpi ON scenario_kpi_projections(kpi_id)',
      'CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status)',
      'CREATE INDEX IF NOT EXISTS idx_budgets_owner ON budgets(owner_email)',
      'CREATE INDEX IF NOT EXISTS idx_budgets_fiscal ON budgets(fiscal_year, fiscal_quarter)',
      'CREATE INDEX IF NOT EXISTS idx_budgets_ogsm ON budgets(ogsm_component_id)',
      'CREATE INDEX IF NOT EXISTS idx_budgets_initiative ON budgets(initiative_id)',
      'CREATE INDEX IF NOT EXISTS idx_budget_transactions_budget ON budget_transactions(budget_id, transaction_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type)',
      'CREATE INDEX IF NOT EXISTS idx_resources_availability ON resources(availability_status)',
      'CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags)',
      'CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource ON resource_allocations(resource_id)',
      'CREATE INDEX IF NOT EXISTS idx_resource_allocations_initiative ON resource_allocations(initiative_id)',
      'CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON resource_allocations(start_date, end_date)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_type, source_id)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_type, target_id)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_type ON dependencies(dependency_type)'
    ];

    for (const indexSql of indexes) {
      await pool.query(indexSql);
    }
    console.log('Created all indexes');

    res.json({
      success: true,
      message: 'Strategic planning tables created successfully',
      tables: createdTables,
      indexCount: indexes.length
    });
  } catch (error: any) {
    console.error('Error creating strategic tables:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || error.stack
    });
  }
});

// Run strategic planning tables migration (file-based approach)
router.post('/migrate-strategic-tables', async (req: Request, res: Response) => {
  try {
    console.log('Starting strategic planning tables migration...');

    // Read the migration SQL file
    // In production: /app/create-strategic-tables.sql
    // In development: backend/create-strategic-tables.sql
    const migrationPath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '../../create-strategic-tables.sql')
      : path.join(__dirname, '../../create-strategic-tables.sql');

    console.log('Looking for migration file at:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      return res.status(404).json({
        success: false,
        error: 'Migration file not found at: ' + migrationPath,
        __dirname: __dirname,
        cwd: process.cwd()
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
