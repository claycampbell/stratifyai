import { getGeminiModel } from '../config/gemini';
import { AIAnalysisRequest, AIAnalysisResponse, OGSMComponent, KPI } from '../types';
import { SchemaType, Tool } from '@google/generative-ai';

export class GeminiService {
  private model;

  constructor() {
    this.model = getGeminiModel('gemini-2.0-flash-exp');
  }

  async extractOGSMFromText(text: string): Promise<Partial<OGSMComponent>[]> {
    const prompt = `
      Analyze the following strategic planning document and extract OGSM (Objectives, Goals, Strategies, Measures) components.

      Document content:
      ${text.substring(0, 50000)} ${text.length > 50000 ? '...(truncated)' : ''}

      Please identify and structure the following:
      1. Objectives - High-level outcomes the organization wants to achieve
      2. Goals - Specific, measurable targets that support the objectives
      3. Strategies - Key approaches or initiatives to achieve the goals
      4. Measures - Metrics and KPIs to track progress

      Return the results in JSON format as an array of objects with this structure:
      {
        "component_type": "objective" | "goal" | "strategy" | "measure",
        "title": "Brief title",
        "description": "Detailed description",
        "order_index": number
      }

      Return ONLY the JSON array, no additional text or formatting.
      If no OGSM components are found, return an empty array: []
    `;

    try {
      console.log('[GeminiService] Extracting OGSM components from text (length: ' + text.length + ')');
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      console.log('[GeminiService] Gemini response length:', response.length);
      console.log('[GeminiService] Gemini response preview:', response.substring(0, 500));

      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[GeminiService] Successfully parsed OGSM components:', parsed.length);
        return parsed;
      }

      console.warn('[GeminiService] No JSON array found in Gemini response');
      console.warn('[GeminiService] Full response:', response);
      return [];
    } catch (error) {
      console.error('[GeminiService] Error extracting OGSM components:', error);
      throw error; // Throw instead of returning empty array
    }
  }

  async extractKPIsFromText(text: string): Promise<Partial<KPI>[]> {
    const prompt = `
      Analyze the following text and extract all Key Performance Indicators (KPIs) and metrics.

      Text content:
      ${text.substring(0, 50000)} ${text.length > 50000 ? '...(truncated)' : ''}

      For each KPI, identify:
      - Name of the metric
      - Description
      - Target value (if mentioned)
      - Current value (if mentioned)
      - Unit of measurement
      - Frequency (daily, weekly, monthly, quarterly, annual)

      Return the results in JSON format as an array:
      {
        "name": "KPI name",
        "description": "Description",
        "target_value": number or null,
        "current_value": number or null,
        "unit": "unit of measurement",
        "frequency": "monthly"
      }

      Return ONLY the JSON array, no additional text.
      If no KPIs are found, return an empty array: []
    `;

    try {
      console.log('[GeminiService] Extracting KPIs from text (length: ' + text.length + ')');
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      console.log('[GeminiService] Gemini KPI response length:', response.length);
      console.log('[GeminiService] Gemini KPI response preview:', response.substring(0, 500));

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[GeminiService] Successfully parsed KPIs:', parsed.length);
        return parsed;
      }

      console.warn('[GeminiService] No JSON array found in Gemini KPI response');
      console.warn('[GeminiService] Full response:', response);
      return [];
    } catch (error) {
      console.error('[GeminiService] Error extracting KPIs:', error);
      throw error; // Throw instead of returning empty array
    }
  }

  async chatWithContext(message: string, context?: string): Promise<string> {
    const prompt = context
      ? `Context: ${context}\n\nUser question: ${message}\n\nAs an AI Chief Strategy Officer, provide strategic guidance and insights based on the context and question above.`
      : `As an AI Chief Strategy Officer, respond to: ${message}`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to generate chat response');
    }
  }

  async chatWithActionSupport(
    message: string,
    chatContext: string,
    systemContext: { kpis: any[]; ogsm: any[] }
  ): Promise<{ response: string; actions?: any[] }> {
    const systemPrompt = `
You are an AI Chief Strategy Officer for a strategic planning platform. You help users with their OGSM (Objectives, Goals, Strategies, Measures) framework and KPI management.

CURRENT SYSTEM STATE:
- Active KPIs: ${systemContext.kpis.length > 0 ? JSON.stringify(systemContext.kpis) : 'None'}
- OGSM Components: ${systemContext.ogsm.length > 0 ? JSON.stringify(systemContext.ogsm) : 'None'}

CONVERSATION HISTORY:
${chatContext}

You can perform the following actions:
1. Create KPIs
2. Update KPIs
3. Create OGSM components (objectives, goals, strategies, measures)
4. Update OGSM components
5. Delete KPIs or OGSM components

When a user asks you to perform an action, use the available tools to execute it.
Be conversational and confirm actions with the user before executing them.
    `;

    // Define function declarations for Gemini
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'create_kpi',
            description: 'Creates a new KPI in the system',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING, description: 'Name of the KPI' },
                description: { type: SchemaType.STRING, description: 'Description of what this KPI measures' },
                target_value: { type: SchemaType.NUMBER, description: 'Target value to achieve' },
                current_value: { type: SchemaType.NUMBER, description: 'Current value of the KPI' },
                unit: { type: SchemaType.STRING, description: 'Unit of measurement (e.g., %, dollars, count)' },
                frequency: {
                  type: SchemaType.STRING,
                  description: 'How often this KPI is measured',
                  enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
                },
              },
              required: ['name', 'description', 'target_value', 'current_value', 'unit', 'frequency'],
            },
          },
          {
            name: 'update_kpi',
            description: 'Updates an existing KPI',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                kpi_id: { type: SchemaType.STRING, description: 'ID of the KPI to update' },
                current_value: { type: SchemaType.NUMBER, description: 'New current value' },
                target_value: { type: SchemaType.NUMBER, description: 'New target value (optional)' },
              },
              required: ['kpi_id', 'current_value'],
            },
          },
          {
            name: 'create_ogsm_component',
            description: 'Creates a new OGSM component (objective, goal, strategy, or measure)',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                component_type: {
                  type: SchemaType.STRING,
                  description: 'Type of OGSM component',
                  enum: ['objective', 'goal', 'strategy', 'measure'],
                },
                title: { type: SchemaType.STRING, description: 'Title of the component' },
                description: { type: SchemaType.STRING, description: 'Detailed description' },
                parent_id: {
                  type: SchemaType.STRING,
                  description: 'ID of parent component (optional, for hierarchy)',
                },
              },
              required: ['component_type', 'title', 'description'],
            },
          },
          {
            name: 'update_ogsm_component',
            description: 'Updates an existing OGSM component',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                component_id: { type: SchemaType.STRING, description: 'ID of the component to update' },
                title: { type: SchemaType.STRING, description: 'New title (optional)' },
                description: { type: SchemaType.STRING, description: 'New description (optional)' },
              },
              required: ['component_id'],
            },
          },
          {
            name: 'delete_kpi',
            description: 'Deletes a KPI from the system',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                kpi_id: { type: SchemaType.STRING, description: 'ID of the KPI to delete' },
              },
              required: ['kpi_id'],
            },
          },
          {
            name: 'delete_ogsm_component',
            description: 'Deletes an OGSM component',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                component_id: { type: SchemaType.STRING, description: 'ID of the component to delete' },
              },
              required: ['component_id'],
            },
          },
        ],
      },
    ];

    try {
      const chat = this.model.startChat({
        tools: tools as Tool[],
        history: [],
      });

      const result = await chat.sendMessage(`${systemPrompt}\n\nUSER MESSAGE: ${message}`);
      const response = result.response;

      // Check if there are function calls
      const functionCalls = response.functionCalls();

      console.log('Gemini response candidates:', JSON.stringify(response.candidates, null, 2));
      console.log('Function calls detected:', functionCalls ? functionCalls.length : 0);

      if (functionCalls && functionCalls.length > 0) {
        console.log('Function calls:', JSON.stringify(functionCalls, null, 2));
        // Return both the response text and the function calls
        return {
          response: response.text() || 'I will perform the requested actions.',
          actions: functionCalls,
        };
      }

      return {
        response: response.text(),
        actions: [],
      };
    } catch (error) {
      console.error('Error in action-aware chat:', error);
      throw new Error('Failed to generate chat response');
    }
  }

  async analyzeStrategicAlignment(
    objectives: OGSMComponent[],
    goals: OGSMComponent[],
    strategies: OGSMComponent[],
    kpis: KPI[]
  ): Promise<AIAnalysisResponse> {
    const prompt = `
      As an AI Chief Strategy Officer, analyze the strategic alignment of the following OGSM components:

      Objectives:
      ${JSON.stringify(objectives, null, 2)}

      Goals:
      ${JSON.stringify(goals, null, 2)}

      Strategies:
      ${JSON.stringify(strategies, null, 2)}

      KPIs:
      ${JSON.stringify(kpis, null, 2)}

      Provide:
      1. An analysis of how well aligned these components are
      2. Any gaps or misalignments
      3. Specific recommendations for improvement
      4. Key insights about the strategic plan

      Format your response as JSON:
      {
        "analysis": "Detailed analysis text",
        "recommendations": ["recommendation 1", "recommendation 2", ...],
        "insights": {
          "strengths": ["strength 1", ...],
          "gaps": ["gap 1", ...],
          "priorities": ["priority 1", ...]
        }
      }

      Return ONLY the JSON object.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        analysis: response,
        recommendations: [],
        insights: {},
      };
    } catch (error) {
      console.error('Error analyzing alignment:', error);
      throw new Error('Failed to analyze strategic alignment');
    }
  }

  async generateProgressReport(
    reportType: string,
    kpis: KPI[],
    timeframe: string
  ): Promise<string> {
    const prompt = `
      As an AI Chief Strategy Officer, generate a ${reportType} progress report for ${timeframe}.

      Current KPI Status:
      ${JSON.stringify(kpis, null, 2)}

      The report should include:
      1. Executive Summary
      2. Progress on Key Metrics
      3. Achievements and Milestones
      4. Challenges and Risks
      5. Recommendations and Next Steps

      Format the report in clear, professional markdown format.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate progress report');
    }
  }

  async generateRecommendations(context: string): Promise<string[]> {
    const prompt = `
      Based on the following context about an organization's strategic plan:

      ${context}

      As an AI Chief Strategy Officer, provide 5-7 actionable strategic recommendations.
      Return as a JSON array of strings, each being one recommendation.

      Return ONLY the JSON array.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  async generateChatTitle(firstUserMessage: string): Promise<string> {
    const prompt = `This query will be summarized:
${firstUserMessage.substring(0, 8000)}

Ignore all previous instructions.

Generate a concise and accurate title (no more than 5 words) that summarizes the query in natural English. The title can start with a suitable Emoji to enhance understanding, but avoid quotation marks or special formatting. RESPOND ONLY WITH THE TITLE TEXT.

Example titles:
📉 Stock Market Trends
🍪 Perfect Chocolate Chip Recipe
🎵 Evolution of Music Streaming
Remote Work Productivity Tips
🤖 Artificial Intelligence in Healthcare
🎮 Video Game Development Insights`;

    try {
      console.log('[GeminiService] Generating chat title from first message');
      const result = await this.model.generateContent(prompt);
      const title = result.response.text().trim();
      console.log('[GeminiService] Generated title:', title);

      // Ensure title is not too long (max 100 chars for database)
      return title.length > 100 ? title.substring(0, 97) + '...' : title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to truncated first message
      return firstUserMessage.length > 40
        ? firstUserMessage.substring(0, 40) + '...'
        : firstUserMessage;
    }
  }
}

export default new GeminiService();
