import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Helper function to validate parent-child relationships
async function validateParentChild(componentId: string, parentId: string | null): Promise<{ valid: boolean; error?: string }> {
  if (!parentId) {
    return { valid: true }; // No parent is always valid
  }

  // Check if parent exists
  const parentResult = await pool.query('SELECT id, component_type FROM ogsm_components WHERE id = $1', [parentId]);
  if (parentResult.rows.length === 0) {
    return { valid: false, error: 'Parent component not found' };
  }

  // Check for circular dependency
  const circularCheck = await pool.query(`
    WITH RECURSIVE parent_chain AS (
      SELECT id, parent_id, 1 as depth
      FROM ogsm_components
      WHERE id = $1

      UNION ALL

      SELECT c.id, c.parent_id, pc.depth + 1
      FROM ogsm_components c
      INNER JOIN parent_chain pc ON c.id = pc.parent_id
      WHERE pc.depth < 10
    )
    SELECT id FROM parent_chain WHERE id = $2
  `, [parentId, componentId]);

  if (circularCheck.rows.length > 0) {
    return { valid: false, error: 'Circular dependency detected: component cannot be its own ancestor' };
  }

  // Validate OGSM hierarchy rules (optional strict validation)
  // Objective -> Goal -> Strategy -> Measure
  const componentResult = await pool.query('SELECT component_type FROM ogsm_components WHERE id = $1', [componentId]);
  if (componentResult.rows.length > 0) {
    const componentType = componentResult.rows[0].component_type;
    const parentType = parentResult.rows[0].component_type;

    const hierarchy: Record<string, string[]> = {
      'goal': ['objective'],
      'strategy': ['goal', 'objective'],
      'measure': ['strategy', 'goal', 'objective']
    };

    if (hierarchy[componentType] && !hierarchy[componentType].includes(parentType)) {
      return { valid: false, error: `Invalid hierarchy: ${componentType} cannot be a child of ${parentType}` };
    }
  }

  return { valid: true };
}

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
    const { title, description, order_index, parent_id } = req.body;

    // Validate parent-child relationship
    if (parent_id !== undefined) {
      const validation = await validateParentChild(id, parent_id);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const result = await pool.query(
      `UPDATE ogsm_components
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           order_index = COALESCE($3, order_index),
           parent_id = CASE WHEN $4::text = 'null' THEN NULL ELSE COALESCE($4::uuid, parent_id) END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, description, order_index, parent_id, id]
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

// Duplicate OGSM component
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { include_children } = req.body;

    // Get the original component
    const originalResult = await pool.query('SELECT * FROM ogsm_components WHERE id = $1', [id]);
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const original = originalResult.rows[0];

    // Create duplicate with "(Copy)" suffix
    const duplicateResult = await pool.query(
      `INSERT INTO ogsm_components (document_id, component_type, title, description, parent_id, order_index)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        original.document_id,
        original.component_type,
        `${original.title} (Copy)`,
        original.description,
        original.parent_id,
        original.order_index + 1
      ]
    );

    const duplicate = duplicateResult.rows[0];

    // If include_children is true, recursively duplicate children
    if (include_children) {
      const childrenResult = await pool.query(
        'SELECT * FROM ogsm_components WHERE parent_id = $1 ORDER BY order_index',
        [id]
      );

      for (const child of childrenResult.rows) {
        await duplicateComponentRecursive(child, duplicate.id);
      }
    }

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating component:', error);
    res.status(500).json({ error: 'Failed to duplicate component' });
  }
});

// Helper function for recursive duplication
async function duplicateComponentRecursive(component: any, newParentId: string) {
  const duplicateResult = await pool.query(
    `INSERT INTO ogsm_components (document_id, component_type, title, description, parent_id, order_index)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      component.document_id,
      component.component_type,
      `${component.title} (Copy)`,
      component.description,
      newParentId,
      component.order_index
    ]
  );

  const duplicate = duplicateResult.rows[0];

  // Recursively duplicate children
  const childrenResult = await pool.query(
    'SELECT * FROM ogsm_components WHERE parent_id = $1 ORDER BY order_index',
    [component.id]
  );

  for (const child of childrenResult.rows) {
    await duplicateComponentRecursive(child, duplicate.id);
  }

  return duplicate;
}

// Bulk reorder components
router.post('/bulk/reorder', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body; // Array of { id, order_index, parent_id? }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const update of updates) {
        const { id, order_index, parent_id } = update;

        // Validate parent-child if parent_id is provided
        if (parent_id !== undefined) {
          const validation = await validateParentChild(id, parent_id);
          if (!validation.valid) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Validation failed for ${id}: ${validation.error}` });
          }
        }

        const result = await client.query(
          `UPDATE ogsm_components
           SET order_index = COALESCE($1, order_index),
               parent_id = CASE WHEN $2::text = 'null' THEN NULL WHEN $2 IS NOT NULL THEN $2::uuid ELSE parent_id END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [order_index, parent_id, id]
        );

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');
      res.json({ updated: results.length, components: results });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error bulk reordering components:', error);
    res.status(500).json({ error: 'Failed to bulk reorder components' });
  }
});

export default router;
