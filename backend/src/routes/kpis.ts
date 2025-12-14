import { Router, Request, Response } from 'express';
import pool from '../config/database';
import multer from 'multer';
import * as XLSX from 'xlsx-js-style';
import KPIService from '../services/kpiService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all KPIs
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, frequency } = req.query;

    let query = 'SELECT * FROM kpis';
    const params: any[] = [];

    if (status || frequency) {
      query += ' WHERE';
      if (status) {
        params.push(status);
        query += ` status = $${params.length}`;
      }
      if (frequency) {
        if (params.length > 0) query += ' AND';
        params.push(frequency);
        query += ` frequency = $${params.length}`;
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// Import KPIs from CSV (must be before /:id route)
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV/Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    const importedKPIs: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];

      // Skip empty rows or header-like rows
      const kpiName = row['KPIs'] || row['kpis'] || row['Name'] || row['name'];
      if (!kpiName || kpiName.trim() === '' || kpiName.toLowerCase().includes('kpi')) {
        continue;
      }

      try {
        // Extract data from CSV columns (support both old "Lead" and new "Ownership" terminology)
        const ownership = row['Ownership'] || row['ownership'] || row['Lead'] || row['lead'] || '';
        const goal = row['Goal'] || row['goal'] || '';
        const status = row['Status'] || row['status'] || 'on_track';
        const startDate = row['Start Date'] || row['start_date'] || row['Start Date '];
        const endDate = row['End Date'] || row['end_date'];
        const notes = row['Notes'] || row['notes'] || '';

        // Parse target and current values from goal if it's numeric
        let targetValue = null;
        let currentValue = null;
        let unit = '';

        // Try to extract numeric values from goal
        if (goal) {
          const goalStr = String(goal).trim();
          // Match patterns like "200", "$500,000", "75%", "1,200", etc.
          const numericMatch = goalStr.match(/[\d,]+\.?\d*/);
          if (numericMatch) {
            targetValue = parseFloat(numericMatch[0].replace(/,/g, ''));
            // Extract unit (%, $, etc.)
            const unitMatch = goalStr.match(/[%$]|above|below/i);
            if (unitMatch) {
              unit = unitMatch[0];
            }
          }
        }

        // Determine status mapping
        let kpiStatus: 'on_track' | 'at_risk' | 'off_track' = 'on_track';
        const statusLower = String(status).toLowerCase();
        if (statusLower === 'completed' || statusLower === 'complete') {
          kpiStatus = 'on_track';
        } else if (statusLower.includes('progress') || statusLower.includes('in progress')) {
          kpiStatus = 'at_risk';
        } else if (statusLower === 'off_track' || statusLower === 'off track') {
          kpiStatus = 'off_track';
        }

        // Build description from available fields
        const descriptionParts: string[] = [];
        if (goal) descriptionParts.push(`Goal: ${goal}`);
        if (notes) descriptionParts.push(`Notes: ${notes}`);
        if (startDate) descriptionParts.push(`Start: ${startDate}`);
        if (endDate) descriptionParts.push(`End: ${endDate}`);

        const description = descriptionParts.join(' | ');

        // Insert KPI into database with new ownership field
        const result = await pool.query(
          `INSERT INTO kpis (name, description, target_value, current_value, unit, frequency, status, ownership)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            kpiName,
            description || '',
            targetValue,
            currentValue,
            unit || '',
            'quarterly', // Default frequency
            kpiStatus,
            ownership || null,
          ]
        );

        importedKPIs.push(result.rows[0]);
      } catch (error: any) {
        errors.push({
          row: i + 1,
          kpi: kpiName,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      imported: importedKPIs.length,
      errors: errors.length,
      kpis: importedKPIs,
      errorDetails: errors,
    });
  } catch (error) {
    console.error('Error importing KPIs:', error);
    res.status(500).json({ error: 'Failed to import KPIs from CSV' });
  }
});

// Get KPI by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM kpis WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching KPI:', error);
    res.status(500).json({ error: 'Failed to fetch KPI' });
  }
});

// Create KPI
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      ogsm_component_id,
      category_id,
      name,
      description,
      target_value,
      current_value,
      unit,
      frequency,
      status,
      ownership,
      persons_responsible,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await pool.query(
      `INSERT INTO kpis (ogsm_component_id, category_id, name, description, target_value, current_value, unit, frequency, status, ownership, persons_responsible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        ogsm_component_id || null,
        category_id || null,
        name,
        description || '',
        target_value || null,
        current_value || null,
        unit || '',
        frequency || 'monthly',
        status || 'on_track',
        ownership || null,
        persons_responsible || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating KPI:', error);
    res.status(500).json({ error: 'Failed to create KPI' });
  }
});

// Update KPI
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, target_value, current_value, unit, frequency, status, owner_email, tags, validation_rules, ownership, persons_responsible, category_id } = req.body;

    // Validate value if validation rules are provided
    if (current_value !== undefined && validation_rules) {
      const validation = KPIService.validateKPIValue(current_value, validation_rules);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
      }
    }

    const result = await pool.query(
      `UPDATE kpis
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           target_value = COALESCE($3, target_value),
           current_value = COALESCE($4, current_value),
           unit = COALESCE($5, unit),
           frequency = COALESCE($6, frequency),
           status = COALESCE($7, status),
           owner_email = COALESCE($8, owner_email),
           tags = COALESCE($9, tags),
           validation_rules = COALESCE($10, validation_rules),
           ownership = COALESCE($11, ownership),
           persons_responsible = COALESCE($12, persons_responsible),
           category_id = COALESCE($13, category_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [name, description, target_value, current_value, unit, frequency, status, owner_email, tags, validation_rules ? JSON.stringify(validation_rules) : null, ownership, persons_responsible, category_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    // Auto-calculate status if current_value or target_value changed
    if (current_value !== undefined || target_value !== undefined) {
      try {
        await KPIService.updateKPIWithCalculations(id);
      } catch (calcError) {
        console.error('Error auto-calculating KPI status:', calcError);
        // Don't fail the update if calculation fails
      }
    }

    // Get updated KPI
    const updatedResult = await pool.query('SELECT * FROM kpis WHERE id = $1', [id]);

    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({ error: 'Failed to update KPI' });
  }
});

// Delete KPI
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM kpis WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    res.json({ message: 'KPI deleted successfully' });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    res.status(500).json({ error: 'Failed to delete KPI' });
  }
});

// Add KPI history entry
router.post('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { value, recorded_date, notes } = req.body;

    console.log(`[KPI History] Adding entry for KPI ${id}:`, { value, recorded_date, notes });

    if (value === undefined || !recorded_date) {
      console.log('[KPI History] Validation failed: missing required fields');
      return res.status(400).json({ error: 'value and recorded_date are required' });
    }

    // Get KPI to check validation rules (if column exists)
    try {
      const kpiResult = await pool.query('SELECT validation_rules FROM kpis WHERE id = $1', [id]);
      if (kpiResult.rows.length > 0 && kpiResult.rows[0].validation_rules) {
        const validation = KPIService.validateKPIValue(value, kpiResult.rows[0].validation_rules);
        if (!validation.isValid) {
          console.log('[KPI History] Validation failed:', validation.errors);
          return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
        }
      }
    } catch (validationError) {
      // If validation_rules column doesn't exist, skip validation
      console.log('[KPI History] Skipping validation (validation_rules column may not exist)');
    }

    console.log('[KPI History] Inserting history entry...');
    const result = await pool.query(
      `INSERT INTO kpi_history (kpi_id, value, recorded_date, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, value, recorded_date, notes || '']
    );
    console.log('[KPI History] Insert successful:', result.rows[0].id);

    // Update current value in KPI
    console.log('[KPI History] Updating current_value in kpis table...');
    await pool.query(
      `UPDATE kpis SET current_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [value, id]
    );
    console.log('[KPI History] Current value updated');

    // Auto-calculate status and trend
    console.log('[KPI History] Calculating status and trend...');
    try {
      await KPIService.updateKPIWithCalculations(id);
      console.log('[KPI History] Status calculation complete');
    } catch (calcError) {
      console.error('[KPI History] Error auto-calculating KPI status:', calcError);
      // Don't fail the whole request if calculation fails
    }

    console.log('[KPI History] Entry added successfully');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('[KPI History] Error adding KPI history:', error);
    console.error('[KPI History] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to add KPI history',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get KPI history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM kpi_history WHERE kpi_id = $1 ORDER BY recorded_date DESC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching KPI history:', error);
    res.status(500).json({ error: 'Failed to fetch KPI history' });
  }
});

// Get KPI statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const kpiResult = await pool.query('SELECT * FROM kpis WHERE id = $1', [id]);
    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    const historyResult = await pool.query(
      `SELECT
        COUNT(*) as data_points,
        AVG(value) as average_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        MIN(recorded_date) as first_date,
        MAX(recorded_date) as last_date
       FROM kpi_history
       WHERE kpi_id = $1`,
      [id]
    );

    const stats = {
      kpi: kpiResult.rows[0],
      statistics: historyResult.rows[0],
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching KPI stats:', error);
    res.status(500).json({ error: 'Failed to fetch KPI statistics' });
  }
});

// Get KPI forecast
router.get('/:id/forecast', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { periods = 6 } = req.query;

    const kpiResult = await pool.query('SELECT * FROM kpis WHERE id = $1', [id]);
    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    const kpi = kpiResult.rows[0];

    // Get historical data
    const historyResult = await pool.query(
      'SELECT value, recorded_date FROM kpi_history WHERE kpi_id = $1 ORDER BY recorded_date ASC',
      [id]
    );

    const history = historyResult.rows;

    if (history.length < 2) {
      return res.json({
        forecast: [],
        trend: 'insufficient_data',
        confidence: 'low',
        message: 'Need at least 2 historical data points for forecasting',
      });
    }

    // Simple linear regression for forecasting
    const n = history.length;
    const xValues = history.map((_: any, i: number) => i);
    const yValues = history.map((h: any) => parseFloat(h.value));

    const sumX = xValues.reduce((a: number, b: number) => a + b, 0);
    const sumY = yValues.reduce((a: number, b: number) => a + b, 0);
    const sumXY = xValues.reduce((acc: number, x: number, i: number) => acc + x * yValues[i], 0);
    const sumX2 = xValues.reduce((acc: number, x: number) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecastPeriods = parseInt(periods as string) || 6;
    const forecast = [];
    const lastDate = new Date(history[history.length - 1].recorded_date);

    for (let i = 1; i <= forecastPeriods; i++) {
      const forecastDate = new Date(lastDate);

      // Increment date based on KPI frequency
      switch (kpi.frequency) {
        case 'daily':
          forecastDate.setDate(lastDate.getDate() + i);
          break;
        case 'weekly':
          forecastDate.setDate(lastDate.getDate() + i * 7);
          break;
        case 'monthly':
          forecastDate.setMonth(lastDate.getMonth() + i);
          break;
        case 'quarterly':
          forecastDate.setMonth(lastDate.getMonth() + i * 3);
          break;
        case 'annual':
          forecastDate.setFullYear(lastDate.getFullYear() + i);
          break;
      }

      const predictedValue = slope * (n + i - 1) + intercept;
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted_value: Math.round(predictedValue * 100) / 100,
        confidence_interval: {
          lower: Math.round((predictedValue * 0.9) * 100) / 100,
          upper: Math.round((predictedValue * 1.1) * 100) / 100,
        },
      });
    }

    // Determine trend
    let trend = 'stable';
    if (slope > 0.1) trend = 'increasing';
    if (slope < -0.1) trend = 'decreasing';

    // Assess if on track to meet target
    const targetGap = kpi.target_value
      ? Math.abs(kpi.target_value - forecast[forecast.length - 1].predicted_value)
      : null;

    res.json({
      forecast,
      trend,
      slope: Math.round(slope * 100) / 100,
      confidence: history.length >= 5 ? 'medium' : 'low',
      target_gap: targetGap,
      on_track: kpi.target_value
        ? Math.abs(forecast[forecast.length - 1].predicted_value - kpi.target_value) / kpi.target_value < 0.1
        : null,
    });
  } catch (error) {
    console.error('Error generating KPI forecast:', error);
    res.status(500).json({ error: 'Failed to generate KPI forecast' });
  }
});

// Get AI-powered next best actions for KPI
router.get('/:id/actions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const kpiResult = await pool.query('SELECT * FROM kpis WHERE id = $1', [id]);
    if (kpiResult.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    const kpi = kpiResult.rows[0];

    // Get historical data
    const historyResult = await pool.query(
      'SELECT value, recorded_date FROM kpi_history WHERE kpi_id = $1 ORDER BY recorded_date DESC LIMIT 10',
      [id]
    );

    const history = historyResult.rows;

    // Import OpenAIService dynamically
    const { OpenAIService } = await import('../services/openaiService');
    const openaiService = new OpenAIService();

    // Generate AI recommendations
    const contextData = {
      kpi_name: kpi.name,
      description: kpi.description,
      current_value: kpi.current_value,
      target_value: kpi.target_value,
      unit: kpi.unit,
      status: kpi.status,
      frequency: kpi.frequency,
      recent_history: history.slice(0, 5),
    };

    const prompt = `
      As an AI Chief Strategy Officer, analyze this KPI and provide actionable next best actions.

      KPI Details:
      - Name: ${kpi.name}
      - Description: ${kpi.description || 'N/A'}
      - Current Value: ${kpi.current_value} ${kpi.unit}
      - Target Value: ${kpi.target_value} ${kpi.unit}
      - Status: ${kpi.status}
      - Frequency: ${kpi.frequency}
      - Recent History: ${JSON.stringify(history.slice(0, 5))}

      Please provide:
      1. 3-5 specific, actionable next best actions to improve this KPI
      2. Priority level for each action (high, medium, low)
      3. Expected impact of each action
      4. Estimated timeframe for each action

      Return the response in JSON format:
      {
        "actions": [
          {
            "title": "Action title",
            "description": "Detailed description",
            "priority": "high|medium|low",
            "expected_impact": "Description of expected impact",
            "timeframe": "1-2 weeks",
            "category": "process|people|technology|strategy"
          }
        ],
        "insights": "Overall insights about the KPI performance",
        "risk_factors": ["List of risk factors to watch"]
      }

      Return ONLY the JSON, no additional text.
    `;

    const result = await openaiService.chatWithContext(prompt, JSON.stringify(contextData));

    // Try to extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const recommendations = JSON.parse(jsonMatch[0]);
      res.json(recommendations);
    } else {
      // Fallback to plain text response
      res.json({
        actions: [],
        insights: result,
        risk_factors: [],
      });
    }
  } catch (error) {
    console.error('Error generating KPI actions:', error);
    res.status(500).json({ error: 'Failed to generate KPI actions' });
  }
});

export default router;
