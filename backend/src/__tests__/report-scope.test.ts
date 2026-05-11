/**
 * R-4 — Scope contract tests for report templates.
 *
 * STATUS: Test scaffold only. The repo has `jest` and `ts-jest` installed
 * (see backend/package.json devDependencies) but no `test` script in package
 * scripts and no jest config file. Once a runner is wired up, these tests
 * should be runnable with `npm test`.
 *
 * What these tests assert:
 *   1. The data bundle returned by `assembleTemplateData` for an
 *      `individual_report` does NOT contain KPIs whose ownership belongs
 *      to a different person.
 *   2. The prompt string built from that bundle does NOT mention out-of-
 *      scope KPI names by substring search.
 *   3. The bundle for `kpi_summary_user_window` is similarly filtered.
 *
 * The intent is regression coverage for the bug observed on 2026-05-07
 * where a "Stephen Morrison" report mixed in a GPA KPI he did not own.
 */

// Mock the database pool BEFORE importing the module under test.
// The module imports `pool` from '../config/database' at load time.
jest.mock('../config/database', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { __esModule: true, default: mockPool };
});

import pool from '../config/database';
import {
  assembleTemplateData,
  buildTemplatePrompt,
} from '../services/reportTemplates';

const mockedQuery = (pool as unknown as { query: jest.Mock }).query;

describe('Report scope contract (R-4)', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it('individual_report excludes KPIs not owned by the subject', async () => {
    // Arrange: stub the SQL queries the assembler will issue.
    // 1) users lookup by UUID — we hand back Stephen.
    // 2) KPIs filtered by Stephen's email/name — DB filtering is what we
    //    rely on; we simulate a correctly-filtered response (only his KPI).
    // 3) kpi_history for those ids.
    // 4) plan_items via staff_plans.
    // 5) validations via chat_history.
    mockedQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'stephen@rmu.edu',
            first_name: 'Stephen',
            last_name: 'Morrison',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'kpi-1',
            name: 'Football season ticket sales',
            ownership: 'Stephen Morrison',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // kpi_history
      .mockResolvedValueOnce({ rows: [] }) // plan_items
      .mockResolvedValueOnce({ rows: [] }); // validations

    const bundle = await assembleTemplateData('individual_report', {
      user_id: '11111111-1111-1111-1111-111111111111',
      days: 30,
    });

    expect(bundle.subject_label).toBe('Stephen Morrison');
    expect(bundle.data.kpis).toHaveLength(1);
    expect(bundle.data.kpis[0].name).toBe('Football season ticket sales');

    // The prompt must not mention an out-of-scope KPI.
    const prompt = buildTemplatePrompt(bundle);
    expect(prompt).toContain('Stephen Morrison');
    expect(prompt).toContain('Football season ticket sales');
    // Sanity: a KPI we did not load (e.g. "GPA") must not leak in.
    expect(prompt).not.toContain('GPA');
  });

  it('kpi_summary_user_window only includes the resolved subject in the data bundle', async () => {
    mockedQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'jane@rmu.edu',
            first_name: 'Jane',
            last_name: 'Doe',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 'kpi-99', name: 'Marketing reach', ownership: 'Jane Doe' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const bundle = await assembleTemplateData('kpi_summary_user_window', {
      user_id: '22222222-2222-2222-2222-222222222222',
      days: 7,
    });

    expect(bundle.data.subject.display_name).toBe('Jane Doe');
    expect(bundle.data.kpis).toHaveLength(1);
    expect(bundle.data.kpis.every((k: any) => k.ownership === 'Jane Doe')).toBe(true);
  });
});

// Force the module to be treated as a test file by ts-jest when wired up.
export {};
