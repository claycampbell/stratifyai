import { Router, Request, Response } from 'express';
import aiStrategyService from '../services/aiStrategyService';

const router = Router();

// Generate strategies based on objective
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      objective,
      industry,
      company_size,
      current_situation,
      constraints,
      resources,
      timeframe,
      num_strategies = 3
    } = req.body;

    if (!objective) {
      return res.status(400).json({ error: 'Objective is required' });
    }

    const strategies = await aiStrategyService.generateStrategies(
      {
        objective,
        industry,
        company_size,
        current_situation,
        constraints,
        resources,
        timeframe
      },
      num_strategies
    );

    res.json({
      strategies,
      generated_at: new Date().toISOString(),
      model: 'gemini-2.0-flash-exp'
    });
  } catch (error) {
    console.error('Error generating strategies:', error);
    res.status(500).json({ error: 'Failed to generate strategies' });
  }
});

// Add a strategy to the knowledge base
router.post('/knowledge-base', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.title || !data.description || !data.strategy_text) {
      return res.status(400).json({
        error: 'Title, description, and strategy_text are required'
      });
    }

    await aiStrategyService.addToKnowledgeBase(data);
    res.status(201).json({ message: 'Strategy added to knowledge base successfully' });
  } catch (error) {
    console.error('Error adding to knowledge base:', error);
    res.status(500).json({ error: 'Failed to add strategy to knowledge base' });
  }
});

// Submit feedback on a generated strategy
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const {
      generated_strategy_id,
      rating,
      feedback_type,
      comments,
      outcome_achieved,
      outcome_data
    } = req.body;

    if (!generated_strategy_id || !rating || !feedback_type) {
      return res.status(400).json({
        error: 'generated_strategy_id, rating, and feedback_type are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    await aiStrategyService.submitFeedback({
      generated_strategy_id,
      rating,
      feedback_type,
      comments,
      outcome_achieved,
      outcome_data
    });

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
