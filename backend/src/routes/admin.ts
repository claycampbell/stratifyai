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

// Seed test data for strategic planning tools
router.post('/seed-strategic-data', async (req: Request, res: Response) => {
  try {
    console.log('Seeding strategic planning test data...');
    const createdItems: any = {
      risks: [],
      initiatives: [],
      scenarios: [],
      budgets: [],
      resources: [],
      dependencies: []
    };

    // Get existing OGSM components and KPIs to link to
    const ogsmResult = await pool.query('SELECT id, component_type, title FROM ogsm_components LIMIT 5');
    const kpisResult = await pool.query('SELECT id, name FROM kpis LIMIT 5');

    const ogsmComponents = ogsmResult.rows;
    const kpis = kpisResult.rows;

    // 1. Create Risks
    const risks = [
      {
        title: 'Budget Constraints Impact Athletic Programs',
        description: 'Reduced funding may limit recruitment and facility improvements',
        category: 'financial',
        likelihood: 'high',
        impact: 'high',
        status: 'mitigating',
        mitigation_strategy: 'Diversify revenue streams through sponsorships and alumni donations',
        owner_email: 'athletics.director@rmu.edu'
      },
      {
        title: 'Key Coaching Staff Retention Risk',
        description: 'Competition from larger programs may attract top coaches',
        category: 'operational',
        likelihood: 'medium',
        impact: 'very_high',
        status: 'monitoring',
        mitigation_strategy: 'Competitive compensation packages and career development opportunities',
        owner_email: 'hr.athletics@rmu.edu'
      },
      {
        title: 'NCAA Compliance Changes',
        description: 'New regulations may require operational adjustments',
        category: 'compliance',
        likelihood: 'medium',
        impact: 'medium',
        status: 'assessing',
        mitigation_strategy: 'Dedicated compliance team and regular policy reviews',
        owner_email: 'compliance@rmu.edu'
      },
      {
        title: 'Student-Athlete Academic Performance',
        description: 'Risk of not meeting academic progress requirements',
        category: 'reputational',
        likelihood: 'low',
        impact: 'high',
        status: 'monitoring',
        mitigation_strategy: 'Enhanced tutoring programs and academic support services',
        owner_email: 'academic.services@rmu.edu'
      },
      {
        title: 'Facility Infrastructure Aging',
        description: 'Aging athletic facilities may affect recruitment and safety',
        category: 'operational',
        likelihood: 'high',
        impact: 'medium',
        status: 'identified',
        mitigation_strategy: 'Phased renovation plan with capital campaign',
        owner_email: 'facilities@rmu.edu'
      }
    ];

    for (const risk of risks) {
      const result = await pool.query(
        `INSERT INTO risks (ogsm_component_id, title, description, category, likelihood, impact, status, mitigation_strategy, owner_email, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, title`,
        [
          ogsmComponents[0]?.id || null,
          risk.title,
          risk.description,
          risk.category,
          risk.likelihood,
          risk.impact,
          risk.status,
          risk.mitigation_strategy,
          risk.owner_email,
          ['athletics', 'strategic']
        ]
      );
      createdItems.risks.push(result.rows[0]);
    }

    // 2. Create Initiatives
    const initiatives = [
      {
        title: 'Athlete Mental Health & Wellness Program',
        description: 'Comprehensive mental health support program for all student-athletes',
        objective: 'Improve student-athlete wellbeing and retention rates',
        status: 'in_progress',
        priority: 'high',
        start_date: '2025-01-01',
        target_end_date: '2025-12-31',
        completion_percentage: 35,
        budget_allocated: 150000,
        budget_spent: 45000,
        owner_email: 'wellness@rmu.edu',
        expected_benefits: 'Reduced athlete burnout, improved academic performance, higher retention',
        success_criteria: '90% athlete satisfaction, 15% reduction in withdrawals'
      },
      {
        title: 'Athletic Facilities Modernization Phase 1',
        description: 'Upgrade training facilities and locker rooms',
        objective: 'Enhance recruitment competitiveness and athlete experience',
        status: 'approved',
        priority: 'critical',
        start_date: '2025-06-01',
        target_end_date: '2026-05-31',
        completion_percentage: 10,
        budget_allocated: 2500000,
        budget_spent: 250000,
        owner_email: 'facilities@rmu.edu',
        expected_benefits: 'Improved recruitment, enhanced athlete performance, modernized infrastructure',
        success_criteria: 'Complete renovation on time and under budget'
      },
      {
        title: 'Digital Athletic Performance Platform',
        description: 'Implement data analytics platform for performance tracking',
        objective: 'Leverage data to optimize athletic performance',
        status: 'planning',
        priority: 'medium',
        start_date: '2025-08-01',
        target_end_date: '2025-12-31',
        completion_percentage: 5,
        budget_allocated: 75000,
        budget_spent: 0,
        owner_email: 'performance@rmu.edu',
        expected_benefits: 'Data-driven coaching decisions, injury prevention, performance optimization',
        success_criteria: 'Platform adoption by 80% of coaching staff'
      },
      {
        title: 'Alumni Engagement & Fundraising Campaign',
        description: 'Launch comprehensive alumni fundraising initiative',
        objective: 'Increase athletic department revenue through alumni contributions',
        status: 'in_progress',
        priority: 'high',
        start_date: '2025-02-01',
        target_end_date: '2025-11-30',
        completion_percentage: 50,
        budget_allocated: 100000,
        budget_spent: 55000,
        owner_email: 'development@rmu.edu',
        expected_benefits: 'Sustainable funding, enhanced alumni network, scholarship opportunities',
        success_criteria: 'Raise $1M in commitments, 500+ new donors'
      }
    ];

    for (const initiative of initiatives) {
      const result = await pool.query(
        `INSERT INTO initiatives (ogsm_component_id, title, description, objective, status, priority, start_date, target_end_date,
         completion_percentage, budget_allocated, budget_spent, owner_email, expected_benefits, success_criteria, tags, team_members)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id, title`,
        [
          ogsmComponents[1]?.id || null,
          initiative.title,
          initiative.description,
          initiative.objective,
          initiative.status,
          initiative.priority,
          initiative.start_date,
          initiative.target_end_date,
          initiative.completion_percentage,
          initiative.budget_allocated,
          initiative.budget_spent,
          initiative.owner_email,
          initiative.expected_benefits,
          initiative.success_criteria,
          ['athletics', 'strategic', '2025'],
          [initiative.owner_email, 'athletics.director@rmu.edu']
        ]
      );
      createdItems.initiatives.push(result.rows[0]);

      // Add milestones for first initiative
      if (createdItems.initiatives.length === 1) {
        await pool.query(
          `INSERT INTO initiative_milestones (initiative_id, title, description, target_date, completed)
           VALUES
           ($1, 'Hire Mental Health Coordinator', 'Recruit and onboard dedicated mental health professional', '2025-02-15', true),
           ($1, 'Launch Peer Support Program', 'Train and deploy peer support network', '2025-04-01', true),
           ($1, 'Implement Wellness Workshops', 'Monthly wellness sessions for all athletes', '2025-06-01', false),
           ($1, 'Program Evaluation & Reporting', 'Assess program effectiveness and outcomes', '2025-12-15', false)`,
          [result.rows[0].id]
        );

        // Link to KPIs
        if (kpis.length > 0) {
          await pool.query(
            `INSERT INTO initiative_kpis (initiative_id, kpi_id, target_impact_description)
             VALUES ($1, $2, 'Expected to improve student-athlete retention by 15%')`,
            [result.rows[0].id, kpis[0].id]
          );
        }
      }
    }

    // 3. Create Scenarios
    const scenarios = [
      {
        name: 'Best Case: Increased Conference Revenue',
        description: 'Conference TV deal provides 30% revenue increase',
        scenario_type: 'best_case',
        assumptions: 'New media rights deal, increased sponsorships, successful fundraising',
        probability: 0.25,
        status: 'active',
        is_baseline: false
      },
      {
        name: 'Baseline: Current Trajectory',
        description: 'Steady state operations with 3% annual growth',
        scenario_type: 'most_likely',
        assumptions: 'Moderate enrollment, stable funding, consistent performance',
        probability: 0.50,
        status: 'active',
        is_baseline: true
      },
      {
        name: 'Worst Case: Budget Cuts',
        description: 'University-wide budget reduction impacts athletics by 20%',
        scenario_type: 'worst_case',
        assumptions: 'Economic downturn, reduced enrollment, decreased state funding',
        probability: 0.25,
        status: 'active',
        is_baseline: false
      }
    ];

    for (const scenario of scenarios) {
      const result = await pool.query(
        `INSERT INTO scenarios (name, description, scenario_type, assumptions, probability, status, is_baseline, created_by, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name`,
        [
          scenario.name,
          scenario.description,
          scenario.scenario_type,
          scenario.assumptions,
          scenario.probability,
          scenario.status,
          scenario.is_baseline,
          'athletics.director@rmu.edu',
          ['athletics', 'planning', '2025']
        ]
      );
      createdItems.scenarios.push(result.rows[0]);

      // Add KPI projections if we have KPIs
      if (kpis.length > 0) {
        const baseValue = 100;
        const multiplier = scenario.scenario_type === 'best_case' ? 1.3 :
                          scenario.scenario_type === 'worst_case' ? 0.8 : 1.0;

        await pool.query(
          `INSERT INTO scenario_kpi_projections (scenario_id, kpi_id, projected_value, projection_date, confidence_level, assumptions)
           VALUES ($1, $2, $3, '2025-12-31', $4, $5)`,
          [
            result.rows[0].id,
            kpis[0].id,
            baseValue * multiplier,
            scenario.scenario_type === 'most_likely' ? 'high' : 'medium',
            scenario.assumptions
          ]
        );
      }
    }

    // 4. Create Budgets
    const budgets = [
      {
        budget_name: 'FY2025 Athletic Operations Budget',
        description: 'Primary operating budget for all athletic programs',
        budget_type: 'operational',
        fiscal_year: 2025,
        fiscal_quarter: null,
        allocated_amount: 8500000,
        spent_amount: 2800000,
        committed_amount: 1200000,
        owner_email: 'finance.athletics@rmu.edu'
      },
      {
        budget_name: 'Facilities Renovation Capital Budget',
        description: 'Capital budget for facility improvements',
        budget_type: 'capital',
        fiscal_year: 2025,
        fiscal_quarter: null,
        allocated_amount: 2500000,
        spent_amount: 250000,
        committed_amount: 800000,
        owner_email: 'facilities@rmu.edu'
      },
      {
        budget_name: 'Q3 2025 Recruitment & Marketing',
        description: 'Quarterly budget for recruitment and promotional activities',
        budget_type: 'discretionary',
        fiscal_year: 2025,
        fiscal_quarter: 3,
        allocated_amount: 150000,
        spent_amount: 45000,
        committed_amount: 25000,
        owner_email: 'marketing.athletics@rmu.edu'
      }
    ];

    for (const budget of budgets) {
      const result = await pool.query(
        `INSERT INTO budgets (initiative_id, budget_name, description, budget_type, fiscal_year, fiscal_quarter,
         allocated_amount, spent_amount, committed_amount, owner_email, status, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11) RETURNING id, budget_name`,
        [
          createdItems.initiatives[1]?.id || null,
          budget.budget_name,
          budget.description,
          budget.budget_type,
          budget.fiscal_year,
          budget.fiscal_quarter,
          budget.allocated_amount,
          budget.spent_amount,
          budget.committed_amount,
          budget.owner_email,
          ['athletics', 'finance', 'fy2025']
        ]
      );
      createdItems.budgets.push(result.rows[0]);

      // Add sample transactions
      await pool.query(
        `INSERT INTO budget_transactions (budget_id, transaction_type, amount, transaction_date, description, category, approved_by)
         VALUES
         ($1, 'expenditure', -50000, '2025-01-15', 'Equipment purchases', 'Equipment', 'finance.director@rmu.edu'),
         ($1, 'expenditure', -35000, '2025-02-10', 'Travel expenses', 'Travel', 'finance.director@rmu.edu'),
         ($1, 'commitment', -25000, '2025-03-01', 'Contracted services', 'Services', 'finance.director@rmu.edu')`,
        [result.rows[0].id]
      );
    }

    // 5. Create Resources
    const resources = [
      {
        resource_name: 'Dr. Sarah Mitchell - Sports Psychologist',
        resource_type: 'human',
        description: 'Licensed sports psychologist specializing in athlete mental health',
        department: 'Athletic Performance',
        email: 's.mitchell@rmu.edu',
        skills: ['Sports Psychology', 'Counseling', 'Performance Coaching'],
        capacity_hours_per_week: 40,
        cost_per_hour: 75,
        availability_status: 'partially_allocated'
      },
      {
        resource_name: 'John Davis - Strength & Conditioning Coach',
        resource_type: 'human',
        description: 'Head strength and conditioning coordinator',
        department: 'Athletic Performance',
        email: 'j.davis@rmu.edu',
        skills: ['Strength Training', 'Injury Prevention', 'Athletic Performance'],
        capacity_hours_per_week: 40,
        cost_per_hour: 60,
        availability_status: 'fully_allocated'
      },
      {
        resource_name: 'Athletic Training Facility',
        resource_type: 'facility',
        description: 'Main athletic training and conditioning facility',
        department: 'Facilities',
        capacity_hours_per_week: 168,
        cost_per_hour: 0,
        availability_status: 'available'
      },
      {
        resource_name: 'Hudl Performance Analysis Software',
        resource_type: 'software',
        description: 'Video analysis and performance tracking platform',
        department: 'Technology',
        cost_per_hour: 5,
        availability_status: 'available'
      }
    ];

    for (const resource of resources) {
      const result = await pool.query(
        `INSERT INTO resources (resource_name, resource_type, description, department, email, skills,
         capacity_hours_per_week, cost_per_hour, availability_status, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, resource_name`,
        [
          resource.resource_name,
          resource.resource_type,
          resource.description,
          resource.department,
          resource.email || null,
          resource.skills || null,
          resource.capacity_hours_per_week || null,
          resource.cost_per_hour || null,
          resource.availability_status,
          ['athletics', 'active']
        ]
      );
      createdItems.resources.push(result.rows[0]);

      // Add allocations for human resources
      if (resource.resource_type === 'human' && createdItems.initiatives.length > 0) {
        const allocation = resource.resource_name.includes('Mitchell') ? 60 : 100;
        await pool.query(
          `INSERT INTO resource_allocations (resource_id, initiative_id, allocation_percentage, start_date, end_date, role, status)
           VALUES ($1, $2, $3, '2025-01-01', '2025-12-31', $4, 'active')`,
          [
            result.rows[0].id,
            createdItems.initiatives[0].id,
            allocation,
            resource.resource_type === 'human' ? 'Program Lead' : 'Support Resource'
          ]
        );
      }
    }

    // 6. Create Dependencies
    if (createdItems.initiatives.length >= 2) {
      const depResult = await pool.query(
        `INSERT INTO dependencies (source_type, source_id, target_type, target_id, dependency_type, description, strength, status)
         VALUES
         ('initiative', $1, 'initiative', $2, 'depends_on', 'Mental health program depends on facilities being ready', 'medium', 'active'),
         ('initiative', $2, 'initiative', $3, 'blocks', 'Facility work blocks digital platform installation', 'strong', 'active')
         RETURNING id`,
        [
          createdItems.initiatives[0].id,
          createdItems.initiatives[1].id,
          createdItems.initiatives[2]?.id || createdItems.initiatives[0].id
        ]
      );
      createdItems.dependencies = depResult.rows;
    }

    res.json({
      success: true,
      message: 'Strategic planning test data created successfully',
      created: {
        risks: createdItems.risks.length,
        initiatives: createdItems.initiatives.length,
        scenarios: createdItems.scenarios.length,
        budgets: createdItems.budgets.length,
        resources: createdItems.resources.length,
        dependencies: createdItems.dependencies.length
      },
      details: createdItems
    });
  } catch (error: any) {
    console.error('Error seeding strategic data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      detail: error.detail || error.stack
    });
  }
});

export default router;
