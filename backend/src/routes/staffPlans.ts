import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// ============================================================================
// Staff Plans Routes
// ============================================================================

// Get all staff plans
router.get('/', async (req: Request, res: Response) => {
  try {
    const { user_id, status } = req.query;

    let query = 'SELECT * FROM staff_plans';
    const params: any[] = [];

    if (user_id || status) {
      query += ' WHERE';
      if (user_id) {
        params.push(user_id);
        query += ` user_id = $${params.length}`;
      }
      if (status) {
        if (params.length > 0) query += ' AND';
        params.push(status);
        query += ` status = $${params.length}`;
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff plans:', error);
    res.status(500).json({ error: 'Failed to fetch staff plans' });
  }
});

// Get a single staff plan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM staff_plans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching staff plan:', error);
    res.status(500).json({ error: 'Failed to fetch staff plan' });
  }
});

// Create a new staff plan
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      title,
      description,
      start_date,
      end_date,
      status = 'active',
      created_by,
    } = req.body;

    // Validate required fields
    if (!user_id || !title || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, title, start_date, end_date',
      });
    }

    const result = await pool.query(
      `INSERT INTO staff_plans (user_id, title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, title, description, start_date, end_date, status, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating staff plan:', error);
    res.status(500).json({ error: 'Failed to create staff plan' });
  }
});

// Update a staff plan
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      start_date,
      end_date,
      status,
    } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    if (start_date !== undefined) {
      params.push(start_date);
      updates.push(`start_date = $${params.length}`);
    }
    if (end_date !== undefined) {
      params.push(end_date);
      updates.push(`end_date = $${params.length}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE staff_plans
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff plan not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating staff plan:', error);
    res.status(500).json({ error: 'Failed to update staff plan' });
  }
});

// Delete a staff plan
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM staff_plans WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff plan not found' });
    }

    res.json({ message: 'Staff plan deleted successfully', plan: result.rows[0] });
  } catch (error) {
    console.error('Error deleting staff plan:', error);
    res.status(500).json({ error: 'Failed to delete staff plan' });
  }
});

// Get all plan items for a staff plan
router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { timeframe, status } = req.query;

    let query = 'SELECT * FROM plan_items WHERE plan_id = $1';
    const params: any[] = [id];

    if (timeframe) {
      params.push(timeframe);
      query += ` AND timeframe = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY order_index ASC, created_at ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plan items:', error);
    res.status(500).json({ error: 'Failed to fetch plan items' });
  }
});

// Get plan statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get overall completion statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_items,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_items,
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started_items,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_items,
        COALESCE(AVG(completion_percentage), 0) as avg_completion,
        COUNT(*) FILTER (WHERE timeframe = '30_days') as days_30_items,
        COUNT(*) FILTER (WHERE timeframe = '60_days') as days_60_items,
        COUNT(*) FILTER (WHERE timeframe = '90_days') as days_90_items
      FROM plan_items
      WHERE plan_id = $1
    `;

    const result = await pool.query(statsQuery, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching plan stats:', error);
    res.status(500).json({ error: 'Failed to fetch plan statistics' });
  }
});

export default router;
