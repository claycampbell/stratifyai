import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Dependency } from '../types';

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
// DEPENDENCIES CRUD
// ============================================================

// GET all dependencies
router.get('/', async (req: Request, res: Response) => {
  try {
    const { dependency_type, status, strength, source_type, target_type } = req.query;

    let query = 'SELECT * FROM dependencies WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (dependency_type) {
      query += ` AND dependency_type = $${paramCount}`;
      params.push(dependency_type);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (strength) {
      query += ` AND strength = $${paramCount}`;
      params.push(strength);
      paramCount++;
    }

    if (source_type) {
      query += ` AND source_type = $${paramCount}`;
      params.push(source_type);
      paramCount++;
    }

    if (target_type) {
      query += ` AND target_type = $${paramCount}`;
      params.push(target_type);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
});

// GET single dependency by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM dependencies WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching dependency:', error);
    res.status(500).json({ error: 'Failed to fetch dependency' });
  }
});

// GET dependencies for a specific entity
router.get('/entity/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { direction = 'both' } = req.query; // 'outgoing', 'incoming', or 'both'

    let query = 'SELECT * FROM dependencies WHERE ';
    const params: any[] = [entityId];

    if (direction === 'outgoing') {
      query += 'source_type = $2 AND source_id = $1';
      params.push(entityType);
    } else if (direction === 'incoming') {
      query += 'target_type = $2 AND target_id = $1';
      params.push(entityType);
    } else {
      query += '(source_type = $2 AND source_id = $1) OR (target_type = $2 AND target_id = $1)';
      params.push(entityType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entity dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch entity dependencies' });
  }
});

// GET dependency graph data (for visualization)
router.get('/graph/data', async (req: Request, res: Response) => {
  try {
    const { entity_types, status = 'active' } = req.query;

    let query = 'SELECT * FROM dependencies WHERE status = $1';
    const params: any[] = [status];
    let paramCount = 2;

    if (entity_types && Array.isArray(entity_types) && entity_types.length > 0) {
      query += ` AND (source_type = ANY($${paramCount}::text[]) OR target_type = ANY($${paramCount}::text[]))`;
      params.push(entity_types);
      paramCount++;
    }

    const result = await pool.query(query, params);

    // Get unique entity IDs
    const entityMap = new Map();
    result.rows.forEach((dep) => {
      if (!entityMap.has(dep.source_id)) {
        entityMap.set(dep.source_id, { id: dep.source_id, type: dep.source_type });
      }
      if (!entityMap.has(dep.target_id)) {
        entityMap.set(dep.target_id, { id: dep.target_id, type: dep.target_type });
      }
    });

    // Fetch entity details
    const nodes = await Promise.all(
      Array.from(entityMap.values()).map(async (entity) => {
        let tableName = '';
        let nameColumn = 'title';

        switch (entity.type) {
          case 'ogsm_component':
            tableName = 'ogsm_components';
            nameColumn = 'title';
            break;
          case 'initiative':
            tableName = 'initiatives';
            nameColumn = 'title';
            break;
          case 'kpi':
            tableName = 'kpis';
            nameColumn = 'name';
            break;
          case 'risk':
            tableName = 'risks';
            nameColumn = 'title';
            break;
          default:
            return { id: entity.id, type: entity.type, name: 'Unknown' };
        }

        try {
          const entityResult = await pool.query(
            `SELECT id, ${nameColumn} as name FROM ${tableName} WHERE id = $1`,
            [entity.id]
          );

          if (entityResult.rows.length > 0) {
            return {
              id: entity.id,
              type: entity.type,
              name: entityResult.rows[0].name,
            };
          }
        } catch (err) {
          console.error(`Error fetching entity ${entity.id}:`, err);
        }

        return { id: entity.id, type: entity.type, name: 'Unknown' };
      })
    );

    // Format edges for graph visualization
    const edges = result.rows.map((dep) => ({
      id: dep.id,
      source: dep.source_id,
      target: dep.target_id,
      type: dep.dependency_type,
      strength: dep.strength,
      description: dep.description,
    }));

    res.json({
      nodes,
      edges,
      dependencies: result.rows,
    });
  } catch (error) {
    console.error('Error fetching dependency graph:', error);
    res.status(500).json({ error: 'Failed to fetch dependency graph' });
  }
});

// GET dependency statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_dependencies,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'broken') as broken_count,
        COUNT(*) FILTER (WHERE dependency_type = 'depends_on') as depends_on_count,
        COUNT(*) FILTER (WHERE dependency_type = 'blocks') as blocks_count,
        COUNT(*) FILTER (WHERE dependency_type = 'related_to') as related_count,
        COUNT(*) FILTER (WHERE strength = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE strength = 'strong') as strong_count
      FROM dependencies
    `;

    const typeQuery = `
      SELECT
        dependency_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE strength = 'critical' OR strength = 'strong') as high_strength_count
      FROM dependencies
      WHERE status = 'active'
      GROUP BY dependency_type
      ORDER BY count DESC
    `;

    const [statsResult, typeResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(typeQuery),
    ]);

    res.json({
      summary: statsResult.rows[0],
      by_type: typeResult.rows,
    });
  } catch (error) {
    console.error('Error fetching dependency statistics:', error);
    res.status(500).json({ error: 'Failed to fetch dependency statistics' });
  }
});

// POST create new dependency
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      source_type,
      source_id,
      target_type,
      target_id,
      dependency_type = 'depends_on',
      description,
      strength = 'medium',
      status = 'active',
    } = req.body;

    // Validation
    if (!source_type || !source_id || !target_type || !target_id) {
      return res.status(400).json({ error: 'source_type, source_id, target_type, and target_id are required' });
    }

    // Prevent self-dependencies
    if (source_type === target_type && source_id === target_id) {
      return res.status(400).json({ error: 'Cannot create a dependency from an entity to itself' });
    }

    const result = await pool.query(
      `INSERT INTO dependencies (
        source_type, source_id, target_type, target_id, dependency_type,
        description, strength, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (source_type, source_id, target_type, target_id, dependency_type) DO UPDATE
      SET description = EXCLUDED.description,
          strength = EXCLUDED.strength,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [source_type, source_id, target_type, target_id, dependency_type, description || null, strength, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating dependency:', error);
    res.status(500).json({ error: 'Failed to create dependency' });
  }
});

// PUT update dependency
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dependency_type, description, strength, status } = req.body;

    const result = await pool.query(
      `UPDATE dependencies SET
        dependency_type = COALESCE($1, dependency_type),
        description = COALESCE($2, description),
        strength = COALESCE($3, strength),
        status = COALESCE($4, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *`,
      [dependency_type, description, strength, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating dependency:', error);
    res.status(500).json({ error: 'Failed to update dependency' });
  }
});

// DELETE dependency
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM dependencies WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found' });
    }

    res.json({ message: 'Dependency deleted successfully', dependency: result.rows[0] });
  } catch (error) {
    console.error('Error deleting dependency:', error);
    res.status(500).json({ error: 'Failed to delete dependency' });
  }
});

// POST analyze impact (find all dependencies affected by a change)
router.post('/analyze/impact', async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, max_depth = 3 } = req.body;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: 'entity_type and entity_id are required' });
    }

    // Recursive query to find all dependencies up to max_depth levels
    const impactQuery = `
      WITH RECURSIVE dependency_tree AS (
        -- Base case: direct dependencies
        SELECT
          id, source_type, source_id, target_type, target_id,
          dependency_type, strength, status, description, 1 as depth
        FROM dependencies
        WHERE source_type = $1 AND source_id = $2 AND status = 'active'

        UNION ALL

        -- Recursive case: follow the dependency chain
        SELECT
          d.id, d.source_type, d.source_id, d.target_type, d.target_id,
          d.dependency_type, d.strength, d.status, d.description, dt.depth + 1
        FROM dependencies d
        INNER JOIN dependency_tree dt ON d.source_type = dt.target_type AND d.source_id = dt.target_id
        WHERE d.status = 'active' AND dt.depth < $3
      )
      SELECT DISTINCT * FROM dependency_tree
      ORDER BY depth, dependency_type
    `;

    const result = await pool.query(impactQuery, [entity_type, entity_id, max_depth]);

    // Group by depth level
    const impactByDepth: Record<number, any[]> = {};
    result.rows.forEach((dep) => {
      if (!impactByDepth[dep.depth]) {
        impactByDepth[dep.depth] = [];
      }
      impactByDepth[dep.depth].push(dep);
    });

    res.json({
      entity: { type: entity_type, id: entity_id },
      total_affected: result.rows.length,
      max_depth_analyzed: max_depth,
      impact_by_depth: impactByDepth,
      all_dependencies: result.rows,
    });
  } catch (error) {
    console.error('Error analyzing dependency impact:', error);
    res.status(500).json({ error: 'Failed to analyze dependency impact' });
  }
});

// POST find circular dependencies
router.post('/analyze/circular', async (req: Request, res: Response) => {
  try {
    // Query to find circular dependencies
    const circularQuery = `
      WITH RECURSIVE dependency_chain AS (
        SELECT
          id, source_type, source_id, target_type, target_id,
          ARRAY[source_id] as path,
          false as is_circular
        FROM dependencies
        WHERE status = 'active'

        UNION ALL

        SELECT
          d.id, d.source_type, d.source_id, d.target_type, d.target_id,
          dc.path || d.source_id,
          d.target_id = ANY(dc.path)
        FROM dependencies d
        INNER JOIN dependency_chain dc ON d.source_type = dc.target_type AND d.source_id = dc.target_id
        WHERE NOT dc.is_circular AND array_length(dc.path, 1) < 10
      )
      SELECT * FROM dependency_chain
      WHERE is_circular = true
    `;

    const result = await pool.query(circularQuery);

    res.json({
      circular_dependencies_found: result.rows.length,
      circular_dependencies: result.rows,
    });
  } catch (error) {
    console.error('Error finding circular dependencies:', error);
    res.status(500).json({ error: 'Failed to find circular dependencies' });
  }
});

export default router;
