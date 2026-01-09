import { Router, Request, Response } from 'express';
import fiscalPlanningService from '../services/fiscalPlanningService';
import {
  CreateFiscalPlanRequest,
  UpdatePrioritiesRequest,
  ImportPriorityRequest,
  AddStrategyRequest,
  BulkAddStrategiesRequest,
  UpdateStrategyStatusRequest,
  ConvertToOGSMRequest
} from '../types';

const router = Router();

// Create a new fiscal year plan
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const { fiscal_year, start_date, end_date }: CreateFiscalPlanRequest = req.body;

    if (!fiscal_year) {
      return res.status(400).json({ error: 'fiscal_year is required' });
    }

    const plan = await fiscalPlanningService.createPlan({
      fiscal_year,
      start_date,
      end_date
    });

    res.status(201).json(plan);
  } catch (error: any) {
    console.error('Error creating fiscal plan:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Fiscal year plan already exists' });
    }

    res.status(500).json({ error: 'Failed to create fiscal plan' });
  }
});

// Get all fiscal year plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await fiscalPlanningService.getAllPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error getting fiscal plans:', error);
    res.status(500).json({ error: 'Failed to get fiscal plans' });
  }
});

// Get active fiscal year plan
router.get('/plans/active', async (req: Request, res: Response) => {
  try {
    const plan = await fiscalPlanningService.getActivePlan();

    if (!plan) {
      return res.status(404).json({ error: 'No active fiscal plan found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error getting active fiscal plan:', error);
    res.status(500).json({ error: 'Failed to get active fiscal plan' });
  }
});

// Get fiscal plan by ID with full relations
router.get('/plans/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const plan = await fiscalPlanningService.getPlanById(planId);

    if (!plan) {
      return res.status(404).json({ error: 'Fiscal plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error getting fiscal plan:', error);
    res.status(500).json({ error: 'Failed to get fiscal plan' });
  }
});

// Add/update priorities for a plan
router.post('/plans/:planId/priorities', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { priorities }: UpdatePrioritiesRequest = req.body;

    if (!priorities || !Array.isArray(priorities)) {
      return res.status(400).json({ error: 'priorities array is required' });
    }

    // Validate priority numbers
    const priorityNumbers = priorities.map(p => p.priority_number);
    if (priorityNumbers.some(n => n < 1 || n > 3)) {
      return res.status(400).json({ error: 'priority_number must be between 1 and 3' });
    }

    const createdPriorities = await fiscalPlanningService.updatePriorities(planId, priorities);

    res.json(createdPriorities);
  } catch (error) {
    console.error('Error updating priorities:', error);
    res.status(500).json({ error: 'Failed to update priorities' });
  }
});

// Import priority from existing OGSM component
router.post('/plans/:planId/priorities/import', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { ogsm_component_id, priority_number }: ImportPriorityRequest = req.body;

    if (!ogsm_component_id || !priority_number) {
      return res.status(400).json({ error: 'ogsm_component_id and priority_number are required' });
    }

    if (priority_number < 1 || priority_number > 3) {
      return res.status(400).json({ error: 'priority_number must be between 1 and 3' });
    }

    const priority = await fiscalPlanningService.importPriorityFromOGSM(
      planId,
      ogsm_component_id,
      priority_number
    );

    res.json(priority);
  } catch (error: any) {
    console.error('Error importing priority:', error);

    if (error.message === 'OGSM component not found') {
      return res.status(404).json({ error: 'OGSM component not found' });
    }

    res.status(500).json({ error: 'Failed to import priority' });
  }
});

// Add AI-generated strategy to plan
router.post('/plans/:planId/strategies', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { priority_id, strategy, ai_generation_id }: AddStrategyRequest = req.body;

    if (!priority_id || !strategy || !strategy.title) {
      return res.status(400).json({ error: 'priority_id and strategy with title are required' });
    }

    const draftStrategy = await fiscalPlanningService.addDraftStrategy(
      planId,
      priority_id,
      strategy,
      ai_generation_id
    );

    res.status(201).json(draftStrategy);
  } catch (error) {
    console.error('Error adding draft strategy:', error);
    res.status(500).json({ error: 'Failed to add draft strategy' });
  }
});

// Bulk add strategies
router.post('/plans/:planId/strategies/bulk', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { strategies }: BulkAddStrategiesRequest = req.body;

    if (!strategies || !Array.isArray(strategies)) {
      return res.status(400).json({ error: 'strategies array is required' });
    }

    // Map to service format
    const strategyData = strategies.map(s => ({
      planId,
      priorityId: s.priority_id,
      strategy: s.strategy,
      aiGenerationId: s.ai_generation_id
    }));

    const createdStrategies = await fiscalPlanningService.bulkAddDraftStrategies(strategyData);

    res.status(201).json(createdStrategies);
  } catch (error) {
    console.error('Error bulk adding strategies:', error);
    res.status(500).json({ error: 'Failed to bulk add strategies' });
  }
});

// Update draft strategy status
router.patch('/strategies/:strategyId', async (req: Request, res: Response) => {
  try {
    const { strategyId } = req.params;
    const { status, review_notes }: UpdateStrategyStatusRequest = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['draft', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedStrategy = await fiscalPlanningService.updateStrategyStatus(
      strategyId,
      status,
      review_notes
    );

    res.json(updatedStrategy);
  } catch (error: any) {
    console.error('Error updating strategy status:', error);

    if (error.message === 'Draft strategy not found') {
      return res.status(404).json({ error: 'Draft strategy not found' });
    }

    res.status(500).json({ error: 'Failed to update strategy status' });
  }
});

// Convert approved strategies to OGSM
router.post('/plans/:planId/convert-to-ogsm', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { strategy_ids }: ConvertToOGSMRequest = req.body;

    if (!strategy_ids || !Array.isArray(strategy_ids) || strategy_ids.length === 0) {
      return res.status(400).json({ error: 'strategy_ids array with at least one ID is required' });
    }

    const result = await fiscalPlanningService.convertToOGSM(planId, strategy_ids);

    res.json(result);
  } catch (error) {
    console.error('Error converting strategies to OGSM:', error);
    res.status(500).json({ error: 'Failed to convert strategies to OGSM' });
  }
});

// Activate plan (make it live)
router.post('/plans/:planId/activate', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const activatedPlan = await fiscalPlanningService.activatePlan(planId);

    res.json(activatedPlan);
  } catch (error: any) {
    console.error('Error activating plan:', error);

    if (error.message?.includes('approved strategies have not been converted')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to activate plan' });
  }
});

// Get plan summary/dashboard
router.get('/plans/:planId/summary', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const summary = await fiscalPlanningService.getPlanSummary(planId);

    res.json(summary);
  } catch (error: any) {
    console.error('Error getting plan summary:', error);

    if (error.message === 'Fiscal plan not found') {
      return res.status(404).json({ error: 'Fiscal plan not found' });
    }

    res.status(500).json({ error: 'Failed to get plan summary' });
  }
});

export default router;
