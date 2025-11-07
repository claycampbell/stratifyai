import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// ============================================================================
// Plan Item Links Routes
// ============================================================================

// Get all plan item links (optionally filtered)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { plan_item_id, link_type, link_id } = req.query;

    let query = 'SELECT * FROM plan_item_links';
    const params: any[] = [];
    const conditions: string[] = [];

    if (plan_item_id) {
      params.push(plan_item_id);
      conditions.push(`plan_item_id = $${params.length}`);
    }
    if (link_type) {
      params.push(link_type);
      conditions.push(`link_type = $${params.length}`);
    }
    if (link_id) {
      params.push(link_id);
      conditions.push(`link_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching plan item links:', error);
    res.status(500).json({ error: 'Failed to fetch plan item links' });
  }
});

// Get a single plan item link by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM plan_item_links WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item link not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching plan item link:', error);
    res.status(500).json({ error: 'Failed to fetch plan item link' });
  }
});

// Create a new plan item link
router.post('/', async (req: Request, res: Response) => {
  try {
    const { plan_item_id, link_type, link_id, description } = req.body;

    // Validate required fields
    if (!plan_item_id || !link_type || !link_id) {
      return res.status(400).json({
        error: 'Missing required fields: plan_item_id, link_type, link_id',
      });
    }

    // Check if link already exists (enforce unique constraint)
    const existingLink = await pool.query(
      'SELECT * FROM plan_item_links WHERE plan_item_id = $1 AND link_type = $2 AND link_id = $3',
      [plan_item_id, link_type, link_id]
    );

    if (existingLink.rows.length > 0) {
      return res.status(409).json({
        error: 'This link already exists',
        existing: existingLink.rows[0],
      });
    }

    const result = await pool.query(
      `INSERT INTO plan_item_links (plan_item_id, link_type, link_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [plan_item_id, link_type, link_id, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating plan item link:', error);
    res.status(500).json({ error: 'Failed to create plan item link' });
  }
});

// Update a plan item link
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    // Only description can be updated (other fields are part of the unique constraint)
    if (description === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(
      'UPDATE plan_item_links SET description = $1 WHERE id = $2 RETURNING *',
      [description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item link not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating plan item link:', error);
    res.status(500).json({ error: 'Failed to update plan item link' });
  }
});

// Delete a plan item link
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM plan_item_links WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item link not found' });
    }

    res.json({ message: 'Plan item link deleted successfully', link: result.rows[0] });
  } catch (error) {
    console.error('Error deleting plan item link:', error);
    res.status(500).json({ error: 'Failed to delete plan item link' });
  }
});

// Get linked entities with details (enriched view)
router.get('/:id/details', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get the link
    const linkResult = await pool.query(
      'SELECT * FROM plan_item_links WHERE id = $1',
      [id]
    );

    if (linkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item link not found' });
    }

    const link = linkResult.rows[0];
    let entityDetails = null;

    // Fetch the linked entity details based on link_type
    switch (link.link_type) {
      case 'strategy':
      case 'ogsm_component':
        const ogsmResult = await pool.query(
          'SELECT * FROM ogsm_components WHERE id = $1',
          [link.link_id]
        );
        entityDetails = ogsmResult.rows[0] || null;
        break;

      case 'kpi':
        const kpiResult = await pool.query(
          'SELECT * FROM kpis WHERE id = $1',
          [link.link_id]
        );
        entityDetails = kpiResult.rows[0] || null;
        break;

      case 'initiative':
        const initiativeResult = await pool.query(
          'SELECT * FROM initiatives WHERE id = $1',
          [link.link_id]
        );
        entityDetails = initiativeResult.rows[0] || null;
        break;

      default:
        break;
    }

    res.json({
      link,
      entity: entityDetails,
    });
  } catch (error) {
    console.error('Error fetching link details:', error);
    res.status(500).json({ error: 'Failed to fetch link details' });
  }
});

// Bulk create links for a plan item
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { plan_item_id, links } = req.body;

    if (!plan_item_id || !links || !Array.isArray(links)) {
      return res.status(400).json({
        error: 'Invalid request: plan_item_id and links array required',
      });
    }

    const client = await pool.connect();
    const createdLinks: any[] = [];
    const errors: any[] = [];

    try {
      await client.query('BEGIN');

      for (const link of links) {
        const { link_type, link_id, description } = link;

        if (!link_type || !link_id) {
          errors.push({ link, error: 'Missing link_type or link_id' });
          continue;
        }

        // Check if link already exists
        const existingLink = await client.query(
          'SELECT * FROM plan_item_links WHERE plan_item_id = $1 AND link_type = $2 AND link_id = $3',
          [plan_item_id, link_type, link_id]
        );

        if (existingLink.rows.length > 0) {
          errors.push({ link, error: 'Link already exists' });
          continue;
        }

        const result = await client.query(
          `INSERT INTO plan_item_links (plan_item_id, link_type, link_id, description)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [plan_item_id, link_type, link_id, description]
        );

        createdLinks.push(result.rows[0]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Bulk link creation completed',
        created: createdLinks,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error bulk creating links:', error);
    res.status(500).json({ error: 'Failed to bulk create links' });
  }
});

export default router;
