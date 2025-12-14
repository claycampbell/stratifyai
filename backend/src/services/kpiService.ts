import pool from '../config/database';

export interface ValidationRule {
  min?: number;
  max?: number;
  required?: boolean;
  allowNegative?: boolean;
  customRule?: string;
}

export interface KPIValidationResult {
  isValid: boolean;
  errors: string[];
}

export class KPIService {
  /**
   * Auto-calculate KPI status based on current vs target value
   */
  static calculateStatus(
    currentValue: number,
    targetValue: number,
    atRiskThreshold: number = 0.8,
    offTrackThreshold: number = 0.6
  ): 'on_track' | 'at_risk' | 'off_track' {
    if (!currentValue || !targetValue || targetValue === 0) {
      return 'at_risk';
    }

    const progressRatio = currentValue / targetValue;

    if (progressRatio >= atRiskThreshold) {
      return 'on_track';
    } else if (progressRatio >= offTrackThreshold) {
      return 'at_risk';
    } else {
      return 'off_track';
    }
  }

  /**
   * Calculate trend direction from KPI history
   */
  static async calculateTrend(kpiId: string): Promise<'up' | 'down' | 'stable'> {
    const historyResult = await pool.query(
      `SELECT value, recorded_date
       FROM kpi_history
       WHERE kpi_id = $1
       ORDER BY recorded_date DESC
       LIMIT 10`,
      [kpiId]
    );

    const history = historyResult.rows;

    if (history.length < 2) {
      return 'stable';
    }

    // Calculate simple moving average of last 5 vs previous 5
    const recentValues = history.slice(0, Math.min(5, history.length));
    const olderValues = history.slice(Math.min(5, history.length));

    if (olderValues.length === 0) {
      return 'stable';
    }

    const recentAvg = recentValues.reduce((sum, h) => sum + parseFloat(h.value), 0) / recentValues.length;
    const olderAvg = olderValues.reduce((sum, h) => sum + parseFloat(h.value), 0) / olderValues.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  /**
   * Update KPI with auto-calculated status and trend
   */
  static async updateKPIWithCalculations(kpiId: string): Promise<void> {
    // Get KPI data
    const kpiResult = await pool.query(
      `SELECT id, current_value, target_value, at_risk_threshold, off_track_threshold, auto_calculate_status, status
       FROM kpis WHERE id = $1`,
      [kpiId]
    );

    if (kpiResult.rows.length === 0) {
      throw new Error('KPI not found');
    }

    const kpi = kpiResult.rows[0];

    if (!kpi.auto_calculate_status) {
      return; // Don't auto-calculate if disabled
    }

    // Calculate status
    const newStatus = this.calculateStatus(
      kpi.current_value,
      kpi.target_value,
      kpi.at_risk_threshold || 0.8,
      kpi.off_track_threshold || 0.6
    );

    // Calculate trend
    const trend = await this.calculateTrend(kpiId);

    // Get old status for comparison
    const oldStatus = kpi.status;

    // Update KPI
    await pool.query(
      `UPDATE kpis
       SET status = $1, trend_direction = $2, last_calculated = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newStatus, trend, kpiId]
    );

    // Create alert if status changed
    if (oldStatus !== newStatus) {
      await this.createAlert(kpiId, 'status_change', {
        old_status: oldStatus,
        new_status: newStatus,
      });
    }
  }

  /**
   * Validate KPI value against validation rules
   */
  static validateKPIValue(value: number, rules?: ValidationRule): KPIValidationResult {
    const errors: string[] = [];

    if (!rules) {
      return { isValid: true, errors: [] };
    }

    // Check required
    if (rules.required && (value === null || value === undefined)) {
      errors.push('Value is required');
    }

    // Check min
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`Value must be at least ${rules.min}`);
    }

    // Check max
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`Value must not exceed ${rules.max}`);
    }

    // Check negative
    if (rules.allowNegative === false && value < 0) {
      errors.push('Negative values are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a KPI alert
   */
  static async createAlert(
    kpiId: string,
    alertType: string,
    metadata: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    // Get KPI details
    const kpiResult = await pool.query('SELECT name, status, owner_email FROM kpis WHERE id = $1', [kpiId]);

    if (kpiResult.rows.length === 0) {
      return;
    }

    const kpi = kpiResult.rows[0];

    let message = '';
    switch (alertType) {
      case 'status_change':
        message = `KPI "${kpi.name}" status changed from ${metadata.old_status} to ${metadata.new_status}`;
        severity = metadata.new_status === 'off_track' ? 'high' : 'medium';
        break;
      case 'threshold_breach':
        message = `KPI "${kpi.name}" has breached threshold`;
        severity = 'high';
        break;
      case 'overdue':
        message = `KPI "${kpi.name}" update is overdue`;
        severity = 'medium';
        break;
      default:
        message = `Alert for KPI "${kpi.name}"`;
    }

    await pool.query(
      `INSERT INTO kpi_alerts (kpi_id, alert_type, severity, message, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [kpiId, alertType, severity, message, JSON.stringify(metadata)]
    );

    // TODO: Send email notification if owner_email is set
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`Alert created for KPI ${kpiId}: ${message}`);
  }

  /**
   * Bulk update KPIs
   */
  static async bulkUpdateKPIs(
    kpiIds: string[],
    updates: Partial<{
      status: string;
      current_value: number;
      target_value: number;
      frequency: string;
      owner_email: string;
      tags: string[];
    }>,
    performedBy: string = 'system'
  ): Promise<{ success: number; errors: number }> {
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const kpiId of kpiIds) {
      try {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (updates.status !== undefined) {
          updateFields.push(`status = $${paramCount++}`);
          values.push(updates.status);
        }
        if (updates.current_value !== undefined) {
          updateFields.push(`current_value = $${paramCount++}`);
          values.push(updates.current_value);
        }
        if (updates.target_value !== undefined) {
          updateFields.push(`target_value = $${paramCount++}`);
          values.push(updates.target_value);
        }
        if (updates.frequency !== undefined) {
          updateFields.push(`frequency = $${paramCount++}`);
          values.push(updates.frequency);
        }
        if (updates.owner_email !== undefined) {
          updateFields.push(`owner_email = $${paramCount++}`);
          values.push(updates.owner_email);
        }
        if (updates.tags !== undefined) {
          updateFields.push(`tags = $${paramCount++}`);
          values.push(updates.tags);
        }

        if (updateFields.length === 0) {
          continue;
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(kpiId);

        await pool.query(
          `UPDATE kpis SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          values
        );

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ kpiId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Log bulk operation
    await pool.query(
      `INSERT INTO bulk_operations (operation_type, entity_type, affected_count, success_count, error_count, performed_by, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'update',
        'kpis',
        kpiIds.length,
        successCount,
        errorCount,
        performedBy,
        JSON.stringify({ updates, errors }),
      ]
    );

    return { success: successCount, errors: errorCount };
  }

  /**
   * Bulk delete KPIs
   */
  static async bulkDeleteKPIs(kpiIds: string[], performedBy: string = 'system'): Promise<{ success: number; errors: number }> {
    let successCount = 0;
    let errorCount = 0;

    for (const kpiId of kpiIds) {
      try {
        const result = await pool.query('DELETE FROM kpis WHERE id = $1', [kpiId]);
        if (result.rowCount && result.rowCount > 0) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    // Log bulk operation
    await pool.query(
      `INSERT INTO bulk_operations (operation_type, entity_type, affected_count, success_count, error_count, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['delete', 'kpis', kpiIds.length, successCount, errorCount, performedBy]
    );

    return { success: successCount, errors: errorCount };
  }

  /**
   * Get KPI alerts
   */
  static async getAlerts(filters?: {
    kpiId?: string;
    acknowledged?: boolean;
    severity?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT a.*, k.name as kpi_name
      FROM kpi_alerts a
      LEFT JOIN kpis k ON a.kpi_id = k.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.kpiId) {
      query += ` AND a.kpi_id = $${paramCount++}`;
      params.push(filters.kpiId);
    }

    if (filters?.acknowledged !== undefined) {
      query += ` AND a.acknowledged = $${paramCount++}`;
      params.push(filters.acknowledged);
    }

    if (filters?.severity) {
      query += ` AND a.severity = $${paramCount++}`;
      params.push(filters.severity);
    }

    query += ` ORDER BY a.triggered_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await pool.query(
      `UPDATE kpi_alerts
       SET acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [acknowledgedBy, alertId]
    );
  }
}

export default KPIService;
