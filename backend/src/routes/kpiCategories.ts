import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all categories (ordered by order_index)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, color, icon, order_index, is_default, created_at, updated_at
       FROM kpi_categories
       ORDER BY order_index ASC, name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPI categories:', error);
    res.status(500).json({ error: 'Failed to fetch KPI categories' });
  }
});

// Get single category by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, description, color, icon, order_index, is_default, created_at, updated_at
       FROM kpi_categories
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching KPI category:', error);
    res.status(500).json({ error: 'Failed to fetch KPI category' });
  }
});

// Get all KPIs in a category
router.get('/:id/kpis', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, ogsm_component_id, category_id, name, description, target_value,
              current_value, unit, frequency, status, ownership, persons_responsible,
              owner_email, created_at, updated_at
       FROM kpis
       WHERE category_id = $1
       ORDER BY name ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch category KPIs' });
  }
});

// Create new category
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, icon, order_index } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Check if category name already exists
    const existingCategory = await pool.query(
      'SELECT id FROM kpi_categories WHERE name = $1',
      [name]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    // If no order_index provided, set it to the highest + 1
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM kpi_categories'
      );
      finalOrderIndex = maxOrderResult.rows[0].next_order;
    }

    const result = await pool.query(
      `INSERT INTO kpi_categories (name, description, color, icon, order_index, is_default)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, name, description, color, icon, order_index, is_default, created_at, updated_at`,
      [name, description || null, color || null, icon || null, finalOrderIndex]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KPI category:', error);
    res.status(500).json({ error: 'Failed to create KPI category' });
  }
});

// Update category
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, order_index } = req.body;

    // Check if category exists
    const categoryCheck = await pool.query(
      'SELECT is_default FROM kpi_categories WHERE id = $1',
      [id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (name !== undefined) {
      // Check if new name conflicts with existing category (excluding current one)
      const nameCheck = await pool.query(
        'SELECT id FROM kpi_categories WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }

      updates.push(`name = $${paramCounter}`);
      values.push(name);
      paramCounter++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCounter}`);
      values.push(description);
      paramCounter++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramCounter}`);
      values.push(color);
      paramCounter++;
    }

    if (icon !== undefined) {
      updates.push(`icon = $${paramCounter}`);
      values.push(icon);
      paramCounter++;
    }

    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCounter}`);
      values.push(order_index);
      paramCounter++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE kpi_categories
       SET ${updates.join(', ')}
       WHERE id = $${paramCounter}
       RETURNING id, name, description, color, icon, order_index, is_default, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating KPI category:', error);
    res.status(500).json({ error: 'Failed to update KPI category' });
  }
});

// Delete category
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists and is not default
    const categoryCheck = await pool.query(
      'SELECT is_default, name FROM kpi_categories WHERE id = $1',
      [id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (categoryCheck.rows[0].is_default) {
      return res.status(400).json({ error: 'Cannot delete the default "Uncategorized" category' });
    }

    // Get the default "Uncategorized" category ID
    const defaultCategoryResult = await pool.query(
      'SELECT id FROM kpi_categories WHERE is_default = true LIMIT 1'
    );

    if (defaultCategoryResult.rows.length === 0) {
      return res.status(500).json({ error: 'Default category not found in database' });
    }

    const defaultCategoryId = defaultCategoryResult.rows[0].id;

    // Move all KPIs from this category to "Uncategorized"
    await pool.query(
      'UPDATE kpis SET category_id = $1 WHERE category_id = $2',
      [defaultCategoryId, id]
    );

    // Delete the category
    await pool.query('DELETE FROM kpi_categories WHERE id = $1', [id]);

    res.json({
      message: `Category "${categoryCheck.rows[0].name}" deleted successfully. KPIs moved to Uncategorized.`
    });
  } catch (error) {
    console.error('Error deleting KPI category:', error);
    res.status(500).json({ error: 'Failed to delete KPI category' });
  }
});

export default router;
