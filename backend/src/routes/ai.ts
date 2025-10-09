import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import geminiService from '../services/geminiService';

const router = Router();

// Chat with AI Chief Strategy Officer
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, session_id, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const sessionId = session_id || uuidv4();

    // Save user message
    await pool.query(
      `INSERT INTO chat_history (session_id, role, message, context)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, 'user', message, context ? JSON.stringify(context) : null]
    );

    // Get chat context from history
    const historyResult = await pool.query(
      `SELECT role, message FROM chat_history
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [sessionId]
    );

    const chatContext = historyResult.rows.reverse().map((row) => `${row.role}: ${row.message}`).join('\n');

    // Fetch current system context for action-aware responses
    const systemContext = await gatherSystemContext();

    // Generate AI response with action awareness
    const aiResult = await geminiService.chatWithActionSupport(
      message,
      chatContext,
      systemContext
    );

    // Execute any actions requested by the AI
    const executedActions = [];
    if (aiResult.actions && aiResult.actions.length > 0) {
      for (const action of aiResult.actions) {
        try {
          const result = await executeAction(action);
          executedActions.push({
            action: action.name,
            params: action.args,
            result,
            success: true,
          });
        } catch (error: any) {
          executedActions.push({
            action: action.name,
            params: action.args,
            error: error.message,
            success: false,
          });
        }
      }
    }

    // Build response message
    let responseMessage = aiResult.response;
    if (executedActions.length > 0) {
      const successfulActions = executedActions.filter((a) => a.success);
      if (successfulActions.length > 0) {
        responseMessage += '\n\n✅ Actions completed successfully:\n';
        successfulActions.forEach((a) => {
          responseMessage += `- ${a.action}\n`;
        });
      }

      const failedActions = executedActions.filter((a) => !a.success);
      if (failedActions.length > 0) {
        responseMessage += '\n\n❌ Some actions failed:\n';
        failedActions.forEach((a) => {
          responseMessage += `- ${a.action}: ${a.error}\n`;
        });
      }
    }

    // Save AI response
    await pool.query(
      `INSERT INTO chat_history (session_id, role, message)
       VALUES ($1, $2, $3)`,
      [sessionId, 'assistant', responseMessage]
    );

    const responseData = {
      session_id: sessionId,
      message: responseMessage,
      actions: executedActions,
    };

    console.log('AI Chat Response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Helper function to gather system context
async function gatherSystemContext() {
  try {
    const [kpis, ogsm] = await Promise.all([
      pool.query('SELECT id, name, target_value, current_value, unit, status FROM kpis LIMIT 20'),
      pool.query('SELECT id, component_type, title FROM ogsm_components LIMIT 20')
    ]);

    return {
      kpis: kpis.rows,
      ogsm: ogsm.rows,
    };
  } catch (error) {
    console.error('Error gathering system context:', error);
    return { kpis: [], ogsm: [] };
  }
}

// Helper function to execute AI-requested actions
async function executeAction(action: any) {
  const { name, args } = action;

  switch (name) {
    case 'create_kpi': {
      const { name: kpiName, description, target_value, current_value, unit, frequency } = args;
      const result = await pool.query(
        `INSERT INTO kpis (name, description, target_value, current_value, unit, frequency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          kpiName,
          description,
          target_value,
          current_value,
          unit,
          frequency,
          current_value >= target_value ? 'on-track' : 'at-risk',
        ]
      );
      return { id: result.rows[0].id, name: kpiName };
    }

    case 'update_kpi': {
      const { kpi_id, current_value, target_value } = args;
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      updateFields.push(`current_value = $${paramCount++}`);
      values.push(current_value);

      if (target_value !== undefined) {
        updateFields.push(`target_value = $${paramCount++}`);
        values.push(target_value);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(kpi_id);

      const result = await pool.query(
        `UPDATE kpis SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('KPI not found');
      }

      return { id: kpi_id, updated: true };
    }

    case 'create_ogsm_component': {
      const { component_type, title, description, parent_id } = args;

      // Get the max order index for this type
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) as max_order FROM ogsm_components WHERE component_type = $1',
        [component_type]
      );
      const orderIndex = maxOrderResult.rows[0].max_order + 1;

      const result = await pool.query(
        `INSERT INTO ogsm_components (component_type, title, description, order_index, parent_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [component_type, title, description, orderIndex, parent_id || null]
      );

      return { id: result.rows[0].id, title, component_type };
    }

    case 'update_ogsm_component': {
      const { component_id, title, description } = args;
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (title) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(title);
      }

      if (description) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(component_id);

      const result = await pool.query(
        `UPDATE ogsm_components SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('OGSM component not found');
      }

      return { id: component_id, updated: true };
    }

    case 'delete_kpi': {
      const { kpi_id } = args;
      const result = await pool.query('DELETE FROM kpis WHERE id = $1 RETURNING *', [kpi_id]);

      if (result.rows.length === 0) {
        throw new Error('KPI not found');
      }

      return { id: kpi_id, deleted: true };
    }

    case 'delete_ogsm_component': {
      const { component_id } = args;
      const result = await pool.query('DELETE FROM ogsm_components WHERE id = $1 RETURNING *', [
        component_id,
      ]);

      if (result.rows.length === 0) {
        throw new Error('OGSM component not found');
      }

      return { id: component_id, deleted: true };
    }

    default:
      throw new Error(`Unknown action: ${name}`);
  }
}

// Get chat history
router.get('/chat/:session_id', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC`,
      [session_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Analyze strategic alignment
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { type } = req.body;

    // Fetch all OGSM components
    const objectivesResult = await pool.query(
      "SELECT * FROM ogsm_components WHERE component_type = 'objective'"
    );
    const goalsResult = await pool.query("SELECT * FROM ogsm_components WHERE component_type = 'goal'");
    const strategiesResult = await pool.query(
      "SELECT * FROM ogsm_components WHERE component_type = 'strategy'"
    );
    const kpisResult = await pool.query('SELECT * FROM kpis');

    // Perform AI analysis
    const analysis = await geminiService.analyzeStrategicAlignment(
      objectivesResult.rows,
      goalsResult.rows,
      strategiesResult.rows,
      kpisResult.rows
    );

    res.json(analysis);
  } catch (error) {
    console.error('Error in analysis:', error);
    res.status(500).json({ error: 'Failed to perform strategic analysis' });
  }
});

// Generate progress report
router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const { report_type, title, timeframe } = req.body;

    if (!report_type || !title) {
      return res.status(400).json({ error: 'report_type and title are required' });
    }

    // Fetch all KPIs
    const kpisResult = await pool.query('SELECT * FROM kpis');

    // Generate report using AI
    const reportContent = await geminiService.generateProgressReport(
      report_type,
      kpisResult.rows,
      timeframe || 'current period'
    );

    // Save report to database
    const result = await pool.query(
      `INSERT INTO strategic_reports (report_type, title, content, generated_by, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [report_type, title, reportContent, 'ai', JSON.stringify({ timeframe })]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get all reports
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { report_type } = req.query;

    let query = 'SELECT * FROM strategic_reports';
    const params: any[] = [];

    if (report_type) {
      params.push(report_type);
      query += ` WHERE report_type = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get report by ID
router.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM strategic_reports WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Generate recommendations
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    // Gather context
    const ogsmResult = await pool.query('SELECT * FROM ogsm_components');
    const kpisResult = await pool.query('SELECT * FROM kpis');

    const context = `
      OGSM Components: ${JSON.stringify(ogsmResult.rows)}
      KPIs: ${JSON.stringify(kpisResult.rows)}
    `;

    const recommendations = await geminiService.generateRecommendations(context);

    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Delete report
router.delete('/reports/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM strategic_reports WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
