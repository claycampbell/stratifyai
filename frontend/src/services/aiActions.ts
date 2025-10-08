import { kpisApi, ogsmApi } from '@/lib/api';

export interface AIAction {
  type: 'add_kpi' | 'update_kpi' | 'add_objective' | 'add_goal' | 'add_strategy' | 'analyze_alignment' | 'generate_report' | 'none';
  parameters?: Record<string, any>;
  requiresConfirmation?: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Parse user message to detect intent and extract action parameters
 */
export function parseUserIntent(message: string): AIAction {
  const lowerMessage = message.toLowerCase();

  // KPI-related actions
  if (
    lowerMessage.includes('add kpi') ||
    lowerMessage.includes('create kpi') ||
    lowerMessage.includes('new kpi')
  ) {
    return {
      type: 'add_kpi',
      parameters: extractKPIParameters(message),
      requiresConfirmation: true,
    };
  }

  if (
    lowerMessage.includes('update kpi') ||
    lowerMessage.includes('change kpi') ||
    lowerMessage.includes('modify kpi')
  ) {
    return {
      type: 'update_kpi',
      parameters: extractKPIParameters(message),
      requiresConfirmation: true,
    };
  }

  // OGSM component actions
  if (
    lowerMessage.includes('add objective') ||
    lowerMessage.includes('create objective') ||
    lowerMessage.includes('new objective')
  ) {
    return {
      type: 'add_objective',
      parameters: extractOGSMParameters(message, 'objective'),
      requiresConfirmation: true,
    };
  }

  if (
    lowerMessage.includes('add goal') ||
    lowerMessage.includes('create goal') ||
    lowerMessage.includes('new goal')
  ) {
    return {
      type: 'add_goal',
      parameters: extractOGSMParameters(message, 'goal'),
      requiresConfirmation: true,
    };
  }

  if (
    lowerMessage.includes('add strategy') ||
    lowerMessage.includes('create strategy') ||
    lowerMessage.includes('new strategy')
  ) {
    return {
      type: 'add_strategy',
      parameters: extractOGSMParameters(message, 'strategy'),
      requiresConfirmation: true,
    };
  }

  // Analysis actions
  if (
    lowerMessage.includes('analyze') ||
    lowerMessage.includes('alignment') ||
    lowerMessage.includes('check alignment')
  ) {
    return {
      type: 'analyze_alignment',
      requiresConfirmation: false,
    };
  }

  if (
    lowerMessage.includes('generate report') ||
    lowerMessage.includes('create report')
  ) {
    return {
      type: 'generate_report',
      parameters: extractReportParameters(message),
      requiresConfirmation: true,
    };
  }

  return { type: 'none' };
}

/**
 * Execute an action based on its type and parameters
 */
export async function executeAction(action: AIAction): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'add_kpi':
        return await addKPI(action.parameters!);

      case 'update_kpi':
        return await updateKPI(action.parameters!);

      case 'add_objective':
      case 'add_goal':
      case 'add_strategy':
        return await addOGSMComponent(action.type, action.parameters!);

      case 'analyze_alignment':
        return { success: true, message: 'Analysis initiated. Check the AI response for details.' };

      case 'generate_report':
        return { success: true, message: 'Report generation initiated. Check the Reports page.' };

      default:
        return { success: false, message: 'Unknown action type' };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to execute action: ${error.message || 'Unknown error'}`,
    };
  }
}

// Helper functions for executing specific actions

async function addKPI(params: Record<string, any>): Promise<ActionResult> {
  const kpiData = {
    name: params.name,
    description: params.description || '',
    target_value: params.target_value ? parseFloat(params.target_value) : null,
    current_value: params.current_value ? parseFloat(params.current_value) : null,
    unit: params.unit || '',
    frequency: params.frequency || 'monthly',
    status: params.status || 'on_track',
  };

  const response = await kpisApi.create(kpiData);

  return {
    success: true,
    message: `Successfully created KPI: ${kpiData.name}`,
    data: response.data,
  };
}

async function updateKPI(params: Record<string, any>): Promise<ActionResult> {
  if (!params.id) {
    return { success: false, message: 'KPI ID is required for update' };
  }

  const updateData: Record<string, any> = {};

  if (params.name) updateData.name = params.name;
  if (params.description) updateData.description = params.description;
  if (params.target_value) updateData.target_value = parseFloat(params.target_value);
  if (params.current_value) updateData.current_value = parseFloat(params.current_value);
  if (params.unit) updateData.unit = params.unit;
  if (params.frequency) updateData.frequency = params.frequency;
  if (params.status) updateData.status = params.status;

  const response = await kpisApi.update(params.id, updateData);

  return {
    success: true,
    message: `Successfully updated KPI`,
    data: response.data,
  };
}

async function addOGSMComponent(
  type: 'add_objective' | 'add_goal' | 'add_strategy',
  params: Record<string, any>
): Promise<ActionResult> {
  const componentType = type.replace('add_', '');

  const ogsmData = {
    component_type: componentType,
    title: params.title,
    description: params.description || '',
    parent_id: params.parent_id || null,
    order_index: params.order_index || 0,
  };

  const response = await ogsmApi.create(ogsmData);

  return {
    success: true,
    message: `Successfully created ${componentType}: ${ogsmData.title}`,
    data: response.data,
  };
}

// Helper functions for parameter extraction

function extractKPIParameters(message: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract name (after "called", "named", quotes, or between specific markers)
  const nameMatch = message.match(/(?:called|named)\s+["']?([^"'\n]+?)["']?(?:\s+with|\s+that|\s*$)/i) ||
                   message.match(/["']([^"']+)["']/);
  if (nameMatch) {
    params.name = nameMatch[1].trim();
  }

  // Extract target value
  const targetMatch = message.match(/target\s+(?:of\s+)?(\d+(?:\.\d+)?)/i);
  if (targetMatch) {
    params.target_value = targetMatch[1];
  }

  // Extract current value
  const currentMatch = message.match(/current(?:\s+value)?\s+(?:of\s+)?(\d+(?:\.\d+)?)/i);
  if (currentMatch) {
    params.current_value = currentMatch[1];
  }

  // Extract unit
  const unitMatch = message.match(/(?:in|unit)\s+(\w+)/i) ||
                   message.match(/(\%|percent|dollars?|\$|users?|customers?)/i);
  if (unitMatch) {
    params.unit = unitMatch[1];
  }

  // Extract frequency
  const freqMatch = message.match(/(daily|weekly|monthly|quarterly|annual)/i);
  if (freqMatch) {
    params.frequency = freqMatch[1].toLowerCase();
  }

  return params;
}

function extractOGSMParameters(message: string, _type: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract title
  const titleMatch = message.match(/(?:called|named|titled)\s+["']?([^"'\n]+?)["']?(?:\s+with|\s+that|\s*$)/i) ||
                    message.match(/["']([^"']+)["']/);
  if (titleMatch) {
    params.title = titleMatch[1].trim();
  }

  // Extract description (after "with description" or "that")
  const descMatch = message.match(/(?:with description|that|:)\s+["']?([^"'\n]+?)["']?\s*$/i);
  if (descMatch) {
    params.description = descMatch[1].trim();
  }

  return params;
}

function extractReportParameters(message: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract report type
  const typeMatch = message.match(/(monthly|quarterly|annual|progress|strategic)\s+report/i);
  if (typeMatch) {
    params.report_type = typeMatch[1].toLowerCase();
  }

  // Extract title
  const titleMatch = message.match(/(?:called|named|titled)\s+["']?([^"'\n]+?)["']?/i);
  if (titleMatch) {
    params.title = titleMatch[1].trim();
  }

  return params;
}
