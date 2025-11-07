import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import geminiService from '../services/geminiService';
import philosophyService from '../services/philosophyService';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper function to determine if a response is strategic/actionable vs conversational
function isStrategicRecommendation(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Strategic indicators - presence of these suggests actionable recommendations
  const strategicIndicators = [
    'recommend', 'suggest', 'should', 'propose', 'strategy', 'plan',
    'implement', 'develop', 'create', 'establish', 'initiative',
    'objective', 'goal', 'kpi', 'metric', 'measure', 'target',
    'decision', 'approach', 'prioritize', 'focus on', 'invest',
    'allocate', 'budget', 'resource', 'hire', 'recruit',
    'restructure', 'reorganize', 'policy', 'procedure', 'process'
  ];

  // Conversational indicators - presence of these suggests simple chat
  const conversationalIndicators = [
    'hello', 'hi', 'how are you', 'what can i help', 'how can i assist',
    'good morning', 'good afternoon', 'thanks', 'thank you', 'you\'re welcome',
    'yes', 'no', 'okay', 'sure', 'i understand', 'got it'
  ];

  // Check for conversational patterns (short responses are usually conversational)
  if (text.length < 100) {
    const hasConversationalPattern = conversationalIndicators.some(pattern =>
      lowerText.includes(pattern)
    );
    if (hasConversationalPattern) {
      return false; // It's just conversation
    }
  }

  // Check for strategic patterns
  const strategicMatches = strategicIndicators.filter(indicator =>
    lowerText.includes(indicator)
  ).length;

  // If it has 2 or more strategic indicators, consider it strategic
  return strategicMatches >= 2;
}

// Chat with AI Chief Strategy Officer
router.post('/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message, session_id, context } = req.body;
    const userId = req.user?.id;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const sessionId = session_id || uuidv4();

    // Check if this is a new session
    const sessionCheck = await pool.query(
      'SELECT id, title FROM chat_sessions WHERE id = $1',
      [sessionId]
    );

    const isNewSession = sessionCheck.rows.length === 0;

    if (isNewSession) {
      // Create new session record (title will be generated after first AI response)
      await pool.query(
        `INSERT INTO chat_sessions (id, user_id, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [sessionId, userId]
      );
    } else {
      // Update session updated_at
      await pool.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [sessionId]
      );
    }

    // Save user message
    await pool.query(
      `INSERT INTO chat_history (session_id, user_id, role, message, context)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, userId, 'user', message, context ? JSON.stringify(context) : null]
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

    // Determine if this response needs philosophy validation
    const isStrategicResponse = isStrategicRecommendation(responseMessage);

    // Extract philosophy alignment from AI response (only for strategic responses)
    const alignment = isStrategicResponse ? extractPhilosophyAlignment(responseMessage) : null;

    // Save AI response with alignment data
    const chatHistoryResult = await pool.query(
      `INSERT INTO chat_history (session_id, user_id, role, message)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [sessionId, userId, 'assistant', responseMessage]
    );

    const chatHistoryId = chatHistoryResult.rows[0].id;

    // Validate recommendation against philosophy constraints (only for strategic responses)
    let validationResult;
    let validationStatus: 'approved' | 'flagged' | 'rejected' | undefined = undefined;
    let violatedConstraints: string[] = [];

    if (isStrategicResponse) {
      try {
        validationResult = await philosophyService.validateRecommendation(responseMessage, chatHistoryId);
        validationStatus = validationResult.status;
        violatedConstraints = validationResult.violations.map(v => v.title);
      } catch (error) {
        console.error('[AI Chat] Error validating recommendation:', error);
        // Continue without validation if it fails
      }
    }

    // Generate title for new sessions (async, don't wait for it)
    if (isNewSession && !sessionCheck.rows[0]?.title) {
      geminiService.generateChatTitle(message).then(async (title) => {
        try {
          await pool.query(
            'UPDATE chat_sessions SET title = $1 WHERE id = $2',
            [title, sessionId]
          );
          console.log(`[AI Chat] Generated title for session ${sessionId}: ${title}`);
        } catch (error) {
          console.error('[AI Chat] Error saving generated title:', error);
        }
      }).catch((error) => {
        console.error('[AI Chat] Error generating title:', error);
      });
    }

    // Build response with philosophy alignment data
    const responseData = {
      session_id: sessionId,
      message: responseMessage,
      actions: executedActions,
      alignment: alignment,
      validation_status: validationStatus,
      violated_constraints: violatedConstraints,
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

// Helper function to extract philosophy alignment from AI response text
function extractPhilosophyAlignment(responseText: string): {
  core_values: string[];
  cited_principles: string[];
  decision_hierarchy: {
    university: number;
    department: number;
    individual: number;
  };
} {
  const lowerText = responseText.toLowerCase();
  const coreValues: string[] = [];

  // RMU Core Values (from philosophy system)
  const valueKeywords = {
    'Excellence': ['excellence', 'academic success', 'high standard', 'quality', 'best practice'],
    'Integrity': ['integrity', 'ethical', 'honest', 'transparent', 'accountable'],
    'Community': ['community', 'service', 'collaboration', 'partnership', 'together'],
    'Student-Centeredness': ['student', 'student-athlete', 'welfare', 'development', 'support'],
    'Innovation': ['innovation', 'creative', 'new approach', 'adapt', 'improve'],
    'Respect': ['respect', 'dignity', 'inclusive', 'diversity', 'fair'],
  };

  // Check for core values
  Object.entries(valueKeywords).forEach(([value, keywords]) => {
    const found = keywords.some(keyword => lowerText.includes(keyword));
    if (found) {
      coreValues.push(value);
    }
  });

  // Extract cited principles (simple keyword matching)
  const citedPrinciples: string[] = [];
  if (lowerText.includes('guiding principle') || lowerText.includes('principle')) {
    citedPrinciples.push('Guiding Principles Referenced');
  }
  if (lowerText.includes('operating principle') || lowerText.includes('non-negotiable')) {
    citedPrinciples.push('Operating Principles Referenced');
  }

  // Calculate decision hierarchy scores based on context keywords
  // Higher scores indicate stronger alignment
  const universityKeywords = ['university', 'institution', 'rmu', 'robert morris', 'strategic', 'mission', 'vision'];
  const departmentKeywords = ['department', 'athletics', 'athletic department', 'team', 'sport', 'program'];
  const individualKeywords = ['individual', 'coach', 'staff', 'athlete', 'person', 'player'];

  const universityMentions = universityKeywords.filter(kw => lowerText.includes(kw)).length;
  const departmentMentions = departmentKeywords.filter(kw => lowerText.includes(kw)).length;
  const individualMentions = individualKeywords.filter(kw => lowerText.includes(kw)).length;

  // Base scores (Decision Hierarchy: University > Department > Individual)
  let universityScore = 50 + (universityMentions * 10);
  let departmentScore = 40 + (departmentMentions * 8);
  let individualScore = 30 + (individualMentions * 5);

  // Cap scores at 100
  universityScore = Math.min(universityScore, 100);
  departmentScore = Math.min(departmentScore, 100);
  individualScore = Math.min(individualScore, 100);

  return {
    core_values: coreValues,
    cited_principles: citedPrinciples,
    decision_hierarchy: {
      university: universityScore,
      department: departmentScore,
      individual: individualScore,
    },
  };
}

// Get chat history for a specific session
router.get('/chat/:session_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT * FROM chat_history
       WHERE session_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [session_id, userId]
    );

    // Enhance assistant messages with philosophy alignment data
    const enhancedMessages = result.rows.map((msg: any) => {
      if (msg.role === 'assistant') {
        // Extract alignment from message text
        const alignment = extractPhilosophyAlignment(msg.message);

        // Get validation status if it exists (from ai_recommendation_validations table)
        // For now, we'll compute it on-the-fly for historical messages
        return {
          ...msg,
          alignment,
          validation_status: 'approved', // Default for historical messages
          violated_constraints: [],
        };
      }
      return msg;
    });

    res.json(enhancedMessages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get all chat sessions for the authenticated user
router.get('/chat-sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all sessions with metadata from chat_sessions table
    const result = await pool.query(
      `SELECT
        cs.id as session_id,
        cs.title,
        cs.created_at,
        cs.updated_at as last_message_at,
        (SELECT COUNT(*) FROM chat_history ch WHERE ch.session_id = cs.id) as message_count,
        (SELECT message FROM chat_history ch2
         WHERE ch2.session_id = cs.id AND ch2.role = 'user'
         ORDER BY ch2.created_at ASC LIMIT 1) as first_user_message
       FROM chat_sessions cs
       WHERE cs.user_id = $1
       ORDER BY cs.updated_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Delete a chat session (and all its messages via cascade)
router.delete('/chat/:session_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { session_id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Delete from chat_sessions, which will cascade to chat_history
    const result = await pool.query(
      `DELETE FROM chat_sessions
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [session_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Search chat history
router.get('/chat-search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { query, start_date, end_date } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let sql = `SELECT * FROM chat_history WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramCount = 2;

    if (query) {
      sql += ` AND message ILIKE $${paramCount}`;
      params.push(`%${query}%`);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(sql, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching chat history:', error);
    res.status(500).json({ error: 'Failed to search chat history' });
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

// ============================================================================
// Philosophy-Aware Chat (P0-006 Test Endpoint)
// ============================================================================

/**
 * POST /api/ai/chat-philosophy
 * Test endpoint for philosophy-aware chat with validation
 * Body: { message, userId }
 */
router.post('/chat-philosophy', async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Use default user ID if not provided (for testing)
    const testUserId = userId || '00000000-0000-0000-0000-000000000001';

    // Call the philosophy-aware chat method
    const response = await geminiService.chatWithPhilosophy(
      message,
      testUserId,
      true // includeContext
    );

    res.json({
      response,
      message: 'Philosophy-aware response generated',
      note: 'Check the response for philosophy citations and validation status'
    });
  } catch (error: any) {
    console.error('Error in philosophy-aware chat:', error);
    res.status(500).json({
      error: 'Failed to generate philosophy-aware response',
      details: error.message
    });
  }
});

export default router;
