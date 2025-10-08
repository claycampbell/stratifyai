import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Get all OGSM components
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, document_id } = req.query;

    let query = 'SELECT * FROM ogsm_components';
    const params: any[] = [];

    if (type || document_id) {
      query += ' WHERE';
      if (type) {
        params.push(type);
        query += ` component_type = $${params.length}`;
      }
      if (document_id) {
        if (params.length > 0) query += ' AND';
        params.push(document_id);
        query += ` document_id = $${params.length}`;
      }
    }

    query += ' ORDER BY order_index, created_at';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching OGSM components:', error);
    res.status(500).json({ error: 'Failed to fetch OGSM components' });
  }
});

// Get OGSM component by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM ogsm_components WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching component:', error);
    res.status(500).json({ error: 'Failed to fetch component' });
  }
});

// Create OGSM component
router.post('/', async (req: Request, res: Response) => {
  try {
    const { document_id, component_type, title, description, parent_id, order_index } = req.body;

    if (!component_type || !title) {
      return res.status(400).json({ error: 'component_type and title are required' });
    }

    const result = await pool.query(
      `INSERT INTO ogsm_components (document_id, component_type, title, description, parent_id, order_index)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [document_id || null, component_type, title, description || '', parent_id || null, order_index || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating component:', error);
    res.status(500).json({ error: 'Failed to create component' });
  }
});

// Update OGSM component
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, order_index } = req.body;

    const result = await pool.query(
      `UPDATE ogsm_components
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           order_index = COALESCE($3, order_index),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title, description, order_index, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: 'Failed to update component' });
  }
});

// Delete OGSM component
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ogsm_components WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({ message: 'Component deleted successfully' });
  } catch (error) {
    console.error('Error deleting component:', error);
    res.status(500).json({ error: 'Failed to delete component' });
  }
});

// Get OGSM hierarchy
router.get('/hierarchy/tree', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      WITH RECURSIVE ogsm_tree AS (
        SELECT id, component_type, title, description, parent_id, order_index, 0 as level
        FROM ogsm_components
        WHERE parent_id IS NULL

        UNION ALL

        SELECT c.id, c.component_type, c.title, c.description, c.parent_id, c.order_index, t.level + 1
        FROM ogsm_components c
        INNER JOIN ogsm_tree t ON c.parent_id = t.id
      )
      SELECT * FROM ogsm_tree ORDER BY level, order_index
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
});

export default router;
