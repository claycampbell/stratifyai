import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { Scenario, ScenarioKPIProjection } from '../types';

const router = Router();

// ============================================================
// SCENARIOS CRUD
// ============================================================

// GET all scenarios
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, scenario_type, sort_by = 'created_at', sort_order = 'desc' } = req.query;

    let query = 'SELECT * FROM scenarios WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (scenario_type) {
      query += ` AND scenario_type = $${paramCount}`;
      params.push(scenario_type);
      paramCount++;
    }

    // Add ordering
    const validSortColumns = ['created_at', 'updated_at', 'name', 'probability'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'created_at';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY is_baseline DESC, ${sortColumn} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// GET single scenario by ID (with projections)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get scenario
    const scenarioResult = await pool.query('SELECT * FROM scenarios WHERE id = $1', [id]);

    if (scenarioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Get KPI projections
    const projectionsResult = await pool.query(
      `SELECT sp.*, k.name as kpi_name, k.unit, k.current_value, k.target_value
       FROM scenario_kpi_projections sp
       JOIN kpis k ON sp.kpi_id = k.id
       WHERE sp.scenario_id = $1
       ORDER BY sp.projection_date ASC`,
      [id]
    );

    const scenario = {
      ...scenarioResult.rows[0],
      projections: projectionsResult.rows,
    };

    res.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

// GET baseline scenario
router.get('/baseline/current', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM scenarios WHERE is_baseline = true LIMIT 1');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No baseline scenario found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching baseline scenario:', error);
    res.status(500).json({ error: 'Failed to fetch baseline scenario' });
  }
});

// POST create new scenario
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      scenario_type = 'custom',
      assumptions,
      is_baseline = false,
      probability,
      status = 'draft',
      created_by,
      tags,
      metadata,
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // If setting as baseline, unset any existing baseline
    if (is_baseline) {
      await pool.query('UPDATE scenarios SET is_baseline = false WHERE is_baseline = true');
    }

    const result = await pool.query(
      `INSERT INTO scenarios (
        name, description, scenario_type, assumptions, is_baseline,
        probability, status, created_by, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        description || null,
        scenario_type,
        assumptions || null,
        is_baseline,
        probability || null,
        status,
        created_by || null,
        tags || null,
        metadata || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

// PUT update scenario
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      scenario_type,
      assumptions,
      is_baseline,
      probability,
      status,
      created_by,
      tags,
      metadata,
    } = req.body;

    // If setting as baseline, unset any existing baseline
    if (is_baseline === true) {
      await pool.query('UPDATE scenarios SET is_baseline = false WHERE is_baseline = true AND id != $1', [id]);
    }

    const result = await pool.query(
      `UPDATE scenarios SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        scenario_type = COALESCE($3, scenario_type),
        assumptions = COALESCE($4, assumptions),
        is_baseline = COALESCE($5, is_baseline),
        probability = COALESCE($6, probability),
        status = COALESCE($7, status),
        created_by = COALESCE($8, created_by),
        tags = COALESCE($9, tags),
        metadata = COALESCE($10, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [name, description, scenario_type, assumptions, is_baseline, probability, status, created_by, tags, metadata, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating scenario:', error);
    res.status(500).json({ error: 'Failed to update scenario' });
  }
});

// DELETE scenario
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM scenarios WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json({ message: 'Scenario deleted successfully', scenario: result.rows[0] });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// ============================================================
// SCENARIO KPI PROJECTIONS
// ============================================================

// GET projections for a scenario
router.get('/:scenarioId/projections', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const result = await pool.query(
      `SELECT sp.*, k.name as kpi_name, k.unit, k.current_value, k.target_value
       FROM scenario_kpi_projections sp
       JOIN kpis k ON sp.kpi_id = k.id
       WHERE sp.scenario_id = $1
       ORDER BY k.name, sp.projection_date ASC`,
      [scenarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projections:', error);
    res.status(500).json({ error: 'Failed to fetch projections' });
  }
});

// POST create or update projection
router.post('/:scenarioId/projections', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const { kpi_id, projected_value, projection_date, confidence_level, assumptions, notes } = req.body;

    if (!kpi_id || projected_value === undefined || !projection_date) {
      return res.status(400).json({ error: 'kpi_id, projected_value, and projection_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO scenario_kpi_projections (
        scenario_id, kpi_id, projected_value, projection_date, confidence_level, assumptions, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (scenario_id, kpi_id, projection_date) DO UPDATE
      SET projected_value = EXCLUDED.projected_value,
          confidence_level = EXCLUDED.confidence_level,
          assumptions = EXCLUDED.assumptions,
          notes = EXCLUDED.notes
      RETURNING *`,
      [scenarioId, kpi_id, projected_value, projection_date, confidence_level || null, assumptions || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating projection:', error);
    res.status(500).json({ error: 'Failed to create projection' });
  }
});

// DELETE projection
router.delete('/:scenarioId/projections/:projectionId', async (req: Request, res: Response) => {
  try {
    const { projectionId } = req.params;
    const result = await pool.query(
      'DELETE FROM scenario_kpi_projections WHERE id = $1 RETURNING *',
      [projectionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projection not found' });
    }

    res.json({ message: 'Projection deleted successfully' });
  } catch (error) {
    console.error('Error deleting projection:', error);
    res.status(500).json({ error: 'Failed to delete projection' });
  }
});

// ============================================================
// WHAT-IF ANALYSIS & COMPARISONS
// ============================================================

// POST compare scenarios
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { scenario_ids, kpi_ids } = req.body;

    if (!scenario_ids || !Array.isArray(scenario_ids) || scenario_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 scenario IDs are required for comparison' });
    }

    // Get scenarios
    const scenariosResult = await pool.query(
      'SELECT * FROM scenarios WHERE id = ANY($1::uuid[])',
      [scenario_ids]
    );

    // Get projections for these scenarios
    let projectionsQuery = `
      SELECT sp.*, k.name as kpi_name, k.unit, k.current_value, k.target_value
      FROM scenario_kpi_projections sp
      JOIN kpis k ON sp.kpi_id = k.id
      WHERE sp.scenario_id = ANY($1::uuid[])
    `;
    const projectionsParams: any[] = [scenario_ids];

    if (kpi_ids && Array.isArray(kpi_ids) && kpi_ids.length > 0) {
      projectionsQuery += ' AND sp.kpi_id = ANY($2::uuid[])';
      projectionsParams.push(kpi_ids);
    }

    projectionsQuery += ' ORDER BY k.name, sp.projection_date ASC';

    const projectionsResult = await pool.query(projectionsQuery, projectionsParams);

    // Group projections by scenario
    const comparisonData = scenariosResult.rows.map((scenario) => ({
      ...scenario,
      projections: projectionsResult.rows.filter((p) => p.scenario_id === scenario.id),
    }));

    res.json({
      scenarios: comparisonData,
      comparison_count: scenariosResult.rows.length,
    });
  } catch (error) {
    console.error('Error comparing scenarios:', error);
    res.status(500).json({ error: 'Failed to compare scenarios' });
  }
});

// POST run what-if analysis
router.post('/what-if', async (req: Request, res: Response) => {
  try {
    const { kpi_id, value_changes } = req.body;

    if (!kpi_id || !value_changes || !Array.isArray(value_changes)) {
      return res.status(400).json({
        error: 'kpi_id and value_changes array are required',
      });
    }

    // Get the KPI details
    const kpiResult = await pool.query('SELECT * FROM kpis WHERE id = $1', [kpi_id]);

    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    const kpi = kpiResult.rows[0];

    // Calculate impact for each value change
    const analysis = value_changes.map((change: any) => {
      const newValue = change.value;
      const currentValue = kpi.current_value || 0;
      const targetValue = kpi.target_value || 0;

      const changeAmount = newValue - currentValue;
      const changePercentage = currentValue !== 0 ? ((newValue - currentValue) / currentValue) * 100 : 0;

      // Calculate progress towards target
      let progressToTarget = 0;
      if (targetValue !== 0) {
        progressToTarget = (newValue / targetValue) * 100;
      }

      // Determine status based on thresholds
      let status = 'on_track';
      const atRiskThreshold = kpi.at_risk_threshold || 0.8;
      const offTrackThreshold = kpi.off_track_threshold || 0.6;

      if (targetValue !== 0) {
        const ratio = newValue / targetValue;
        if (ratio < offTrackThreshold) {
          status = 'off_track';
        } else if (ratio < atRiskThreshold) {
          status = 'at_risk';
        }
      }

      return {
        scenario: change.scenario_name || `Value: ${newValue}`,
        new_value: newValue,
        current_value: currentValue,
        target_value: targetValue,
        change_amount: changeAmount,
        change_percentage: changePercentage,
        progress_to_target: progressToTarget,
        projected_status: status,
      };
    });

    res.json({
      kpi: {
        id: kpi.id,
        name: kpi.name,
        unit: kpi.unit,
        current_value: kpi.current_value,
        target_value: kpi.target_value,
        current_status: kpi.status,
      },
      analysis,
    });
  } catch (error) {
    console.error('Error running what-if analysis:', error);
    res.status(500).json({ error: 'Failed to run what-if analysis' });
  }
});

export default router;
