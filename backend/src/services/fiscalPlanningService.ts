import pool from '../config/database';
import {
  FiscalYearPlan,
  FiscalYearPriority,
  FiscalYearDraftStrategy,
  FiscalPlanSummary,
  FiscalYearPlanWithRelations,
  ConvertToOGSMResponse,
  OGSMComponent,
  KPI
} from '../types';

class FiscalPlanningService {
  /**
   * Create a new fiscal year plan
   */
  async createPlan(data: {
    fiscal_year: string;
    start_date?: string;
    end_date?: string;
    created_by?: string;
  }): Promise<FiscalYearPlan> {
    const result = await pool.query(
      `INSERT INTO fiscal_year_plans (fiscal_year, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.fiscal_year, data.start_date || null, data.end_date || null, data.created_by || null]
    );
    return result.rows[0];
  }

  /**
   * Get all fiscal year plans
   */
  async getAllPlans(): Promise<FiscalYearPlan[]> {
    const result = await pool.query(
      `SELECT * FROM fiscal_year_plans ORDER BY created_at DESC`
    );
    return result.rows;
  }

  /**
   * Get active fiscal year plan
   */
  async getActivePlan(): Promise<FiscalYearPlan | null> {
    const result = await pool.query(
      `SELECT * FROM fiscal_year_plans WHERE status = 'active' LIMIT 1`
    );
    return result.rows[0] || null;
  }

  /**
   * Get fiscal plan by ID with full relations
   */
  async getPlanById(planId: string): Promise<FiscalYearPlanWithRelations | null> {
    const planResult = await pool.query(
      `SELECT * FROM fiscal_year_plans WHERE id = $1`,
      [planId]
    );

    if (planResult.rows.length === 0) {
      return null;
    }

    const plan = planResult.rows[0];

    // Get priorities
    const prioritiesResult = await pool.query(
      `SELECT * FROM fiscal_year_priorities WHERE fiscal_plan_id = $1 ORDER BY priority_number`,
      [planId]
    );

    // Get strategies for each priority
    const priorities = await Promise.all(
      prioritiesResult.rows.map(async (priority) => {
        const strategiesResult = await pool.query(
          `SELECT * FROM fiscal_year_draft_strategies WHERE priority_id = $1 ORDER BY created_at`,
          [priority.id]
        );
        return {
          ...priority,
          strategies: strategiesResult.rows
        };
      })
    );

    return {
      ...plan,
      priorities
    };
  }

  /**
   * Add or update priorities for a plan
   */
  async updatePriorities(
    planId: string,
    priorities: { priority_number: 1 | 2 | 3; title: string; description?: string }[]
  ): Promise<FiscalYearPriority[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const createdPriorities: FiscalYearPriority[] = [];

      for (const priority of priorities) {
        // Upsert priority
        const result = await client.query(
          `INSERT INTO fiscal_year_priorities (fiscal_plan_id, priority_number, title, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (fiscal_plan_id, priority_number)
           DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
           RETURNING *`,
          [planId, priority.priority_number, priority.title, priority.description || null]
        );
        createdPriorities.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return createdPriorities;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Import a priority from an existing OGSM component
   */
  async importPriorityFromOGSM(
    planId: string,
    ogsmComponentId: string,
    priorityNumber: 1 | 2 | 3
  ): Promise<FiscalYearPriority> {
    // Get the OGSM component
    const ogsmResult = await pool.query(
      `SELECT * FROM ogsm_components WHERE id = $1`,
      [ogsmComponentId]
    );

    if (ogsmResult.rows.length === 0) {
      throw new Error('OGSM component not found');
    }

    const ogsmComponent = ogsmResult.rows[0];

    // Create priority linked to OGSM component
    const result = await pool.query(
      `INSERT INTO fiscal_year_priorities (fiscal_plan_id, priority_number, title, description, imported_from_ogsm_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fiscal_plan_id, priority_number)
       DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, imported_from_ogsm_id = EXCLUDED.imported_from_ogsm_id
       RETURNING *`,
      [planId, priorityNumber, ogsmComponent.title, ogsmComponent.description, ogsmComponentId]
    );

    return result.rows[0];
  }

  /**
   * Add a draft strategy to a plan
   */
  async addDraftStrategy(
    planId: string,
    priorityId: string,
    strategy: {
      title: string;
      description?: string;
      rationale?: string;
      implementation_steps?: string[];
      success_probability?: number;
      estimated_cost?: string;
      timeframe?: string;
      risks?: string[];
      required_resources?: string[];
      success_metrics?: string[];
      supporting_evidence?: string[];
    },
    aiGenerationId?: string
  ): Promise<FiscalYearDraftStrategy> {
    const result = await pool.query(
      `INSERT INTO fiscal_year_draft_strategies
       (fiscal_plan_id, priority_id, title, description, rationale,
        implementation_steps, success_probability, estimated_cost, timeframe,
        risks, required_resources, success_metrics, supporting_evidence,
        ai_generation_id, generated_from_ai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        planId,
        priorityId,
        strategy.title,
        strategy.description || null,
        strategy.rationale || null,
        JSON.stringify(strategy.implementation_steps || []),
        strategy.success_probability || null,
        strategy.estimated_cost || null,
        strategy.timeframe || null,
        JSON.stringify(strategy.risks || []),
        JSON.stringify(strategy.required_resources || []),
        JSON.stringify(strategy.success_metrics || []),
        JSON.stringify(strategy.supporting_evidence || []),
        aiGenerationId || null,
        !!aiGenerationId
      ]
    );

    const row = result.rows[0];
    return this.parseDraftStrategy(row);
  }

  /**
   * Bulk add draft strategies
   */
  async bulkAddDraftStrategies(
    strategies: {
      planId: string;
      priorityId: string;
      strategy: any;
      aiGenerationId?: string;
    }[]
  ): Promise<FiscalYearDraftStrategy[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const created: FiscalYearDraftStrategy[] = [];

      for (const item of strategies) {
        const result = await client.query(
          `INSERT INTO fiscal_year_draft_strategies
           (fiscal_plan_id, priority_id, title, description, rationale,
            implementation_steps, success_probability, estimated_cost, timeframe,
            risks, required_resources, success_metrics, supporting_evidence,
            ai_generation_id, generated_from_ai)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING *`,
          [
            item.planId,
            item.priorityId,
            item.strategy.title,
            item.strategy.description || null,
            item.strategy.rationale || null,
            JSON.stringify(item.strategy.implementation_steps || []),
            item.strategy.success_probability || null,
            item.strategy.estimated_cost || null,
            item.strategy.timeframe || null,
            JSON.stringify(item.strategy.risks || []),
            JSON.stringify(item.strategy.required_resources || []),
            JSON.stringify(item.strategy.success_metrics || []),
            JSON.stringify(item.strategy.supporting_evidence || []),
            item.aiGenerationId || null,
            !!item.aiGenerationId
          ]
        );
        created.push(this.parseDraftStrategy(result.rows[0]));
      }

      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update draft strategy status
   */
  async updateStrategyStatus(
    strategyId: string,
    status: 'draft' | 'under_review' | 'approved' | 'rejected',
    reviewNotes?: string,
    reviewedBy?: string
  ): Promise<FiscalYearDraftStrategy> {
    const result = await pool.query(
      `UPDATE fiscal_year_draft_strategies
       SET status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, reviewNotes || null, reviewedBy || null, strategyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Draft strategy not found');
    }

    return this.parseDraftStrategy(result.rows[0]);
  }

  /**
   * Convert approved draft strategies to OGSM components
   */
  async convertToOGSM(
    planId: string,
    strategyIds: string[]
  ): Promise<ConvertToOGSMResponse> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const createdObjectives: OGSMComponent[] = [];
      const createdStrategies: OGSMComponent[] = [];
      const createdKPIs: KPI[] = [];

      // Get strategies with their priorities
      const strategiesResult = await client.query(
        `SELECT ds.*, p.title as priority_title, p.priority_number, p.imported_from_ogsm_id
         FROM fiscal_year_draft_strategies ds
         JOIN fiscal_year_priorities p ON ds.priority_id = p.id
         WHERE ds.id = ANY($1) AND ds.fiscal_plan_id = $2`,
        [strategyIds, planId]
      );

      // Group strategies by priority
      const strategiesByPriority = new Map<string, any[]>();
      for (const strategy of strategiesResult.rows) {
        const priorityId = strategy.priority_id;
        if (!strategiesByPriority.has(priorityId)) {
          strategiesByPriority.set(priorityId, []);
        }
        strategiesByPriority.get(priorityId)!.push(strategy);
      }

      // For each priority, create/find OGSM objective and convert strategies
      for (const [priorityId, strategies] of strategiesByPriority.entries()) {
        const firstStrategy = strategies[0];
        let objectiveId: string;

        // Check if priority was imported from existing OGSM component
        if (firstStrategy.imported_from_ogsm_id) {
          objectiveId = firstStrategy.imported_from_ogsm_id;
        } else {
          // Create new OGSM objective from priority
          const objResult = await client.query(
            `INSERT INTO ogsm_components (component_type, title, description, order_index)
             VALUES ('objective', $1, $2, $3)
             RETURNING *`,
            [firstStrategy.priority_title, `Priority ${firstStrategy.priority_number}`, firstStrategy.priority_number]
          );
          objectiveId = objResult.rows[0].id;
          createdObjectives.push(objResult.rows[0]);
        }

        // Convert each strategy
        for (const draftStrategy of strategies) {
          // Create OGSM strategy component
          const strategyResult = await client.query(
            `INSERT INTO ogsm_components (component_type, title, description, parent_id, order_index)
             VALUES ('strategy', $1, $2, $3, 0)
             RETURNING *`,
            [draftStrategy.title, draftStrategy.description || draftStrategy.rationale, objectiveId]
          );
          const ogsmStrategy = strategyResult.rows[0];
          createdStrategies.push(ogsmStrategy);

          // Mark draft strategy as converted
          await client.query(
            `UPDATE fiscal_year_draft_strategies
             SET status = 'converted', converted_to_ogsm_id = $1
             WHERE id = $2`,
            [ogsmStrategy.id, draftStrategy.id]
          );

          // Create KPIs from success_metrics
          const successMetrics = Array.isArray(draftStrategy.success_metrics)
            ? draftStrategy.success_metrics
            : (draftStrategy.success_metrics ? JSON.parse(draftStrategy.success_metrics) : []);
          for (const metricName of successMetrics) {
            const kpiResult = await client.query(
              `INSERT INTO kpis (ogsm_component_id, source_strategy_id, name, frequency, status)
               VALUES ($1, $2, $3, 'monthly', 'on_track')
               RETURNING *`,
              [ogsmStrategy.id, draftStrategy.id, metricName]
            );
            createdKPIs.push(kpiResult.rows[0]);
          }
        }
      }

      await client.query('COMMIT');

      return {
        created_objectives: createdObjectives,
        created_strategies: createdStrategies,
        created_kpis: createdKPIs
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Activate a fiscal year plan
   */
  async activatePlan(planId: string): Promise<FiscalYearPlan> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate: all approved strategies must be converted
      const unconvertedResult = await client.query(
        `SELECT COUNT(*) as count
         FROM fiscal_year_draft_strategies
         WHERE fiscal_plan_id = $1 AND status = 'approved' AND converted_to_ogsm_id IS NULL`,
        [planId]
      );

      if (parseInt(unconvertedResult.rows[0].count) > 0) {
        throw new Error('Cannot activate plan: Some approved strategies have not been converted to OGSM');
      }

      // Mark current active plan as completed
      await client.query(
        `UPDATE fiscal_year_plans
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE status = 'active'`
      );

      // Activate this plan
      const result = await client.query(
        `UPDATE fiscal_year_plans
         SET status = 'active', activated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [planId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get plan summary with statistics
   */
  async getPlanSummary(planId: string): Promise<FiscalPlanSummary> {
    // Get plan
    const planResult = await pool.query(
      `SELECT * FROM fiscal_year_plans WHERE id = $1`,
      [planId]
    );

    if (planResult.rows.length === 0) {
      throw new Error('Fiscal plan not found');
    }

    // Get priorities with strategy counts
    const prioritiesResult = await pool.query(
      `SELECT p.*,
         COUNT(ds.id) as strategy_count
       FROM fiscal_year_priorities p
       LEFT JOIN fiscal_year_draft_strategies ds ON ds.priority_id = p.id
       WHERE p.fiscal_plan_id = $1
       GROUP BY p.id
       ORDER BY p.priority_number`,
      [planId]
    );

    // Get draft strategies count by status
    const statusCountResult = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
         COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
         COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
       FROM fiscal_year_draft_strategies
       WHERE fiscal_plan_id = $1`,
      [planId]
    );

    // Get converted count (strategies linked to OGSM)
    const convertedResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM fiscal_year_draft_strategies
       WHERE fiscal_plan_id = $1 AND converted_to_ogsm_id IS NOT NULL`,
      [planId]
    );

    // Get KPIs created count (from converted strategies)
    const kpisResult = await pool.query(
      `SELECT COUNT(DISTINCT k.id) as count
       FROM kpis k
       JOIN fiscal_year_draft_strategies ds ON k.ogsm_component_id = ds.converted_to_ogsm_id
       WHERE ds.fiscal_plan_id = $1`,
      [planId]
    );

    const statusCounts = statusCountResult.rows[0];

    return {
      plan: planResult.rows[0],
      priorities: prioritiesResult.rows,
      draft_strategies_count: {
        draft: parseInt(statusCounts.draft) || 0,
        under_review: parseInt(statusCounts.under_review) || 0,
        approved: parseInt(statusCounts.approved) || 0,
        rejected: parseInt(statusCounts.rejected) || 0,
        converted: parseInt(statusCounts.converted) || 0
      },
      converted_count: parseInt(convertedResult.rows[0].count) || 0,
      kpis_created_count: parseInt(kpisResult.rows[0].count) || 0
    };
  }

  /**
   * Create KPIs from a draft strategy's success metrics
   */
  async createKPIsFromStrategy(
    strategyId: string,
    kpis: {
      name: string;
      target_value?: number;
      frequency: string;
      unit?: string;
    }[]
  ): Promise<KPI[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the strategy with its OGSM conversion status
      const strategyResult = await client.query(
        `SELECT id, fiscal_plan_id, converted_to_ogsm_id FROM fiscal_year_draft_strategies WHERE id = $1`,
        [strategyId]
      );

      if (strategyResult.rows.length === 0) {
        throw new Error('Draft strategy not found');
      }

      const strategy = strategyResult.rows[0];
      const createdKPIs: KPI[] = [];

      // Create each KPI
      for (const kpi of kpis) {
        const result = await client.query(
          `INSERT INTO kpis
           (ogsm_component_id, source_strategy_id, name, target_value, unit, frequency, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'on_track')
           RETURNING *`,
          [
            strategy.converted_to_ogsm_id || null, // Link to OGSM if converted
            strategyId, // Always track source strategy
            kpi.name,
            kpi.target_value || null,
            kpi.unit || null,
            kpi.frequency
          ]
        );
        createdKPIs.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return createdKPIs;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get count of KPIs created from a strategy
   */
  async getStrategyKPIsCount(strategyId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM kpis WHERE source_strategy_id = $1`,
      [strategyId]
    );
    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Helper to parse JSONB fields in draft strategy
   */
  private parseDraftStrategy(row: any): FiscalYearDraftStrategy {
    const parseField = (field: any) => {
      if (field === null || field === undefined) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch (e) {
          console.error(`Error parsing JSON field: ${field}`, e);
          return [];
        }
      }
      return [];
    };

    return {
      ...row,
      implementation_steps: parseField(row.implementation_steps),
      risks: parseField(row.risks),
      required_resources: parseField(row.required_resources),
      success_metrics: parseField(row.success_metrics),
      supporting_evidence: parseField(row.supporting_evidence)
    };
  }
}

export default new FiscalPlanningService();
