import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { Budget, BudgetTransaction } from '../types';

const router = Router();

// ============================================================
// BUDGETS CRUD
// ============================================================

// GET all budgets
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, budget_type, fiscal_year, fiscal_quarter, owner_email, sort_by = 'created_at', sort_order = 'desc' } = req.query;

    let query = 'SELECT * FROM budgets WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (budget_type) {
      query += ` AND budget_type = $${paramCount}`;
      params.push(budget_type);
      paramCount++;
    }

    if (fiscal_year) {
      query += ` AND fiscal_year = $${paramCount}`;
      params.push(fiscal_year);
      paramCount++;
    }

    if (fiscal_quarter) {
      query += ` AND fiscal_quarter = $${paramCount}`;
      params.push(fiscal_quarter);
      paramCount++;
    }

    if (owner_email) {
      query += ` AND owner_email = $${paramCount}`;
      params.push(owner_email);
      paramCount++;
    }

    // Add ordering
    const validSortColumns = ['created_at', 'updated_at', 'budget_name', 'allocated_amount', 'variance_percentage'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'created_at';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET single budget by ID (with transactions)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get budget
    const budgetResult = await pool.query('SELECT * FROM budgets WHERE id = $1', [id]);

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Get transactions
    const transactionsResult = await pool.query(
      'SELECT * FROM budget_transactions WHERE budget_id = $1 ORDER BY transaction_date DESC',
      [id]
    );

    const budget = {
      ...budgetResult.rows[0],
      transactions: transactionsResult.rows,
    };

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

// GET budgets by OGSM component
router.get('/ogsm/:ogsmId', async (req: Request, res: Response) => {
  try {
    const { ogsmId } = req.params;
    const result = await pool.query(
      'SELECT * FROM budgets WHERE ogsm_component_id = $1 ORDER BY fiscal_year DESC, fiscal_quarter DESC',
      [ogsmId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budgets for OGSM component:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET budgets by initiative
router.get('/initiative/:initiativeId', async (req: Request, res: Response) => {
  try {
    const { initiativeId } = req.params;
    const result = await pool.query(
      'SELECT * FROM budgets WHERE initiative_id = $1 ORDER BY created_at DESC',
      [initiativeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budgets for initiative:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET budget statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { fiscal_year, fiscal_quarter } = req.query;

    let whereClause = "WHERE status != 'closed'";
    const params: any[] = [];
    let paramCount = 1;

    if (fiscal_year) {
      whereClause += ` AND fiscal_year = $${paramCount}`;
      params.push(fiscal_year);
      paramCount++;
    }

    if (fiscal_quarter) {
      whereClause += ` AND fiscal_quarter = $${paramCount}`;
      params.push(fiscal_quarter);
      paramCount++;
    }

    const statsQuery = `
      SELECT
        COUNT(*) as total_budgets,
        SUM(allocated_amount) as total_allocated,
        SUM(spent_amount) as total_spent,
        SUM(committed_amount) as total_committed,
        SUM(remaining_amount) as total_remaining,
        AVG(variance_percentage) as avg_variance_percentage,
        COUNT(*) FILTER (WHERE variance_amount > 0) as over_budget_count,
        COUNT(*) FILTER (WHERE variance_amount < 0) as under_budget_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'depleted') as depleted_count
      FROM budgets
      ${whereClause}
    `;

    const typeQuery = `
      SELECT
        budget_type,
        COUNT(*) as count,
        SUM(allocated_amount) as allocated,
        SUM(spent_amount) as spent,
        SUM(remaining_amount) as remaining
      FROM budgets
      ${whereClause}
      GROUP BY budget_type
      ORDER BY allocated DESC
    `;

    const [statsResult, typeResult] = await Promise.all([
      pool.query(statsQuery, params),
      pool.query(typeQuery, params),
    ]);

    res.json({
      summary: statsResult.rows[0],
      by_type: typeResult.rows,
    });
  } catch (error) {
    console.error('Error fetching budget statistics:', error);
    res.status(500).json({ error: 'Failed to fetch budget statistics' });
  }
});

// POST create new budget
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      ogsm_component_id,
      initiative_id,
      budget_name,
      description,
      budget_type = 'project',
      fiscal_year,
      fiscal_quarter,
      allocated_amount,
      spent_amount = 0,
      committed_amount = 0,
      status = 'active',
      owner_email,
      approval_required = true,
      approved_by,
      approved_at,
      tags,
      metadata,
    } = req.body;

    // Validation
    if (!budget_name || allocated_amount === undefined) {
      return res.status(400).json({ error: 'budget_name and allocated_amount are required' });
    }

    if (allocated_amount < 0) {
      return res.status(400).json({ error: 'allocated_amount must be non-negative' });
    }

    const result = await pool.query(
      `INSERT INTO budgets (
        ogsm_component_id, initiative_id, budget_name, description, budget_type,
        fiscal_year, fiscal_quarter, allocated_amount, spent_amount, committed_amount,
        status, owner_email, approval_required, approved_by, approved_at, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        ogsm_component_id || null,
        initiative_id || null,
        budget_name,
        description || null,
        budget_type,
        fiscal_year || null,
        fiscal_quarter || null,
        allocated_amount,
        spent_amount,
        committed_amount,
        status,
        owner_email || null,
        approval_required,
        approved_by || null,
        approved_at || null,
        tags || null,
        metadata || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// PUT update budget
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ogsm_component_id,
      initiative_id,
      budget_name,
      description,
      budget_type,
      fiscal_year,
      fiscal_quarter,
      allocated_amount,
      spent_amount,
      committed_amount,
      status,
      owner_email,
      approval_required,
      approved_by,
      approved_at,
      tags,
      metadata,
    } = req.body;

    const result = await pool.query(
      `UPDATE budgets SET
        ogsm_component_id = COALESCE($1, ogsm_component_id),
        initiative_id = COALESCE($2, initiative_id),
        budget_name = COALESCE($3, budget_name),
        description = COALESCE($4, description),
        budget_type = COALESCE($5, budget_type),
        fiscal_year = COALESCE($6, fiscal_year),
        fiscal_quarter = COALESCE($7, fiscal_quarter),
        allocated_amount = COALESCE($8, allocated_amount),
        spent_amount = COALESCE($9, spent_amount),
        committed_amount = COALESCE($10, committed_amount),
        status = COALESCE($11, status),
        owner_email = COALESCE($12, owner_email),
        approval_required = COALESCE($13, approval_required),
        approved_by = COALESCE($14, approved_by),
        approved_at = COALESCE($15, approved_at),
        tags = COALESCE($16, tags),
        metadata = COALESCE($17, metadata),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *`,
      [
        ogsm_component_id,
        initiative_id,
        budget_name,
        description,
        budget_type,
        fiscal_year,
        fiscal_quarter,
        allocated_amount,
        spent_amount,
        committed_amount,
        status,
        owner_email,
        approval_required,
        approved_by,
        approved_at,
        tags,
        metadata,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// DELETE budget
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM budgets WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully', budget: result.rows[0] });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// ============================================================
// BUDGET TRANSACTIONS
// ============================================================

// GET transactions for a budget
router.get('/:budgetId/transactions', async (req: Request, res: Response) => {
  try {
    const { budgetId } = req.params;
    const result = await pool.query(
      'SELECT * FROM budget_transactions WHERE budget_id = $1 ORDER BY transaction_date DESC, created_at DESC',
      [budgetId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST create transaction
router.post('/:budgetId/transactions', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { budgetId } = req.params;
    const { transaction_type, amount, transaction_date, description, category, reference_number, approved_by, metadata } = req.body;

    if (!transaction_type || amount === undefined || !transaction_date) {
      return res.status(400).json({ error: 'transaction_type, amount, and transaction_date are required' });
    }

    // Create transaction
    const transactionResult = await client.query(
      `INSERT INTO budget_transactions (
        budget_id, transaction_type, amount, transaction_date, description,
        category, reference_number, approved_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        budgetId,
        transaction_type,
        amount,
        transaction_date,
        description || null,
        category || null,
        reference_number || null,
        approved_by || null,
        metadata || null,
      ]
    );

    // Update budget amounts based on transaction type
    let updateQuery = '';
    switch (transaction_type) {
      case 'expenditure':
        updateQuery = 'UPDATE budgets SET spent_amount = spent_amount + $1 WHERE id = $2 RETURNING *';
        break;
      case 'commitment':
        updateQuery = 'UPDATE budgets SET committed_amount = committed_amount + $1 WHERE id = $2 RETURNING *';
        break;
      case 'allocation':
        updateQuery = 'UPDATE budgets SET allocated_amount = allocated_amount + $1 WHERE id = $2 RETURNING *';
        break;
      case 'refund':
        updateQuery = 'UPDATE budgets SET spent_amount = spent_amount - $1 WHERE id = $2 RETURNING *';
        break;
      case 'adjustment':
        // For adjustments, we don't automatically update budget amounts
        break;
    }

    let updatedBudget = null;
    if (updateQuery) {
      const budgetUpdateResult = await client.query(updateQuery, [Math.abs(amount), budgetId]);
      updatedBudget = budgetUpdateResult.rows[0];
    }

    await client.query('COMMIT');

    res.status(201).json({
      transaction: transactionResult.rows[0],
      budget: updatedBudget,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    client.release();
  }
});

// DELETE transaction
router.delete('/:budgetId/transactions/:transactionId', async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { transactionId } = req.params;

    // Get transaction details before deleting
    const transactionResult = await client.query('SELECT * FROM budget_transactions WHERE id = $1', [transactionId]);

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Reverse the budget update
    let updateQuery = '';
    switch (transaction.transaction_type) {
      case 'expenditure':
        updateQuery = 'UPDATE budgets SET spent_amount = spent_amount - $1 WHERE id = $2';
        break;
      case 'commitment':
        updateQuery = 'UPDATE budgets SET committed_amount = committed_amount - $1 WHERE id = $2';
        break;
      case 'allocation':
        updateQuery = 'UPDATE budgets SET allocated_amount = allocated_amount - $1 WHERE id = $2';
        break;
      case 'refund':
        updateQuery = 'UPDATE budgets SET spent_amount = spent_amount + $1 WHERE id = $2';
        break;
    }

    if (updateQuery) {
      await client.query(updateQuery, [Math.abs(transaction.amount), transaction.budget_id]);
    }

    // Delete transaction
    await client.query('DELETE FROM budget_transactions WHERE id = $1', [transactionId]);

    await client.query('COMMIT');

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  } finally {
    client.release();
  }
});

export default router;
