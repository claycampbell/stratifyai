import { Router, Request, Response } from 'express';
import pool from '../config/database';
import multer from 'multer';
import * as XLSX from 'xlsx';

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
        // Extract data from CSV columns
        const lead = row['Lead'] || row['lead'] || '';
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
        if (lead) descriptionParts.push(`Lead: ${lead}`);
        if (goal) descriptionParts.push(`Goal: ${goal}`);
        if (notes) descriptionParts.push(`Notes: ${notes}`);
        if (startDate) descriptionParts.push(`Start: ${startDate}`);
        if (endDate) descriptionParts.push(`End: ${endDate}`);

        const description = descriptionParts.join(' | ');

        // Insert KPI into database
        const result = await pool.query(
          `INSERT INTO kpis (name, description, target_value, current_value, unit, frequency, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            kpiName,
            description || '',
            targetValue,
            currentValue,
            unit || '',
            'quarterly', // Default frequency
            kpiStatus,
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
      name,
      description,
      target_value,
      current_value,
      unit,
      frequency,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await pool.query(
      `INSERT INTO kpis (ogsm_component_id, name, description, target_value, current_value, unit, frequency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        ogsm_component_id || null,
        name,
        description || '',
        target_value || null,
        current_value || null,
        unit || '',
        frequency || 'monthly',
        status || 'on_track',
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
    const { name, description, target_value, current_value, unit, frequency, status } = req.body;

    const result = await pool.query(
      `UPDATE kpis
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           target_value = COALESCE($3, target_value),
           current_value = COALESCE($4, current_value),
           unit = COALESCE($5, unit),
           frequency = COALESCE($6, frequency),
           status = COALESCE($7, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, description, target_value, current_value, unit, frequency, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPI not found' });
    }

    res.json(result.rows[0]);
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

    if (value === undefined || !recorded_date) {
      return res.status(400).json({ error: 'value and recorded_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO kpi_history (kpi_id, value, recorded_date, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, value, recorded_date, notes || '']
    );

    // Update current value in KPI
    await pool.query(
      `UPDATE kpis SET current_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [value, id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding KPI history:', error);
    res.status(500).json({ error: 'Failed to add KPI history' });
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

export default router;
