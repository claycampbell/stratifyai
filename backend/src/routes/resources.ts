import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Resource, ResourceAllocation } from '../types';

const router = Router();

// Initialize database pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ogsm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ============================================================
// RESOURCES CRUD
// ============================================================

// GET all resources
router.get('/', async (req: Request, res: Response) => {
  try {
    const { resource_type, availability_status, department, sort_by = 'resource_name', sort_order = 'asc' } = req.query;

    let query = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (resource_type) {
      query += ` AND resource_type = $${paramCount}`;
      params.push(resource_type);
      paramCount++;
    }

    if (availability_status) {
      query += ` AND availability_status = $${paramCount}`;
      params.push(availability_status);
      paramCount++;
    }

    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    // Add ordering
    const validSortColumns = ['resource_name', 'resource_type', 'availability_status', 'total_allocation_percentage', 'created_at'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'resource_name';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET single resource by ID (with allocations)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get resource
    const resourceResult = await pool.query('SELECT * FROM resources WHERE id = $1', [id]);

    if (resourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Get allocations with initiative details
    const allocationsResult = await pool.query(
      `SELECT ra.*, i.title as initiative_title, i.status as initiative_status, i.priority as initiative_priority
       FROM resource_allocations ra
       JOIN initiatives i ON ra.initiative_id = i.id
       WHERE ra.resource_id = $1
       ORDER BY ra.start_date DESC`,
      [id]
    );

    const resource = {
      ...resourceResult.rows[0],
      allocations: allocationsResult.rows,
    };

    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// GET available resources (not fully allocated)
router.get('/available/list', async (req: Request, res: Response) => {
  try {
    const { resource_type, min_availability_percentage } = req.query;

    let query = "SELECT * FROM resources WHERE availability_status != 'fully_allocated'";
    const params: any[] = [];
    let paramCount = 1;

    if (resource_type) {
      query += ` AND resource_type = $${paramCount}`;
      params.push(resource_type);
      paramCount++;
    }

    if (min_availability_percentage) {
      query += ` AND (100 - total_allocation_percentage) >= $${paramCount}`;
      params.push(min_availability_percentage);
      paramCount++;
    }

    query += ' ORDER BY total_allocation_percentage ASC, resource_name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available resources:', error);
    res.status(500).json({ error: 'Failed to fetch available resources' });
  }
});

// GET resource statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_resources,
        COUNT(*) FILTER (WHERE resource_type = 'human') as human_count,
        COUNT(*) FILTER (WHERE resource_type = 'equipment') as equipment_count,
        COUNT(*) FILTER (WHERE resource_type = 'facility') as facility_count,
        COUNT(*) FILTER (WHERE resource_type = 'software') as software_count,
        COUNT(*) FILTER (WHERE availability_status = 'available') as available_count,
        COUNT(*) FILTER (WHERE availability_status = 'partially_allocated') as partially_allocated_count,
        COUNT(*) FILTER (WHERE availability_status = 'fully_allocated') as fully_allocated_count,
        COUNT(*) FILTER (WHERE availability_status = 'unavailable') as unavailable_count,
        AVG(total_allocation_percentage) as avg_allocation_percentage,
        AVG(cost_per_hour) FILTER (WHERE cost_per_hour IS NOT NULL) as avg_cost_per_hour
      FROM resources
    `;

    const departmentQuery = `
      SELECT
        department,
        COUNT(*) as count,
        AVG(total_allocation_percentage) as avg_allocation
      FROM resources
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `;

    const [statsResult, departmentResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(departmentQuery),
    ]);

    res.json({
      summary: statsResult.rows[0],
      by_department: departmentResult.rows,
    });
  } catch (error) {
    console.error('Error fetching resource statistics:', error);
    res.status(500).json({ error: 'Failed to fetch resource statistics' });
  }
});

// POST create new resource
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      resource_name,
      resource_type,
      description,
      department,
      email,
      skills,
      capacity_hours_per_week,
      cost_per_hour,
      availability_status = 'available',
      total_allocation_percentage = 0,
      location,
      tags,
      metadata,
    } = req.body;

    // Validation
    if (!resource_name || !resource_type) {
      return res.status(400).json({ error: 'resource_name and resource_type are required' });
    }

    const result = await pool.query(
      `INSERT INTO resources (
        resource_name, resource_type, description, department, email, skills,
        capacity_hours_per_week, cost_per_hour, availability_status,
        total_allocation_percentage, location, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        resource_name,
        resource_type,
        description || null,
        department || null,
        email || null,
        skills || null,
        capacity_hours_per_week || null,
        cost_per_hour || null,
        availability_status,
        total_allocation_percentage,
        location || null,
        tags || null,
        metadata || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// PUT update resource
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      resource_name,
      resource_type,
      description,
      department,
      email,
      skills,
      capacity_hours_per_week,
      cost_per_hour,
      availability_status,
      total_allocation_percentage,
      location,
      tags,
      metadata,
    } = req.body;

    const result = await pool.query(
      `UPDATE resources SET
        resource_name = COALESCE($1, resource_name),
        resource_type = COALESCE($2, resource_type),
        description = COALESCE($3, description),
        department = COALESCE($4, department),
        email = COALESCE($5, email),
        skills = COALESCE($6, skills),
        capacity_hours_per_week = COALESCE($7, capacity_hours_per_week),
        cost_per_hour = COALESCE($8, cost_per_hour),
        availability_status = COALESCE($9, availability_status),
        total_allocation_percentage = COALESCE($10, total_allocation_percentage),
        location = COALESCE($11, location),
        tags = COALESCE($12, tags),
        metadata = COALESCE($13, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *`,
      [
        resource_name,
        resource_type,
        description,
        department,
        email,
        skills,
        capacity_hours_per_week,
        cost_per_hour,
        availability_status,
        total_allocation_percentage,
        location,
        tags,
        metadata,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// DELETE resource
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM resources WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ message: 'Resource deleted successfully', resource: result.rows[0] });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// ============================================================
// RESOURCE ALLOCATIONS
// ============================================================

// GET all allocations
router.get('/allocations/all', async (req: Request, res: Response) => {
  try {
    const { status, initiative_id } = req.query;

    let query = `
      SELECT ra.*, r.resource_name, r.resource_type, r.department,
             i.title as initiative_title, i.status as initiative_status
      FROM resource_allocations ra
      JOIN resources r ON ra.resource_id = r.id
      JOIN initiatives i ON ra.initiative_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND ra.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (initiative_id) {
      query += ` AND ra.initiative_id = $${paramCount}`;
      params.push(initiative_id);
      paramCount++;
    }

    query += ' ORDER BY ra.start_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// GET allocations for a resource
router.get('/:resourceId/allocations', async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const result = await pool.query(
      `SELECT ra.*, i.title as initiative_title, i.status as initiative_status, i.priority as initiative_priority
       FROM resource_allocations ra
       JOIN initiatives i ON ra.initiative_id = i.id
       WHERE ra.resource_id = $1
       ORDER BY ra.start_date DESC`,
      [resourceId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching allocations for resource:', error);
    res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// POST create allocation
router.post('/:resourceId/allocations', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { resourceId } = req.params;
    const { initiative_id, allocation_percentage, hours_per_week, start_date, end_date, role, notes, status = 'planned' } = req.body;

    if (!initiative_id || allocation_percentage === undefined || !start_date) {
      return res.status(400).json({ error: 'initiative_id, allocation_percentage, and start_date are required' });
    }

    if (allocation_percentage < 0 || allocation_percentage > 100) {
      return res.status(400).json({ error: 'allocation_percentage must be between 0 and 100' });
    }

    // Create allocation
    const allocationResult = await client.query(
      `INSERT INTO resource_allocations (
        resource_id, initiative_id, allocation_percentage, hours_per_week,
        start_date, end_date, role, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [resourceId, initiative_id, allocation_percentage, hours_per_week || null, start_date, end_date || null, role || null, notes || null, status]
    );

    // Update resource's total allocation percentage
    await client.query(
      `UPDATE resources
       SET total_allocation_percentage = (
         SELECT COALESCE(SUM(allocation_percentage), 0)
         FROM resource_allocations
         WHERE resource_id = $1 AND status IN ('planned', 'active')
       ),
       availability_status = CASE
         WHEN (SELECT COALESCE(SUM(allocation_percentage), 0) FROM resource_allocations WHERE resource_id = $1 AND status IN ('planned', 'active')) >= 100 THEN 'fully_allocated'
         WHEN (SELECT COALESCE(SUM(allocation_percentage), 0) FROM resource_allocations WHERE resource_id = $1 AND status IN ('planned', 'active')) > 0 THEN 'partially_allocated'
         ELSE 'available'
       END
       WHERE id = $1`,
      [resourceId]
    );

    await client.query('COMMIT');

    res.status(201).json(allocationResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating allocation:', error);
    res.status(500).json({ error: 'Failed to create allocation' });
  } finally {
    client.release();
  }
});

// PUT update allocation
router.put('/:resourceId/allocations/:allocationId', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { resourceId, allocationId } = req.params;
    const { initiative_id, allocation_percentage, hours_per_week, start_date, end_date, role, notes, status } = req.body;

    const result = await client.query(
      `UPDATE resource_allocations SET
        initiative_id = COALESCE($1, initiative_id),
        allocation_percentage = COALESCE($2, allocation_percentage),
        hours_per_week = COALESCE($3, hours_per_week),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        role = COALESCE($6, role),
        notes = COALESCE($7, notes),
        status = COALESCE($8, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND resource_id = $10
      RETURNING *`,
      [initiative_id, allocation_percentage, hours_per_week, start_date, end_date, role, notes, status, allocationId, resourceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    // Update resource's total allocation percentage
    await client.query(
      `UPDATE resources
       SET total_allocation_percentage = (
         SELECT COALESCE(SUM(allocation_percentage), 0)
         FROM resource_allocations
         WHERE resource_id = $1 AND status IN ('planned', 'active')
       ),
       availability_status = CASE
         WHEN (SELECT COALESCE(SUM(allocation_percentage), 0) FROM resource_allocations WHERE resource_id = $1 AND status IN ('planned', 'active')) >= 100 THEN 'fully_allocated'
         WHEN (SELECT COALESCE(SUM(allocation_percentage), 0) FROM resource_allocations WHERE resource_id = $1 AND status IN ('planned', 'active')) > 0 THEN 'partially_allocated'
         ELSE 'available'
       END
       WHERE id = $1`,
      [resourceId]
    );

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating allocation:', error);
    res.status(500).json({ error: 'Failed to update allocation' });
  } finally {
    client.release();
  }
});

// DELETE allocation
router.delete('/:resourceId/allocations/:allocationId', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { resourceId, allocationId } = req.params;

    const result = await client.query(
      'DELETE FROM resource_allocations WHERE id = $1 AND resource_id = $2 RETURNING *',
      [allocationId, resourceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    // Update resource's total allocation percentage
    await client.query(
      `UPDATE resources
       SET total_allocation_percentage = (
         SELECT COALESCE(SUM(allocation_percentage), 0)
         FROM resource_allocations
         WHERE resource_id = $1 AND status IN ('planned', 'active')
       ),
       availability_status = CASE
         WHEN (SELECT COALESCE(SUM(allocation_percentage), 0) FROM resource_allocations WHERE resource_id = $1 AND status IN ('planned', 'active')) >= 100 THEN 'fully_allocated'
         WHEN (SELECT COALESCE(SUM(allocation_percentage), 0) FROM resource_allocations WHERE resource_id = $1 AND status IN ('planned', 'active')) > 0 THEN 'partially_allocated'
         ELSE 'available'
       END
       WHERE id = $1`,
      [resourceId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting allocation:', error);
    res.status(500).json({ error: 'Failed to delete allocation' });
  } finally {
    client.release();
  }
});

export default router;
