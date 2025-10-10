import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Get all OGSM templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, is_public } = req.query;

    let query = 'SELECT * FROM ogsm_templates';
    const params: any[] = [];

    const conditions: string[] = [];
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (is_public !== undefined) {
      params.push(is_public === 'true');
      conditions.push(`is_public = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM ogsm_templates WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create OGSM template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, category, structure, is_public, created_by, tags, metadata } = req.body;

    if (!name || !structure) {
      return res.status(400).json({ error: 'Name and structure are required' });
    }

    const result = await pool.query(
      `INSERT INTO ogsm_templates (name, description, category, structure, is_public, created_by, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description || '', category || null, JSON.stringify(structure), is_public !== false, created_by || null, tags || [], metadata || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update OGSM template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, structure, is_public, tags, metadata } = req.body;

    const result = await pool.query(
      `UPDATE ogsm_templates
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           structure = COALESCE($4, structure),
           is_public = COALESCE($5, is_public),
           tags = COALESCE($6, tags),
           metadata = COALESCE($7, metadata),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, category, structure ? JSON.stringify(structure) : null, is_public, tags, metadata, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete OGSM template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ogsm_templates WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Create components from template
router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { document_id } = req.body;

    // Get the template
    const templateResult = await pool.query('SELECT * FROM ogsm_templates WHERE id = $1', [id]);
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    const structure = template.structure;

    if (!Array.isArray(structure)) {
      return res.status(400).json({ error: 'Invalid template structure' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Increment usage count
      await client.query(
        'UPDATE ogsm_templates SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      // Create components from template
      const createdComponents = await createComponentsFromStructure(client, structure, document_id, null, 0);

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Components created from template successfully',
        components: createdComponents,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// Helper function to recursively create components from structure
async function createComponentsFromStructure(
  client: any,
  structure: any[],
  documentId: string | null,
  parentId: string | null,
  baseOrderIndex: number
): Promise<any[]> {
  const createdComponents: any[] = [];

  for (let i = 0; i < structure.length; i++) {
    const item = structure[i];
    const orderIndex = baseOrderIndex + i;

    const result = await client.query(
      `INSERT INTO ogsm_components (document_id, component_type, title, description, parent_id, order_index)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [documentId, item.component_type, item.title, item.description || '', parentId, orderIndex]
    );

    const createdComponent = result.rows[0];
    createdComponents.push(createdComponent);

    // Recursively create children
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      const childComponents = await createComponentsFromStructure(
        client,
        item.children,
        documentId,
        createdComponent.id,
        0
      );
      createdComponents.push(...childComponents);
    }
  }

  return createdComponents;
}

export default router;
