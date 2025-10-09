import { Router, Request, Response } from 'express';
import pool from '../config/database';
import KPIService from '../services/kpiService';

const router = Router();

// Get KPI templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query = 'SELECT * FROM kpi_templates WHERE is_public = TRUE';
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ' ORDER BY category, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPI templates:', error);
    res.status(500).json({ error: 'Failed to fetch KPI templates' });
  }
});

// Create KPI from template
router.post('/templates/:templateId/create', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { name, description, ogsm_component_id, owner_email } = req.body;

    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM kpi_templates WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Create KPI from template
    const result = await pool.query(
      `INSERT INTO kpis (
        name, description, target_value, unit, frequency,
        at_risk_threshold, off_track_threshold, validation_rules,
        ogsm_component_id, owner_email, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name || template.name,
        description || template.description,
        template.target_value,
        template.unit,
        template.frequency,
        template.at_risk_threshold,
        template.off_track_threshold,
        template.validation_rules,
        ogsm_component_id || null,
        owner_email || null,
        'on_track',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KPI from template:', error);
    res.status(500).json({ error: 'Failed to create KPI from template' });
  }
});

// Create KPI template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      target_value,
      unit,
      frequency,
      at_risk_threshold,
      off_track_threshold,
      validation_rules,
      created_by,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    const result = await pool.query(
      `INSERT INTO kpi_templates (
        name, description, category, target_value, unit, frequency,
        at_risk_threshold, off_track_threshold, validation_rules, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        description || '',
        category,
        target_value || null,
        unit || '',
        frequency || 'monthly',
        at_risk_threshold || 0.8,
        off_track_threshold || 0.6,
        validation_rules ? JSON.stringify(validation_rules) : null,
        created_by || 'system',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KPI template:', error);
    res.status(500).json({ error: 'Failed to create KPI template' });
  }
});

// Bulk update KPIs
router.post('/bulk/update', async (req: Request, res: Response) => {
  try {
    const { kpi_ids, updates, performed_by } = req.body;

    if (!kpi_ids || !Array.isArray(kpi_ids) || kpi_ids.length === 0) {
      return res.status(400).json({ error: 'kpi_ids array is required' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'updates object is required' });
    }

    const result = await KPIService.bulkUpdateKPIs(kpi_ids, updates, performed_by);

    res.json({
      message: 'Bulk update completed',
      success_count: result.success,
      error_count: result.errors,
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

// Bulk delete KPIs
router.post('/bulk/delete', async (req: Request, res: Response) => {
  try {
    const { kpi_ids, performed_by } = req.body;

    if (!kpi_ids || !Array.isArray(kpi_ids) || kpi_ids.length === 0) {
      return res.status(400).json({ error: 'kpi_ids array is required' });
    }

    const result = await KPIService.bulkDeleteKPIs(kpi_ids, performed_by);

    res.json({
      message: 'Bulk delete completed',
      success_count: result.success,
      error_count: result.errors,
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: 'Failed to perform bulk delete' });
  }
});

// Recalculate KPI status
router.post('/:id/recalculate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await KPIService.updateKPIWithCalculations(id);

    // Get updated KPI
    const result = await pool.query('SELECT * FROM kpis WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    res.json({
      message: 'KPI status recalculated',
      kpi: result.rows[0],
    });
  } catch (error) {
    console.error('Error recalculating KPI:', error);
    res.status(500).json({ error: 'Failed to recalculate KPI status' });
  }
});

// Get KPI alerts
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { kpi_id, acknowledged, severity, limit } = req.query;

    const alerts = await KPIService.getAlerts({
      kpiId: kpi_id as string,
      acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
      severity: severity as string,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts for specific KPI
router.get('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const alerts = await KPIService.getAlerts({
      kpiId: id,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching KPI alerts:', error);
    res.status(500).json({ error: 'Failed to fetch KPI alerts' });
  }
});

// Acknowledge alert
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { acknowledged_by } = req.body;

    await KPIService.acknowledgeAlert(alertId, acknowledged_by || 'user');

    res.json({ message: 'Alert acknowledged successfully' });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Validate KPI value
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { value, validation_rules } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'value is required' });
    }

    const result = KPIService.validateKPIValue(value, validation_rules);

    res.json(result);
  } catch (error) {
    console.error('Error validating KPI value:', error);
    res.status(500).json({ error: 'Failed to validate KPI value' });
  }
});

// Get bulk operations history
router.get('/bulk/history', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const result = await pool.query(
      `SELECT * FROM bulk_operations
       WHERE entity_type = 'kpis'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bulk operations history:', error);
    res.status(500).json({ error: 'Failed to fetch bulk operations history' });
  }
});

export default router;
