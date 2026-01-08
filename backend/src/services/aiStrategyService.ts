import OpenAI from 'openai';
import pool from '../config/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface StrategyGenerationContext {
  objective: string;
  industry?: string;
  company_size?: string;
  current_situation?: string;
  constraints?: string;
  resources?: string;
  timeframe?: string;
}

interface GeneratedStrategy {
  title: string;
  description: string;
  rationale: string;
  implementation_steps: string[];
  success_probability: number;
  estimated_cost: string;
  timeframe: string;
  risks: string[];
  required_resources: string[];
  success_metrics: string[];
  supporting_evidence: string[];
}

interface StrategyKnowledge {
  id: string;
  title: string;
  description: string;
  strategy_text: string;
  industry: string;
  success_rate: number;
  outcomes: any;
  case_study_source: string;
}

class AIStrategyService {
  /**
   * Search the knowledge base for relevant strategies
   * This is a simplified version - in production, you'd use vector similarity search with pgvector
   */
  async searchKnowledgeBase(
    objective: string,
    industry?: string,
    objectiveType?: string,
    limit: number = 5
  ): Promise<StrategyKnowledge[]> {
    try {
      let query = `
        SELECT id, title, description, strategy_text, industry, success_rate, outcomes, case_study_source
        FROM strategy_knowledge
        WHERE 1=1
      `;
      const params: any[] = [];

      // Filter by industry if provided
      if (industry) {
        params.push(industry);
        query += ` AND (industry = $${params.length} OR industry IS NULL)`;
      }

      // Filter by objective type if provided
      if (objectiveType) {
        params.push(objectiveType);
        query += ` AND objective_type = $${params.length}`;
      }

      // Simple text search (in production, use full-text search or vector similarity)
      params.push(`%${objective.toLowerCase()}%`);
      query += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(strategy_text) LIKE $${params.length})`;

      query += ` ORDER BY success_rate DESC NULLS LAST LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Generate strategies using RAG (Retrieval-Augmented Generation)
   */
  async generateStrategies(
    context: StrategyGenerationContext,
    numStrategies: number = 3
  ): Promise<GeneratedStrategy[]> {
    try {
      console.log('[AIStrategyService] Starting strategy generation');
      console.log('[AIStrategyService] Context:', JSON.stringify(context, null, 2));

      // Step 1: Retrieve relevant strategies from knowledge base
      console.log('[AIStrategyService] Searching knowledge base...');
      const relevantStrategies = await this.searchKnowledgeBase(
        context.objective,
        context.industry,
        undefined,
        10
      );
      console.log('[AIStrategyService] Found', relevantStrategies.length, 'relevant strategies');

      // Step 2: Build context for the LLM
      const knowledgeContext = relevantStrategies.map((s, idx) => `
**Example Strategy ${idx + 1}: ${s.title}**
- Description: ${s.description}
- Industry: ${s.industry || 'General'}
- Success Rate: ${s.success_rate ? (s.success_rate * 100).toFixed(0) + '%' : 'N/A'}
- Outcomes: ${JSON.stringify(s.outcomes || {})}
- Details: ${s.strategy_text}
- Source: ${s.case_study_source || 'Internal knowledge base'}
      `).join('\n\n');

      // Step 3: Create prompt for Gemini
      const prompt = `
You are a world-class strategy consultant helping to develop OGSM (Objectives, Goals, Strategies, Measures) strategies.

**CLIENT OBJECTIVE:**
${context.objective}

**CLIENT CONTEXT:**
- Industry: ${context.industry || 'Not specified'}
- Company Size: ${context.company_size || 'Not specified'}
- Current Situation: ${context.current_situation || 'Not provided'}
- Constraints: ${context.constraints || 'None specified'}
- Available Resources: ${context.resources || 'Not specified'}
- Desired Timeframe: ${context.timeframe || 'Not specified'}

**RELEVANT SUCCESSFUL STRATEGIES FROM KNOWLEDGE BASE:**
${knowledgeContext || 'No directly relevant examples found in knowledge base.'}

**YOUR TASK:**
Generate ${numStrategies} innovative, actionable strategies to achieve the stated objective. Each strategy should be:
1. Tailored to the client's specific context
2. Inspired by (but not copying) the successful examples above
3. Realistic and implementable
4. Backed by clear rationale

For each strategy, provide:
- title: Clear, actionable strategy name
- description: 2-3 sentence overview
- rationale: Why this strategy will work (reference similar successes)
- implementation_steps: Array of 4-6 concrete steps
- success_probability: Decimal 0-1 based on similar cases
- estimated_cost: "low", "medium", or "high"
- timeframe: Realistic timeframe (e.g., "3-6 months")
- risks: Array of 2-3 key risks
- required_resources: Array of 3-5 resources needed
- success_metrics: Array of 3-5 KPIs to track
- supporting_evidence: Array of references to similar successful cases

Return ONLY a valid JSON object with a "strategies" array. No other text or formatting.
Example format:
{
  "strategies": [
    {
      "title": "Strategy name",
      "description": "Overview",
      "rationale": "Why it works",
      "implementation_steps": ["Step 1", "Step 2", ...],
      "success_probability": 0.75,
      "estimated_cost": "medium",
      "timeframe": "6-12 months",
      "risks": ["Risk 1", "Risk 2"],
      "required_resources": ["Resource 1", "Resource 2"],
      "success_metrics": ["Metric 1", "Metric 2"],
      "supporting_evidence": ["Evidence 1", "Evidence 2"]
    }
  ]
}
`;

      // Step 4: Call OpenAI
      console.log('[AIStrategyService] Calling OpenAI API...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a world-class strategy consultant. Return ONLY valid JSON objects with a "strategies" array. No additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      console.log('[AIStrategyService] OpenAI API call successful');

      const responseText = completion.choices[0].message.content || '{"strategies": []}';
      console.log('[AIStrategyService] Response length:', responseText.length);

      // Step 5: Parse the response
      console.log('[AIStrategyService] Parsing response...');
      const strategies = this.parseStrategiesResponse(responseText);
      console.log('[AIStrategyService] Parsed', strategies.length, 'strategies');

      // Step 6: Store the generation for tracking
      console.log('[AIStrategyService] Storing generation...');
      await this.storeGeneration(context, strategies);
      console.log('[AIStrategyService] Generation complete!');

      return strategies;
    } catch (error: any) {
      console.error('[AIStrategyService] ERROR:', error);
      console.error('[AIStrategyService] Error name:', error?.name);
      console.error('[AIStrategyService] Error message:', error?.message);
      if (error?.code) console.error('[AIStrategyService] Error code:', error.code);
      if (error?.response) console.error('[AIStrategyService] API response:', error.response);
      throw new Error('Failed to generate strategies: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Parse and validate the strategies response from OpenAI
   */
  private parseStrategiesResponse(responseText: string): GeneratedStrategy[] {
    try {
      // Parse the JSON response (OpenAI returns json_object, may have strategies wrapper)
      const parsed = JSON.parse(responseText);

      // Handle both direct array and wrapped object formats
      const strategies = Array.isArray(parsed) ? parsed : (parsed.strategies || []);

      // Validate each strategy has required fields
      return strategies.map((s: any) => ({
        title: s.title || 'Untitled Strategy',
        description: s.description || '',
        rationale: s.rationale || '',
        implementation_steps: Array.isArray(s.implementation_steps) ? s.implementation_steps : [],
        success_probability: typeof s.success_probability === 'number' ? s.success_probability : 0.5,
        estimated_cost: s.estimated_cost || 'medium',
        timeframe: s.timeframe || '6-12 months',
        risks: Array.isArray(s.risks) ? s.risks : [],
        required_resources: Array.isArray(s.required_resources) ? s.required_resources : [],
        success_metrics: Array.isArray(s.success_metrics) ? s.success_metrics : [],
        supporting_evidence: Array.isArray(s.supporting_evidence) ? s.supporting_evidence : [],
      }));
    } catch (error) {
      console.error('Error parsing strategies response:', error);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse strategies from AI response');
    }
  }

  /**
   * Store the AI generation for tracking and learning
   */
  private async storeGeneration(
    context: StrategyGenerationContext,
    strategies: GeneratedStrategy[]
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ai_generated_strategies (user_prompt, context, generated_strategies, model_version)
         VALUES ($1, $2, $3, $4)`,
        [
          context.objective,
          JSON.stringify(context),
          JSON.stringify(strategies),
          'gpt-4o'
        ]
      );
    } catch (error) {
      console.error('Error storing generation:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Add a new strategy to the knowledge base
   */
  async addToKnowledgeBase(data: {
    title: string;
    description: string;
    strategy_text: string;
    industry?: string;
    company_size?: string;
    objective_type?: string;
    success_metrics?: any;
    outcomes?: any;
    implementation_cost?: string;
    timeframe?: string;
    difficulty_level?: string;
    success_rate?: number;
    case_study_source?: string;
    tags?: string[];
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO strategy_knowledge
         (title, description, strategy_text, industry, company_size, objective_type,
          success_metrics, outcomes, implementation_cost, timeframe, difficulty_level,
          success_rate, case_study_source, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          data.title,
          data.description,
          data.strategy_text,
          data.industry || null,
          data.company_size || null,
          data.objective_type || null,
          data.success_metrics ? JSON.stringify(data.success_metrics) : null,
          data.outcomes ? JSON.stringify(data.outcomes) : null,
          data.implementation_cost || null,
          data.timeframe || null,
          data.difficulty_level || null,
          data.success_rate || null,
          data.case_study_source || null,
          data.tags || []
        ]
      );
    } catch (error) {
      console.error('Error adding to knowledge base:', error);
      throw new Error('Failed to add strategy to knowledge base');
    }
  }

  /**
   * Submit feedback on a generated strategy
   */
  async submitFeedback(data: {
    generated_strategy_id: string;
    rating: number;
    feedback_type: string;
    comments?: string;
    outcome_achieved?: boolean;
    outcome_data?: any;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ai_strategy_feedback
         (generated_strategy_id, rating, feedback_type, comments, outcome_achieved, outcome_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.generated_strategy_id,
          data.rating,
          data.feedback_type,
          data.comments || null,
          data.outcome_achieved || null,
          data.outcome_data ? JSON.stringify(data.outcome_data) : null
        ]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }
}

export default new AIStrategyService();
