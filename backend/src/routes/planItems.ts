import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// ============================================================================
// Plan Items Routes
// ============================================================================

// Get all plan items (optionally filtered by plan_id)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { plan_id, timeframe, status, priority } = req.query;

    let query = 'SELECT * FROM plan_items';
    const params: any[] = [];
    const conditions: string[] = [];

    if (plan_id) {
      params.push(plan_id);
      conditions.push(`plan_id = $${params.length}`);
    }
    if (timeframe) {
      params.push(timeframe);
      conditions.push(`timeframe = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY order_index ASC, created_at ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plan items:', error);
    res.status(500).json({ error: 'Failed to fetch plan items' });
  }
});

// Get a single plan item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM plan_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching plan item:', error);
    res.status(500).json({ error: 'Failed to fetch plan item' });
  }
});

// Create a new plan item
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      plan_id,
      title,
      description,
      timeframe,
      priority = 'medium',
      status = 'not_started',
      completion_percentage = 0,
      target_completion_date,
      actual_completion_date,
      notes,
      order_index = 0,
    } = req.body;

    // Validate required fields
    if (!plan_id || !title || !timeframe) {
      return res.status(400).json({
        error: 'Missing required fields: plan_id, title, timeframe',
      });
    }

    const result = await pool.query(
      `INSERT INTO plan_items (
        plan_id, title, description, timeframe, priority, status,
        completion_percentage, target_completion_date, actual_completion_date,
        notes, order_index
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        plan_id,
        title,
        description,
        timeframe,
        priority,
        status,
        completion_percentage,
        target_completion_date,
        actual_completion_date,
        notes,
        order_index,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating plan item:', error);
    res.status(500).json({ error: 'Failed to create plan item' });
  }
});

// Update a plan item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      timeframe,
      priority,
      status,
      completion_percentage,
      target_completion_date,
      actual_completion_date,
      notes,
      order_index,
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
    if (timeframe !== undefined) {
      params.push(timeframe);
      updates.push(`timeframe = $${params.length}`);
    }
    if (priority !== undefined) {
      params.push(priority);
      updates.push(`priority = $${params.length}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (completion_percentage !== undefined) {
      params.push(completion_percentage);
      updates.push(`completion_percentage = $${params.length}`);
    }
    if (target_completion_date !== undefined) {
      params.push(target_completion_date);
      updates.push(`target_completion_date = $${params.length}`);
    }
    if (actual_completion_date !== undefined) {
      params.push(actual_completion_date);
      updates.push(`actual_completion_date = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }
    if (order_index !== undefined) {
      params.push(order_index);
      updates.push(`order_index = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE plan_items
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating plan item:', error);
    res.status(500).json({ error: 'Failed to update plan item' });
  }
});

// Delete a plan item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM plan_items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    res.json({ message: 'Plan item deleted successfully', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting plan item:', error);
    res.status(500).json({ error: 'Failed to delete plan item' });
  }
});

// Get all links for a plan item
router.get('/:id/links', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM plan_item_links WHERE plan_item_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plan item links:', error);
    res.status(500).json({ error: 'Failed to fetch plan item links' });
  }
});

// Get all updates for a plan item
router.get('/:id/updates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM plan_updates WHERE plan_item_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plan updates:', error);
    res.status(500).json({ error: 'Failed to fetch plan updates' });
  }
});

// Create an update for a plan item
router.post('/:id/updates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { update_type, previous_value, new_value, notes, updated_by } = req.body;

    // Validate required fields
    if (!update_type) {
      return res.status(400).json({ error: 'Missing required field: update_type' });
    }

    const result = await pool.query(
      `INSERT INTO plan_updates (
        plan_item_id, update_type, previous_value, new_value, notes, updated_by
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, update_type, previous_value, new_value, notes, updated_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating plan update:', error);
    res.status(500).json({ error: 'Failed to create plan update' });
  }
});

// Bulk update order_index for multiple plan items
router.patch('/reorder', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request: items array required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        await client.query(
          'UPDATE plan_items SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.order_index, item.id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Plan items reordered successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering plan items:', error);
    res.status(500).json({ error: 'Failed to reorder plan items' });
  }
});

export default router;
