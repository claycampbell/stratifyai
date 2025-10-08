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
    const aiResponse = await geminiService.chatWithActionSupport(
      message,
      chatContext,
      systemContext
    );

    // Save AI response
    await pool.query(
      `INSERT INTO chat_history (session_id, role, message)
       VALUES ($1, $2, $3)`,
      [sessionId, 'assistant', aiResponse]
    );

    res.json({
      session_id: sessionId,
      message: aiResponse,
    });
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
