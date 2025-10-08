import { getGeminiModel } from '../config/gemini';
import { AIAnalysisRequest, AIAnalysisResponse, OGSMComponent, KPI } from '../types';

export class GeminiService {
  private model;

  constructor() {
    this.model = getGeminiModel('gemini-2.0-flash-exp');
  }

  async extractOGSMFromText(text: string): Promise<Partial<OGSMComponent>[]> {
    const prompt = `
      Analyze the following strategic planning document and extract OGSM (Objectives, Goals, Strategies, Measures) components.

      Document content:
      ${text}

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
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('Error extracting OGSM components:', error);
      return [];
    }
  }

  async extractKPIsFromText(text: string): Promise<Partial<KPI>[]> {
    const prompt = `
      Analyze the following text and extract all Key Performance Indicators (KPIs) and metrics.

      Text content:
      ${text}

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
      console.error('Error extracting KPIs:', error);
      return [];
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
  ): Promise<string> {
    const prompt = `
You are an AI Chief Strategy Officer for a strategic planning platform. You help users with their OGSM (Objectives, Goals, Strategies, Measures) framework and KPI management.

CURRENT SYSTEM STATE:
- Active KPIs: ${systemContext.kpis.length > 0 ? JSON.stringify(systemContext.kpis) : 'None'}
- OGSM Components: ${systemContext.ogsm.length > 0 ? JSON.stringify(systemContext.ogsm) : 'None'}

CONVERSATION HISTORY:
${chatContext}

USER MESSAGE: ${message}

CAPABILITIES:
You can help users with:
1. Strategic planning advice and insights
2. Guiding them to add/update KPIs (walk them through the details needed)
3. Helping create OGSM components (objectives, goals, strategies)
4. Analyzing strategic alignment
5. Generating reports
6. Answering questions about their current strategy

IMPORTANT INSTRUCTIONS:
- If the user wants to add a KPI, ask for: name, description, target value, current value, unit, and frequency
- If the user wants to add OGSM components, ask for: title and description
- Be conversational and helpful
- If information is missing, ask follow-up questions naturally
- When you have enough information to perform an action, provide clear guidance
- Acknowledge the current state when relevant

Respond naturally as an AI strategy advisor:
    `;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
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
}

export default new GeminiService();
