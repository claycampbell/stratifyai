import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Risk } from '../types';

const router = Router();

// Initialize database pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ogsm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// GET all risks
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, owner_email, min_score, sort_by = 'risk_score', sort_order = 'desc' } = req.query;

    let query = 'SELECT * FROM risks WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (owner_email) {
      query += ` AND owner_email = $${paramCount}`;
      params.push(owner_email);
      paramCount++;
    }

    if (min_score) {
      query += ` AND risk_score >= $${paramCount}`;
      params.push(min_score);
      paramCount++;
    }

    // Add ordering
    const validSortColumns = ['risk_score', 'created_at', 'updated_at', 'review_date', 'title'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'risk_score';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching risks:', error);
    res.status(500).json({ error: 'Failed to fetch risks' });
  }
});

// GET single risk by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM risks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching risk:', error);
    res.status(500).json({ error: 'Failed to fetch risk' });
  }
});

// GET risks by OGSM component
router.get('/ogsm/:ogsmId', async (req: Request, res: Response) => {
  try {
    const { ogsmId } = req.params;
    const result = await pool.query(
      'SELECT * FROM risks WHERE ogsm_component_id = $1 ORDER BY risk_score DESC',
      [ogsmId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching risks for OGSM component:', error);
    res.status(500).json({ error: 'Failed to fetch risks' });
  }
});

// GET risk statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_risks,
        COUNT(*) FILTER (WHERE status = 'identified') as identified_count,
        COUNT(*) FILTER (WHERE status = 'assessing') as assessing_count,
        COUNT(*) FILTER (WHERE status = 'mitigating') as mitigating_count,
        COUNT(*) FILTER (WHERE status = 'monitoring') as monitoring_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE risk_score >= 16) as critical_count,
        COUNT(*) FILTER (WHERE risk_score >= 9 AND risk_score < 16) as high_count,
        COUNT(*) FILTER (WHERE risk_score >= 4 AND risk_score < 9) as medium_count,
        COUNT(*) FILTER (WHERE risk_score < 4) as low_count,
        AVG(risk_score) as average_risk_score
      FROM risks
      WHERE status != 'closed'
    `;

    const categoryQuery = `
      SELECT
        category,
        COUNT(*) as count,
        AVG(risk_score) as avg_score
      FROM risks
      WHERE status != 'closed'
      GROUP BY category
      ORDER BY count DESC
    `;

    const [statsResult, categoryResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(categoryQuery),
    ]);

    res.json({
      summary: statsResult.rows[0],
      by_category: categoryResult.rows,
    });
  } catch (error) {
    console.error('Error fetching risk statistics:', error);
    res.status(500).json({ error: 'Failed to fetch risk statistics' });
  }
});

// POST create new risk
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      ogsm_component_id,
      title,
      description,
      category,
      likelihood,
      impact,
      status = 'identified',
      mitigation_strategy,
      contingency_plan,
      owner_email,
      review_date,
      residual_likelihood,
      residual_impact,
      tags,
      metadata,
    } = req.body;

    // Validation
    if (!title || !likelihood || !impact) {
      return res.status(400).json({ error: 'Title, likelihood, and impact are required' });
    }

    const validLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
    if (!validLevels.includes(likelihood) || !validLevels.includes(impact)) {
      return res.status(400).json({ error: 'Invalid likelihood or impact value' });
    }

    const result = await pool.query(
      `INSERT INTO risks (
        ogsm_component_id, title, description, category, likelihood, impact,
        status, mitigation_strategy, contingency_plan, owner_email, review_date,
        residual_likelihood, residual_impact, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        ogsm_component_id || null,
        title,
        description || null,
        category || null,
        likelihood,
        impact,
        status,
        mitigation_strategy || null,
        contingency_plan || null,
        owner_email || null,
        review_date || null,
        residual_likelihood || null,
        residual_impact || null,
        tags || null,
        metadata || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating risk:', error);
    res.status(500).json({ error: 'Failed to create risk' });
  }
});

// PUT update risk
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ogsm_component_id,
      title,
      description,
      category,
      likelihood,
      impact,
      status,
      mitigation_strategy,
      contingency_plan,
      owner_email,
      review_date,
      residual_likelihood,
      residual_impact,
      tags,
      metadata,
    } = req.body;

    // Validation
    if (likelihood) {
      const validLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
      if (!validLevels.includes(likelihood)) {
        return res.status(400).json({ error: 'Invalid likelihood value' });
      }
    }

    if (impact) {
      const validLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
      if (!validLevels.includes(impact)) {
        return res.status(400).json({ error: 'Invalid impact value' });
      }
    }

    const result = await pool.query(
      `UPDATE risks SET
        ogsm_component_id = COALESCE($1, ogsm_component_id),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        likelihood = COALESCE($5, likelihood),
        impact = COALESCE($6, impact),
        status = COALESCE($7, status),
        mitigation_strategy = COALESCE($8, mitigation_strategy),
        contingency_plan = COALESCE($9, contingency_plan),
        owner_email = COALESCE($10, owner_email),
        review_date = COALESCE($11, review_date),
        residual_likelihood = COALESCE($12, residual_likelihood),
        residual_impact = COALESCE($13, residual_impact),
        tags = COALESCE($14, tags),
        metadata = COALESCE($15, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *`,
      [
        ogsm_component_id,
        title,
        description,
        category,
        likelihood,
        impact,
        status,
        mitigation_strategy,
        contingency_plan,
        owner_email,
        review_date,
        residual_likelihood,
        residual_impact,
        tags,
        metadata,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating risk:', error);
    res.status(500).json({ error: 'Failed to update risk' });
  }
});

// DELETE risk
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM risks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json({ message: 'Risk deleted successfully', risk: result.rows[0] });
  } catch (error) {
    console.error('Error deleting risk:', error);
    res.status(500).json({ error: 'Failed to delete risk' });
  }
});

// GET risk matrix data
router.get('/matrix/data', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, likelihood, impact, risk_score, status, category
       FROM risks
       WHERE status != 'closed'
       ORDER BY risk_score DESC`
    );

    // Group risks by likelihood and impact for matrix visualization
    const matrix: any = {};
    const levels = ['very_low', 'low', 'medium', 'high', 'very_high'];

    levels.forEach((likelihood) => {
      matrix[likelihood] = {};
      levels.forEach((impact) => {
        matrix[likelihood][impact] = [];
      });
    });

    result.rows.forEach((risk) => {
      matrix[risk.likelihood][risk.impact].push(risk);
    });

    res.json({
      matrix,
      risks: result.rows,
    });
  } catch (error) {
    console.error('Error fetching risk matrix data:', error);
    res.status(500).json({ error: 'Failed to fetch risk matrix data' });
  }
});

export default router;
