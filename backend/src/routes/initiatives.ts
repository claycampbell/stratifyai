import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { Initiative, InitiativeMilestone, InitiativeKPI } from '../types';

const router = Router();

// ============================================================
// INITIATIVES CRUD
// ============================================================

// GET all initiatives
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority, owner_email, sort_by = 'created_at', sort_order = 'desc' } = req.query;

    let query = 'SELECT * FROM initiatives WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (owner_email) {
      query += ` AND owner_email = $${paramCount}`;
      params.push(owner_email);
      paramCount++;
    }

    // Add ordering
    const validSortColumns = ['created_at', 'updated_at', 'start_date', 'target_end_date', 'completion_percentage', 'priority'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'created_at';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    res.status(500).json({ error: 'Failed to fetch initiatives' });
  }
});

// GET single initiative by ID (with milestones and linked KPIs)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get initiative
    const initiativeResult = await pool.query('SELECT * FROM initiatives WHERE id = $1', [id]);

    if (initiativeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Initiative not found' });
    }

    // Get milestones
    const milestonesResult = await pool.query(
      'SELECT * FROM initiative_milestones WHERE initiative_id = $1 ORDER BY target_date ASC',
      [id]
    );

    // Get linked KPIs
    const kpisResult = await pool.query(
      `SELECT ik.*, k.name, k.current_value, k.target_value, k.unit, k.status
       FROM initiative_kpis ik
       JOIN kpis k ON ik.kpi_id = k.id
       WHERE ik.initiative_id = $1`,
      [id]
    );

    const initiative = {
      ...initiativeResult.rows[0],
      milestones: milestonesResult.rows,
      linked_kpis: kpisResult.rows,
    };

    res.json(initiative);
  } catch (error) {
    console.error('Error fetching initiative:', error);
    res.status(500).json({ error: 'Failed to fetch initiative' });
  }
});

// GET initiatives by OGSM component
router.get('/ogsm/:ogsmId', async (req: Request, res: Response) => {
  try {
    const { ogsmId } = req.params;
    const result = await pool.query(
      'SELECT * FROM initiatives WHERE ogsm_component_id = $1 ORDER BY start_date DESC',
      [ogsmId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching initiatives for OGSM component:', error);
    res.status(500).json({ error: 'Failed to fetch initiatives' });
  }
});

// GET initiative statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_initiatives,
        COUNT(*) FILTER (WHERE status = 'planning') as planning_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        AVG(completion_percentage) FILTER (WHERE status IN ('in_progress', 'on_hold')) as avg_completion,
        SUM(budget_allocated) as total_budget_allocated,
        SUM(budget_spent) as total_budget_spent,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE priority = 'high') as high_count
      FROM initiatives
    `;

    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching initiative statistics:', error);
    res.status(500).json({ error: 'Failed to fetch initiative statistics' });
  }
});

// POST create new initiative
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      ogsm_component_id,
      title,
      description,
      objective,
      status = 'planning',
      priority = 'medium',
      start_date,
      target_end_date,
      actual_end_date,
      completion_percentage = 0,
      budget_allocated,
      budget_spent = 0,
      owner_email,
      team_members,
      expected_benefits,
      success_criteria,
      dependencies,
      risks,
      tags,
      metadata,
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO initiatives (
        ogsm_component_id, title, description, objective, status, priority,
        start_date, target_end_date, actual_end_date, completion_percentage,
        budget_allocated, budget_spent, owner_email, team_members,
        expected_benefits, success_criteria, dependencies, risks, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        ogsm_component_id || null,
        title,
        description || null,
        objective || null,
        status,
        priority,
        start_date || null,
        target_end_date || null,
        actual_end_date || null,
        completion_percentage,
        budget_allocated || null,
        budget_spent,
        owner_email || null,
        team_members || null,
        expected_benefits || null,
        success_criteria || null,
        dependencies || null,
        risks || null,
        tags || null,
        metadata || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating initiative:', error);
    res.status(500).json({ error: 'Failed to create initiative' });
  }
});

// PUT update initiative
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ogsm_component_id,
      title,
      description,
      objective,
      status,
      priority,
      start_date,
      target_end_date,
      actual_end_date,
      completion_percentage,
      budget_allocated,
      budget_spent,
      owner_email,
      team_members,
      expected_benefits,
      success_criteria,
      dependencies,
      risks,
      tags,
      metadata,
    } = req.body;

    const result = await pool.query(
      `UPDATE initiatives SET
        ogsm_component_id = COALESCE($1, ogsm_component_id),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        objective = COALESCE($4, objective),
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        start_date = COALESCE($7, start_date),
        target_end_date = COALESCE($8, target_end_date),
        actual_end_date = COALESCE($9, actual_end_date),
        completion_percentage = COALESCE($10, completion_percentage),
        budget_allocated = COALESCE($11, budget_allocated),
        budget_spent = COALESCE($12, budget_spent),
        owner_email = COALESCE($13, owner_email),
        team_members = COALESCE($14, team_members),
        expected_benefits = COALESCE($15, expected_benefits),
        success_criteria = COALESCE($16, success_criteria),
        dependencies = COALESCE($17, dependencies),
        risks = COALESCE($18, risks),
        tags = COALESCE($19, tags),
        metadata = COALESCE($20, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *`,
      [
        ogsm_component_id,
        title,
        description,
        objective,
        status,
        priority,
        start_date,
        target_end_date,
        actual_end_date,
        completion_percentage,
        budget_allocated,
        budget_spent,
        owner_email,
        team_members,
        expected_benefits,
        success_criteria,
        dependencies,
        risks,
        tags,
        metadata,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Initiative not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating initiative:', error);
    res.status(500).json({ error: 'Failed to update initiative' });
  }
});

// DELETE initiative
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM initiatives WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Initiative not found' });
    }

    res.json({ message: 'Initiative deleted successfully', initiative: result.rows[0] });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    res.status(500).json({ error: 'Failed to delete initiative' });
  }
});

// ============================================================
// INITIATIVE MILESTONES
// ============================================================

// GET milestones for an initiative
router.get('/:initiativeId/milestones', async (req: Request, res: Response) => {
  try {
    const { initiativeId } = req.params;
    const result = await pool.query(
      'SELECT * FROM initiative_milestones WHERE initiative_id = $1 ORDER BY target_date ASC',
      [initiativeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// POST create milestone
router.post('/:initiativeId/milestones', async (req: Request, res: Response) => {
  try {
    const { initiativeId } = req.params;
    const { title, description, target_date, completed = false, completed_date, deliverables, notes } = req.body;

    if (!title || !target_date) {
      return res.status(400).json({ error: 'Title and target_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO initiative_milestones (
        initiative_id, title, description, target_date, completed, completed_date, deliverables, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [initiativeId, title, description || null, target_date, completed, completed_date || null, deliverables || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// PUT update milestone
router.put('/:initiativeId/milestones/:milestoneId', async (req: Request, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const { title, description, target_date, completed, completed_date, deliverables, notes } = req.body;

    const result = await pool.query(
      `UPDATE initiative_milestones SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        target_date = COALESCE($3, target_date),
        completed = COALESCE($4, completed),
        completed_date = COALESCE($5, completed_date),
        deliverables = COALESCE($6, deliverables),
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [title, description, target_date, completed, completed_date, deliverables, notes, milestoneId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// DELETE milestone
router.delete('/:initiativeId/milestones/:milestoneId', async (req: Request, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const result = await pool.query('DELETE FROM initiative_milestones WHERE id = $1 RETURNING *', [milestoneId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

// ============================================================
// INITIATIVE-KPI LINKS
// ============================================================

// GET linked KPIs for an initiative
router.get('/:initiativeId/kpis', async (req: Request, res: Response) => {
  try {
    const { initiativeId } = req.params;
    const result = await pool.query(
      `SELECT ik.*, k.name, k.description, k.current_value, k.target_value, k.unit, k.status
       FROM initiative_kpis ik
       JOIN kpis k ON ik.kpi_id = k.id
       WHERE ik.initiative_id = $1`,
      [initiativeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching linked KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch linked KPIs' });
  }
});

// POST link KPI to initiative
router.post('/:initiativeId/kpis', async (req: Request, res: Response) => {
  try {
    const { initiativeId } = req.params;
    const { kpi_id, target_impact_description } = req.body;

    if (!kpi_id) {
      return res.status(400).json({ error: 'kpi_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO initiative_kpis (initiative_id, kpi_id, target_impact_description)
       VALUES ($1, $2, $3)
       ON CONFLICT (initiative_id, kpi_id) DO UPDATE
       SET target_impact_description = EXCLUDED.target_impact_description
       RETURNING *`,
      [initiativeId, kpi_id, target_impact_description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error linking KPI to initiative:', error);
    res.status(500).json({ error: 'Failed to link KPI to initiative' });
  }
});

// DELETE unlink KPI from initiative
router.delete('/:initiativeId/kpis/:kpiId', async (req: Request, res: Response) => {
  try {
    const { initiativeId, kpiId } = req.params;
    const result = await pool.query(
      'DELETE FROM initiative_kpis WHERE initiative_id = $1 AND kpi_id = $2 RETURNING *',
      [initiativeId, kpiId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI link not found' });
    }

    res.json({ message: 'KPI unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking KPI:', error);
    res.status(500).json({ error: 'Failed to unlink KPI' });
  }
});

export default router;
