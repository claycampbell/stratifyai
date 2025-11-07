import { Router, Request, Response } from 'express';
import philosophyService from '../services/philosophyService';

const router = Router();

// ============================================================================
// Philosophy Management Routes
// ============================================================================

/**
 * GET /api/philosophy/documents
 * Get all active philosophy documents (for admin management)
 * Returns: Array of PhilosophyDocument
 */
router.get('/documents', async (req: Request, res: Response) => {
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
 * Create/update philosophy document
 * Body: { type, category?, title, content, priority_weight? }
 * Returns: Created/updated PhilosophyDocument
 */
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const { type, category, title, content, priority_weight } = req.body;

    // Validate required fields
    if (!type || !title || !content) {
      return res.status(400).json({
        error: 'Missing required fields: type, title, content are required',
      });
    }

    // Validate type
    const validTypes = [
      'mission',
      'vision',
      'purpose',
      'value',
      'guiding_principle',
      'operating_principle',
      'theme',
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Create philosophy document using pool directly since service doesn't have create method yet
    const pool = require('../config/database').default;
    const result = await pool.query(
      `INSERT INTO philosophy_documents (type, category, title, content, priority_weight, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [type, category || null, title, content, priority_weight || 50, true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating philosophy document:', error);
    res.status(500).json({ error: 'Failed to create philosophy document' });
  }
});

/**
 * GET /api/philosophy/non-negotiables
 * Get all non-negotiables
 * Returns: Array of NonNegotiable
 */
router.get('/non-negotiables', async (req: Request, res: Response) => {
  try {
    const rules = await philosophyService.getActiveNonNegotiables();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching non-negotiables:', error);
    res.status(500).json({ error: 'Failed to fetch non-negotiables' });
  }
});

/**
 * GET /api/philosophy/decision-hierarchy
 * Get decision hierarchy
 * Returns: Array of DecisionHierarchyLevel
 */
router.get('/decision-hierarchy', async (req: Request, res: Response) => {
  try {
    const hierarchy = await philosophyService.getDecisionHierarchy();
    res.json(hierarchy);
  } catch (error) {
    console.error('Error fetching decision hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch decision hierarchy' });
  }
});

/**
 * POST /api/philosophy/validate
 * Validate a recommendation against philosophy
 * Body: { recommendationText, chatHistoryId? }
 * Returns: ValidationResult
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { recommendationText, chatHistoryId } = req.body;

    // Validate required fields
    if (!recommendationText) {
      return res.status(400).json({
        error: 'Missing required field: recommendationText is required',
      });
    }

    // Validate recommendation
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
 * Get recent validation history
 * Query params: limit (default: 5)
 * Returns: Array of validation records with non-negotiable details
 */
router.get('/validations/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const pool = require('../config/database').default;

    const result = await pool.query(
      `SELECT
        v.id,
        v.chat_history_id,
        v.recommendation_text,
        v.validation_status,
        v.violated_constraints,
        v.decision_hierarchy_alignment,
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
               v.violated_constraints, v.decision_hierarchy_alignment, v.created_at
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

export default router;
