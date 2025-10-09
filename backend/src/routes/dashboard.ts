import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Get dashboard analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    // Get OGSM components count by type
    const ogsmCounts = await pool.query(`
      SELECT component_type, COUNT(*) as count
      FROM ogsm_components
      GROUP BY component_type
    `);

    // Get KPI status counts
    const kpiStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM kpis
      GROUP BY status
    `);

    // Get KPI progress (current vs target)
    const kpiProgress = await pool.query(`
      SELECT
        id, name, current_value, target_value, unit, status, frequency
      FROM kpis
      WHERE target_value IS NOT NULL AND current_value IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get recent KPI history for trending
    const kpiTrends = await pool.query(`
      SELECT
        k.id, k.name, k.unit,
        h.value, h.recorded_date
      FROM kpis k
      JOIN kpi_history h ON k.id = h.kpi_id
      WHERE h.recorded_date >= NOW() - INTERVAL '90 days'
      ORDER BY k.name, h.recorded_date ASC
    `);

    // Get OGSM hierarchy for strategic overview
    const ogsmHierarchy = await pool.query(`
      SELECT
        id, component_type, title, description, parent_id, order_index
      FROM ogsm_components
      ORDER BY
        CASE component_type
          WHEN 'objective' THEN 1
          WHEN 'goal' THEN 2
          WHEN 'strategy' THEN 3
          WHEN 'measure' THEN 4
        END,
        order_index
    `);

    // Get KPIs with their linked OGSM components
    const kpiOgsmLinks = await pool.query(`
      SELECT
        k.id as kpi_id,
        k.name as kpi_name,
        k.status as kpi_status,
        o.id as ogsm_id,
        o.component_type,
        o.title as ogsm_title
      FROM kpis k
      LEFT JOIN ogsm_components o ON k.ogsm_component_id = o.id
    `);

    // Calculate overall progress
    const overallProgress = await pool.query(`
      SELECT
        COUNT(*) as total_kpis,
        COUNT(CASE WHEN status = 'on_track' THEN 1 END) as on_track,
        COUNT(CASE WHEN status = 'at_risk' THEN 1 END) as at_risk,
        COUNT(CASE WHEN status = 'off_track' THEN 1 END) as off_track,
        AVG(
          CASE
            WHEN target_value > 0 AND current_value IS NOT NULL
            THEN (current_value / target_value) * 100
          END
        ) as avg_completion_percentage
      FROM kpis
    `);

    res.json({
      ogsm_counts: ogsmCounts.rows,
      kpi_status: kpiStatus.rows,
      kpi_progress: kpiProgress.rows,
      kpi_trends: kpiTrends.rows,
      ogsm_hierarchy: ogsmHierarchy.rows,
      kpi_ogsm_links: kpiOgsmLinks.rows,
      overall_progress: overallProgress.rows[0],
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Get strategic roadmap data
router.get('/roadmap', async (req: Request, res: Response) => {
  try {
    // Get all strategies with their timelines
    const strategies = await pool.query(`
      SELECT
        id, title, description, created_at, updated_at
      FROM ogsm_components
      WHERE component_type = 'strategy'
      ORDER BY order_index
    `);

    // Get KPIs grouped by frequency for timeline planning
    const kpiTimeline = await pool.query(`
      SELECT
        name, frequency, target_value, current_value, unit, status, created_at
      FROM kpis
      ORDER BY
        CASE frequency
          WHEN 'daily' THEN 1
          WHEN 'weekly' THEN 2
          WHEN 'monthly' THEN 3
          WHEN 'quarterly' THEN 4
          WHEN 'annual' THEN 5
        END,
        created_at
    `);

    // Get historical completion trends
    const completionTrends = await pool.query(`
      SELECT
        DATE_TRUNC('month', recorded_date) as month,
        COUNT(DISTINCT kpi_id) as kpis_updated,
        AVG(value) as avg_value
      FROM kpi_history
      WHERE recorded_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', recorded_date)
      ORDER BY month DESC
    `);

    res.json({
      strategies: strategies.rows,
      kpi_timeline: kpiTimeline.rows,
      completion_trends: completionTrends.rows,
    });
  } catch (error) {
    console.error('Error fetching roadmap data:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap data' });
  }
});

// Get strategic alignment matrix
router.get('/alignment', async (req: Request, res: Response) => {
  try {
    // Build hierarchical structure: Objectives -> Goals -> Strategies -> Measures/KPIs
    const alignment = await pool.query(`
      WITH objectives AS (
        SELECT id, title, description
        FROM ogsm_components
        WHERE component_type = 'objective'
      ),
      goals AS (
        SELECT id, title, description, parent_id
        FROM ogsm_components
        WHERE component_type = 'goal'
      ),
      strategies AS (
        SELECT id, title, description, parent_id
        FROM ogsm_components
        WHERE component_type = 'strategy'
      ),
      measures AS (
        SELECT id, title, description, parent_id
        FROM ogsm_components
        WHERE component_type = 'measure'
      )
      SELECT
        o.id as objective_id,
        o.title as objective_title,
        g.id as goal_id,
        g.title as goal_title,
        s.id as strategy_id,
        s.title as strategy_title,
        m.id as measure_id,
        m.title as measure_title,
        k.id as kpi_id,
        k.name as kpi_name,
        k.status as kpi_status,
        k.current_value,
        k.target_value,
        k.unit
      FROM objectives o
      LEFT JOIN goals g ON g.parent_id = o.id
      LEFT JOIN strategies s ON s.parent_id = g.id
      LEFT JOIN measures m ON m.parent_id = s.id
      LEFT JOIN kpis k ON k.ogsm_component_id = m.id OR k.ogsm_component_id = s.id
      ORDER BY o.title, g.title, s.title
    `);

    res.json(alignment.rows);
  } catch (error) {
    console.error('Error fetching alignment matrix:', error);
    res.status(500).json({ error: 'Failed to fetch alignment matrix' });
  }
});

export default router;
