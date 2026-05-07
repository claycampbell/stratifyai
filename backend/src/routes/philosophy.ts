import { Router, Request, Response } from 'express';
import philosophyService from '../services/philosophyService';
import pool from '../config/database';

const router = Router();

// ============================================================================
// Philosophy Management Routes
// ============================================================================

const VALID_DOC_TYPES = [
  'mission',
  'vision',
  'purpose',
  'value',
  'guiding_principle',
  'operating_principle',
  'theme',
];

const VALID_ENFORCEMENT_TYPES = [
  'hard_constraint',
  'priority_rule',
  'operational_expectation',
];

// ----------------------------------------------------------------------------
// philosophy_documents
// ----------------------------------------------------------------------------

/**
 * GET /api/philosophy/documents
 * Get all active philosophy documents (for admin management)
 */
router.get('/documents', async (_req: Request, res: Response) => {
  try {
    const docs = await philosophyService.getActivePhilosophy();
    res.json(docs);
  } catch (error) {
    console.error('Error fetching philosophy documents:', error);
    res.status(500).json({ error: 'Failed to fetch philosophy documents' });
  }
});

/**
 * POST /api/philosophy/documents
 * Create a philosophy document.
 */
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const { type, category, title, content, priority_weight } = req.body;

    if (!type || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: type, title, content are required',
      });
    }

    if (!VALID_DOC_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO philosophy_documents (type, category, title, content, priority_weight, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [type, category || null, title, content, priority_weight ?? 50, true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating philosophy document:', error);
    res.status(500).json({ error: 'Failed to create philosophy document' });
  }
});

/**
 * PUT /api/philosophy/documents/:id
 * Partial update on a philosophy document.
 */
router.put('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, category, title, content, priority_weight, is_active } = req.body;

    if (type !== undefined && !VALID_DOC_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      });
    }

    const result = await pool.query(
      `UPDATE philosophy_documents
       SET type = COALESCE($1, type),
           category = COALESCE($2, category),
           title = COALESCE($3, title),
           content = COALESCE($4, content),
           priority_weight = COALESCE($5, priority_weight),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        type ?? null,
        category ?? null,
        title ?? null,
        content ?? null,
        priority_weight ?? null,
        is_active ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Philosophy document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating philosophy document:', error);
    res.status(500).json({ error: 'Failed to update philosophy document' });
  }
});

/**
 * DELETE /api/philosophy/documents/:id
 */
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM philosophy_documents WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Philosophy document not found' });
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting philosophy document:', error);
    res.status(500).json({ error: 'Failed to delete philosophy document' });
  }
});

// ----------------------------------------------------------------------------
// non_negotiables
// ----------------------------------------------------------------------------

/**
 * GET /api/philosophy/non-negotiables
 */
router.get('/non-negotiables', async (_req: Request, res: Response) => {
  try {
    const rules = await philosophyService.getActiveNonNegotiables();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching non-negotiables:', error);
    res.status(500).json({ error: 'Failed to fetch non-negotiables' });
  }
});

/**
 * GET /api/philosophy/non-negotiables/:id
 */
router.get('/non-negotiables/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM non_negotiables WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Non-negotiable not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching non-negotiable:', error);
    res.status(500).json({ error: 'Failed to fetch non-negotiable' });
  }
});

/**
 * POST /api/philosophy/non-negotiables
 */
router.post('/non-negotiables', async (req: Request, res: Response) => {
  try {
    const {
      rule_number,
      title,
      description,
      enforcement_type,
      auto_reject,
      validation_keywords,
      is_active,
    } = req.body;

    if (rule_number === undefined || rule_number === null || !title || !description || !enforcement_type) {
      return res.status(400).json({
        error: 'Missing required fields: rule_number, title, description, enforcement_type',
      });
    }

    if (!VALID_ENFORCEMENT_TYPES.includes(enforcement_type)) {
      return res.status(400).json({
        error: `Invalid enforcement_type. Must be one of: ${VALID_ENFORCEMENT_TYPES.join(', ')}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO non_negotiables
       (rule_number, title, description, enforcement_type, auto_reject, validation_keywords, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        rule_number,
        title,
        description,
        enforcement_type,
        auto_reject ?? false,
        validation_keywords ?? [],
        is_active ?? true,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating non-negotiable:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'rule_number must be unique' });
    }
    res.status(500).json({ error: 'Failed to create non-negotiable' });
  }
});

/**
 * PUT /api/philosophy/non-negotiables/:id
 */
router.put('/non-negotiables/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      rule_number,
      title,
      description,
      enforcement_type,
      auto_reject,
      validation_keywords,
      is_active,
    } = req.body;

    if (enforcement_type !== undefined && !VALID_ENFORCEMENT_TYPES.includes(enforcement_type)) {
      return res.status(400).json({
        error: `Invalid enforcement_type. Must be one of: ${VALID_ENFORCEMENT_TYPES.join(', ')}`,
      });
    }

    const result = await pool.query(
      `UPDATE non_negotiables
       SET rule_number = COALESCE($1, rule_number),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           enforcement_type = COALESCE($4, enforcement_type),
           auto_reject = COALESCE($5, auto_reject),
           validation_keywords = COALESCE($6, validation_keywords),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        rule_number ?? null,
        title ?? null,
        description ?? null,
        enforcement_type ?? null,
        auto_reject === undefined ? null : auto_reject,
        validation_keywords ?? null,
        is_active === undefined ? null : is_active,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Non-negotiable not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating non-negotiable:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'rule_number must be unique' });
    }
    res.status(500).json({ error: 'Failed to update non-negotiable' });
  }
});

/**
 * DELETE /api/philosophy/non-negotiables/:id
 */
router.delete('/non-negotiables/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM non_negotiables WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Non-negotiable not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('Error deleting non-negotiable:', error);
    res.status(500).json({ error: 'Failed to delete non-negotiable' });
  }
});

// ----------------------------------------------------------------------------
// decision_hierarchy
// ----------------------------------------------------------------------------

/**
 * GET /api/philosophy/decision-hierarchy
 */
router.get('/decision-hierarchy', async (_req: Request, res: Response) => {
  try {
    const hierarchy = await philosophyService.getDecisionHierarchy();
    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching decision hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch decision hierarchy' });
  }
});

/**
 * GET /api/philosophy/decision-hierarchy/:id
 */
router.get('/decision-hierarchy/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM decision_hierarchy WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision hierarchy level not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching decision hierarchy level:', error);
    res.status(500).json({ error: 'Failed to fetch decision hierarchy level' });
  }
});

/**
 * POST /api/philosophy/decision-hierarchy
 */
router.post('/decision-hierarchy', async (req: Request, res: Response) => {
  try {
    const { level, stakeholder, description, weight } = req.body;

    if (level === undefined || level === null || !stakeholder || weight === undefined || weight === null) {
      return res.status(400).json({
        error: 'Missing required fields: level, stakeholder, weight',
      });
    }

    const result = await pool.query(
      `INSERT INTO decision_hierarchy (level, stakeholder, description, weight)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [level, stakeholder, description ?? null, weight]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating decision hierarchy level:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'level must be unique' });
    }
    res.status(500).json({ error: 'Failed to create decision hierarchy level' });
  }
});

/**
 * PUT /api/philosophy/decision-hierarchy/:id
 */
router.put('/decision-hierarchy/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { level, stakeholder, description, weight } = req.body;

    const result = await pool.query(
      `UPDATE decision_hierarchy
       SET level = COALESCE($1, level),
           stakeholder = COALESCE($2, stakeholder),
           description = COALESCE($3, description),
           weight = COALESCE($4, weight)
       WHERE id = $5
       RETURNING *`,
      [
        level ?? null,
        stakeholder ?? null,
        description ?? null,
        weight ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision hierarchy level not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating decision hierarchy level:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'level must be unique' });
    }
    res.status(500).json({ error: 'Failed to update decision hierarchy level' });
  }
});

/**
 * DELETE /api/philosophy/decision-hierarchy/:id
 */
router.delete('/decision-hierarchy/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM decision_hierarchy WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Decision hierarchy level not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('Error deleting decision hierarchy level:', error);
    res.status(500).json({ error: 'Failed to delete decision hierarchy level' });
  }
});

// ----------------------------------------------------------------------------
// Validations
// ----------------------------------------------------------------------------

/**
 * POST /api/philosophy/validate
 * Validate a recommendation against philosophy.
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { recommendationText, chatHistoryId } = req.body;

    if (!recommendationText) {
      return res.status(400).json({
        error: 'Missing required field: recommendationText is required',
      });
    }

    const validation = await philosophyService.validateRecommendation(
      recommendationText,
      chatHistoryId
    );

    res.json(validation);
  } catch (error) {
    console.error('Error validating recommendation:', error);
    res.status(500).json({ error: 'Failed to validate recommendation' });
  }
});

/**
 * GET /api/philosophy/validations/recent
 */
router.get('/validations/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const result = await pool.query(
      `SELECT
        v.id,
        v.chat_history_id,
        v.recommendation_text,
        v.validation_status,
        v.violated_constraints,
        v.decision_hierarchy_alignment,
        v.source_entity_type,
        v.source_entity_id,
        v.created_at,
        ARRAY_AGG(
          CASE
            WHEN nn.id IS NOT NULL THEN
              json_build_object(
                'id', nn.id,
                'rule_number', nn.rule_number,
                'title', nn.title,
                'description', nn.description,
                'auto_reject', nn.auto_reject
              )
            ELSE NULL
          END
        ) FILTER (WHERE nn.id IS NOT NULL) as violated_non_negotiables
      FROM ai_recommendation_validations v
      LEFT JOIN LATERAL unnest(v.violated_constraints) as constraint_id ON true
      LEFT JOIN non_negotiables nn ON nn.id = constraint_id
      GROUP BY v.id, v.chat_history_id, v.recommendation_text, v.validation_status,
               v.violated_constraints, v.decision_hierarchy_alignment,
               v.source_entity_type, v.source_entity_id, v.created_at
      ORDER BY v.created_at DESC
      LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent validations:', error);
    res.status(500).json({ error: 'Failed to fetch recent validations' });
  }
});

/**
 * GET /api/philosophy/validations/:id
 *
 * Returns a single validation row with:
 * - violated non-negotiables (joined)
 * - actor display info (chat_history.user_id -> users.first_name/last_name if joinable)
 * - source_entity snapshot when source_entity_type+id are populated and the
 *   referenced row still exists. Returns null otherwise.
 *
 * V-1 / V-2.
 */
router.get('/validations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Pull validation + violated non-negotiables + actor info via chat_history
    const validationResult = await pool.query(
      `SELECT
        v.id,
        v.chat_history_id,
        v.recommendation_text,
        v.validation_status,
        v.violated_constraints,
        v.decision_hierarchy_alignment,
        v.conflict_resolution,
        v.transparency_score,
        v.source_entity_type,
        v.source_entity_id,
        v.created_at,
        ch.user_id as actor_user_id,
        ARRAY_AGG(
          CASE
            WHEN nn.id IS NOT NULL THEN
              json_build_object(
                'id', nn.id,
                'rule_number', nn.rule_number,
                'title', nn.title,
                'description', nn.description,
                'auto_reject', nn.auto_reject
              )
            ELSE NULL
          END
        ) FILTER (WHERE nn.id IS NOT NULL) as violated_non_negotiables
      FROM ai_recommendation_validations v
      LEFT JOIN chat_history ch ON ch.id = v.chat_history_id
      LEFT JOIN LATERAL unnest(v.violated_constraints) as constraint_id ON true
      LEFT JOIN non_negotiables nn ON nn.id = constraint_id
      WHERE v.id = $1
      GROUP BY v.id, ch.user_id`,
      [id]
    );

    if (validationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Validation not found' });
    }

    const row = validationResult.rows[0];

    // Resolve actor name. The users table is created in migration 002 and may
    // not exist on every environment, so fail soft.
    let actorName: string | null = null;
    if (row.actor_user_id) {
      try {
        const userResult = await pool.query(
          `SELECT first_name, last_name, email FROM users WHERE id = $1`,
          [row.actor_user_id]
        );
        if (userResult.rows.length > 0) {
          const u = userResult.rows[0];
          const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
          actorName = fullName || u.email || null;
        }
      } catch (userErr) {
        console.warn('[validations/:id] could not resolve actor name:', userErr);
      }
    }

    // Resolve source-entity snapshot.
    let sourceEntity: any = null;
    if (row.source_entity_type && row.source_entity_id) {
      sourceEntity = await fetchSourceEntitySnapshot(
        row.source_entity_type,
        row.source_entity_id
      );
    }

    res.json({
      ...row,
      actor_user_id: row.actor_user_id ?? null,
      actor_name: actorName,
      source_entity: sourceEntity,
    });
  } catch (error) {
    console.error('Error fetching validation detail:', error);
    res.status(500).json({ error: 'Failed to fetch validation detail' });
  }
});

/**
 * Look up the entity referenced by (source_entity_type, source_entity_id) and
 * return a small snapshot. Returns null if the entity has been deleted or the
 * type is not recognized.
 */
async function fetchSourceEntitySnapshot(
  entityType: string,
  entityId: string
): Promise<any | null> {
  try {
    // Normalize the trigger-style type names ('kpi_update', 'ogsm_edit',
    // 'plan_item_change') to the underlying table.
    const normalized = entityType.toLowerCase();

    if (normalized.startsWith('kpi')) {
      const r = await pool.query(
        `SELECT id, name, current_value, target_value, unit
         FROM kpis WHERE id = $1`,
        [entityId]
      );
      if (r.rows.length === 0) return null;
      return { type: 'kpi', ...r.rows[0] };
    }

    if (normalized.startsWith('ogsm')) {
      const r = await pool.query(
        `SELECT id, title, component_type
         FROM ogsm_components WHERE id = $1`,
        [entityId]
      );
      if (r.rows.length === 0) return null;
      return { type: 'ogsm_component', ...r.rows[0] };
    }

    if (normalized.startsWith('plan_item')) {
      const r = await pool.query(
        `SELECT id, title, timeframe, status
         FROM plan_items WHERE id = $1`,
        [entityId]
      );
      if (r.rows.length === 0) return null;
      return { type: 'plan_item', ...r.rows[0] };
    }

    return null;
  } catch (error) {
    // If the table doesn't exist on this environment (e.g. plan_items not
    // migrated) treat as "no snapshot available" rather than failing the
    // whole request.
    console.warn('[fetchSourceEntitySnapshot] lookup failed:', error);
    return null;
  }
}

export default router;
