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

// ============================================================================
// PA-1 + PA-2: Health rollup + Priority Actions
// Per backlog tickets PA-1 (health indicators) and PA-2 (priority actions list).
// Returns a per-user composite of:
//   1. Overdue plan items (due in past, not completed/cancelled)
//   2. KPIs the user owns that are at_risk or off_track
//   3. Recently flagged/rejected validations involving the user
// Capped at 7 items per the ticket. Each item carries a `severity` (red/yellow/green)
// so the frontend can render a consistent traffic-light health indicator.
// ============================================================================
router.get('/priority-actions', async (req: Request, res: Response) => {
  try {
    // user_identifier is whatever string is stored in kpis.ownership / staff_plans.user_id /
    // chat_history.user_id. The caller passes either a UUID (for plan/chat lookups) or
    // a display name (for KPI ownership matching), or both.
    const { user_id, user_name, limit } = req.query;
    const cap = Math.min(parseInt((limit as string) || '7', 10) || 7, 20);

    // Only treat user_id as a real UUID if it looks like one — callers
    // sometimes pass the literal string "null"/"undefined" from a missing
    // localStorage entry. Without this guard, pg would 500 on the cast.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUserId =
      typeof user_id === 'string' && UUID_RE.test(user_id) ? user_id : null;

    const items: any[] = [];

    // 1. Overdue plan items (red) — due in the past, not yet done
    if (validUserId) {
      const overduePlans = await pool.query(
        `SELECT pi.id, pi.title, pi.timeframe, pi.target_completion_date, pi.priority, pi.status,
                sp.id AS plan_id, sp.title AS plan_title
         FROM plan_items pi
         INNER JOIN staff_plans sp ON sp.id = pi.plan_id
         WHERE sp.user_id = $1
           AND pi.target_completion_date IS NOT NULL
           AND pi.target_completion_date < CURRENT_DATE
           AND pi.status NOT IN ('completed', 'cancelled')
         ORDER BY pi.target_completion_date ASC
         LIMIT $2`,
        [validUserId, cap]
      );
      for (const row of overduePlans.rows) {
        items.push({
          source: 'plan_item',
          severity: 'red',
          entity_id: row.id,
          title: row.title,
          subtitle: `Plan item overdue (${row.timeframe?.replace('_', ' ')}) — ${row.plan_title}`,
          link: `/staff-plans/${row.plan_id}`,
          due_date: row.target_completion_date,
          rank_score: 100, // overdue beats other categories
        });
      }
    }

    // 2. KPIs the user owns that are not on track
    if (user_name) {
      const offTrackKPIs = await pool.query(
        `SELECT id, name, status, current_value, target_value, unit
         FROM kpis
         WHERE (ownership = $1 OR $1 = ANY(persons_responsible))
           AND status IN ('at_risk', 'off_track')
         ORDER BY CASE status WHEN 'off_track' THEN 0 WHEN 'at_risk' THEN 1 ELSE 2 END
         LIMIT $2`,
        [user_name, cap]
      );
      for (const row of offTrackKPIs.rows) {
        items.push({
          source: 'kpi',
          severity: row.status === 'off_track' ? 'red' : 'yellow',
          entity_id: row.id,
          title: row.name,
          subtitle: `KPI ${row.status.replace('_', ' ')} — ${row.current_value ?? '—'}/${row.target_value ?? '—'} ${row.unit ?? ''}`.trim(),
          link: `/kpis?kpi=${row.id}`,
          rank_score: row.status === 'off_track' ? 90 : 70,
        });
      }
    }

    // 3. Recent flagged/rejected validations against the user (last 30 days)
    if (validUserId) {
      // ai_recommendation_validations has chat_history_id; chat_history has user_id.
      const validations = await pool.query(
        `SELECT v.id, v.validation_status, v.recommendation_text, v.created_at
         FROM ai_recommendation_validations v
         INNER JOIN chat_history ch ON ch.id = v.chat_history_id
         WHERE ch.user_id = $1
           AND v.validation_status IN ('flagged', 'rejected')
           AND v.created_at >= NOW() - INTERVAL '30 days'
         ORDER BY v.created_at DESC
         LIMIT $2`,
        [validUserId, cap]
      );
      for (const row of validations.rows) {
        items.push({
          source: 'validation',
          severity: row.validation_status === 'rejected' ? 'red' : 'yellow',
          entity_id: row.id,
          title: row.recommendation_text?.slice(0, 80) ?? 'AI recommendation flagged',
          subtitle: `Validation ${row.validation_status} — review with Chris`,
          link: '/admin',
          rank_score: row.validation_status === 'rejected' ? 80 : 50,
        });
      }
    }

    // Sort by severity (red > yellow > green), then rank_score desc, then due_date asc
    items.sort((a, b) => {
      const sevOrder = { red: 0, yellow: 1, green: 2 } as Record<string, number>;
      const sevA = sevOrder[a.severity] ?? 3;
      const sevB = sevOrder[b.severity] ?? 3;
      if (sevA !== sevB) return sevA - sevB;
      if ((b.rank_score ?? 0) !== (a.rank_score ?? 0)) return (b.rank_score ?? 0) - (a.rank_score ?? 0);
      if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
      return 0;
    });

    res.json({
      items: items.slice(0, cap),
      total_found: items.length,
      capped_at: cap,
    });
  } catch (error: any) {
    console.error('Error computing priority actions:', error);
    res.status(500).json({ error: 'Failed to compute priority actions', details: error.message });
  }
});

// PA-1: Per-area health rollup. For v1, "area" = kpi_category. Returns
// a green/yellow/red rollup based on the KPIs in each category the user owns.
router.get('/area-health', async (req: Request, res: Response) => {
  try {
    const { user_name } = req.query;

    let baseCondition = '';
    const params: any[] = [];
    if (user_name) {
      params.push(user_name);
      baseCondition = ` WHERE k.ownership = $1 OR $1 = ANY(k.persons_responsible) `;
    }

    const result = await pool.query(
      `SELECT
        COALESCE(c.name, 'Uncategorized') AS area,
        COUNT(*) AS total_kpis,
        COUNT(*) FILTER (WHERE k.status = 'on_track') AS on_track_count,
        COUNT(*) FILTER (WHERE k.status = 'at_risk') AS at_risk_count,
        COUNT(*) FILTER (WHERE k.status = 'off_track') AS off_track_count
       FROM kpis k
       LEFT JOIN kpi_categories c ON c.id = k.category_id
       ${baseCondition}
       GROUP BY COALESCE(c.name, 'Uncategorized')
       ORDER BY area`,
      params
    );

    const areas = result.rows.map((r: any) => {
      const offTrack = parseInt(r.off_track_count, 10);
      const atRisk = parseInt(r.at_risk_count, 10);
      const total = parseInt(r.total_kpis, 10);
      let severity: 'red' | 'yellow' | 'green' = 'green';
      if (offTrack > 0) severity = 'red';
      else if (atRisk > 0) severity = 'yellow';
      return {
        area: r.area,
        severity,
        total_kpis: total,
        on_track: parseInt(r.on_track_count, 10),
        at_risk: atRisk,
        off_track: offTrack,
      };
    });

    res.json({ areas });
  } catch (error: any) {
    console.error('Error computing area health:', error);
    res.status(500).json({ error: 'Failed to compute area health', details: error.message });
  }
});

export default router;
