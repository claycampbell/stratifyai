/**
 * Report Templates (R-1, R-2, R-4)
 *
 * SCOPE CONTRACT
 * --------------
 * Each template here defines (a) a structured prompt and (b) a whitelist
 * of data the prompt is allowed to reference. The data-assembly functions
 * (`assemble*Data`) MUST pre-filter rows to the subject of the report
 * (a single user, a department/category, or a fixed time window) BEFORE
 * passing data to the LLM. The prompt MUST NEVER receive entities outside
 * this scope.
 *
 * Why: free-text "generate me a report" prompts produced reports that
 * mixed in unrelated entities (e.g. a "Stephen Morrison" report including
 * a GPA KPI he doesn't own). Pre-filtering is the only correctness lever
 * we have — we cannot trust the model to filter for us.
 *
 * Adding a new template:
 *   1. Append it to `reportTemplateDefinitions` below.
 *   2. Add a corresponding case in `assembleTemplateData()` that produces
 *      a strictly-scoped data bundle.
 *   3. Add a prompt-builder case in `buildTemplatePrompt()`.
 *   4. The route handler (`POST /api/ai/reports/from-template`) wires the
 *      three together — no changes needed there.
 */

import pool from '../config/database';

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

export type TemplateParamType = 'user' | 'date' | 'string' | 'number';

export interface TemplateParameter {
  name: string;
  type: TemplateParamType;
  label: string;
  required: boolean;
  description?: string;
  default?: string | number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  /** Maps to strategic_reports.report_type */
  report_type: string;
  parameters: TemplateParameter[];
  /** Human-readable list of data sources the prompt is allowed to reference. */
  data_sources: string[];
}

export const reportTemplateDefinitions: ReportTemplate[] = [
  {
    id: 'kpi_summary_user_window',
    name: "User's KPI Summary",
    description:
      "Summary of a single user's KPIs and recent history over a rolling time window. Useful for 1:1 prep and weekly check-ins.",
    report_type: 'kpi_summary',
    parameters: [
      {
        name: 'user_id',
        type: 'user',
        label: 'User',
        required: true,
        description: 'The KPI owner this report is about.',
      },
      {
        name: 'days',
        type: 'number',
        label: 'Window (days)',
        required: true,
        default: 7,
        description: 'How many days of history to summarize.',
      },
    ],
    data_sources: [
      'KPIs where the user is owner (matched on ownership / owner_email / persons_responsible)',
      'kpi_history rows for those KPIs within the window',
    ],
  },
  {
    id: 'department_health',
    name: 'Department Health Report',
    description:
      'Health snapshot for a department or category: KPI mix, status distribution, and notable movement. v1 filters by KPI category name OR ownership text, since there is no formal department field on kpis.',
    report_type: 'department_health',
    parameters: [
      {
        name: 'department',
        type: 'string',
        label: 'Department / Category',
        required: true,
        description:
          'Free-text name. Matched (case-insensitive) against KPI category and ownership text.',
      },
    ],
    data_sources: [
      'KPIs whose category name matches OR ownership text matches the department string',
      'kpi_history rows for those KPIs (last 90 days)',
    ],
  },
  {
    id: 'monthly_strategic_review',
    name: 'Monthly Strategic Performance Review',
    description:
      'Org-wide review of OGSM components, KPIs, and initiatives within a calendar month.',
    report_type: 'monthly_review',
    parameters: [
      {
        name: 'month',
        type: 'date',
        label: 'Month (YYYY-MM)',
        required: true,
        description: 'Calendar month to review, in YYYY-MM format.',
      },
    ],
    data_sources: [
      'All OGSM components',
      'All KPIs',
      'kpi_history rows whose recorded_date falls within the month',
      'All initiatives',
    ],
  },
  {
    id: 'individual_report',
    name: 'Individual Report (1:1 Prep)',
    description:
      "Tailored report on a single person: executive summary, progress on their key metrics, recent activities, priority actions, and areas of responsibility. Designed for 1:1 prep — strictly scoped to entities tied to the chosen user.",
    report_type: 'individual',
    parameters: [
      {
        name: 'user_id',
        type: 'user',
        label: 'User',
        required: true,
        description: 'The person this report is about.',
      },
      {
        name: 'days',
        type: 'number',
        label: 'Time window (days)',
        required: false,
        default: 30,
        description: 'How many days of recent activity to surface. Defaults to 30.',
      },
    ],
    data_sources: [
      'KPIs where the user is owner (ownership / owner_email / persons_responsible)',
      'kpi_history for those KPIs (within window)',
      'Plan items from staff_plans owned by the user',
      'ai_recommendation_validations linked to the user via chat_history',
    ],
  },
];

// ---------------------------------------------------------------------------
// Scope helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a user identifier (id or email or display name) to a structured
 * shape we can use for filtering KPI ownership strings.
 *
 * The "user" param shape is permissive: callers may pass a real users.id UUID
 * or — for v1 fallback when no full user picker exists yet — an ownership
 * string. We try UUID lookup first, then fall back to treating the value as
 * the ownership text itself.
 */
async function resolveUserSubject(userIdOrLabel: string): Promise<{
  user_id: string | null;
  email: string | null;
  display_name: string;
  ownership_match_terms: string[];
}> {
  // Attempt UUID lookup
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    userIdOrLabel
  );

  if (isUuid) {
    try {
      const u = await pool.query(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [userIdOrLabel]
      );
      if (u.rows.length > 0) {
        const row = u.rows[0];
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
        const matchTerms: string[] = [];
        if (row.email) matchTerms.push(row.email);
        if (fullName) matchTerms.push(fullName);
        if (row.first_name) matchTerms.push(row.first_name);
        if (row.last_name) matchTerms.push(row.last_name);
        return {
          user_id: row.id,
          email: row.email || null,
          display_name: fullName || row.email || 'Unknown user',
          ownership_match_terms: matchTerms,
        };
      }
    } catch (err) {
      // users table might not exist in some environments — fall through.
    }
  }

  // Fallback: treat the supplied value as an ownership text label.
  return {
    user_id: null,
    email: null,
    display_name: userIdOrLabel,
    ownership_match_terms: [userIdOrLabel],
  };
}

/**
 * Fetch only the KPIs owned by a given subject. Pre-filtering is enforced
 * at the SQL layer — we do not return everything and rely on the LLM.
 */
async function fetchKPIsForSubject(subject: {
  user_id: string | null;
  email: string | null;
  ownership_match_terms: string[];
}): Promise<any[]> {
  // Build OR-of-ANY-of: owner_email match, ownership text ILIKE any term,
  // persons_responsible array overlap with any term.
  const params: any[] = [];
  const clauses: string[] = [];

  if (subject.email) {
    params.push(subject.email);
    clauses.push(`LOWER(owner_email) = LOWER($${params.length})`);
  }

  for (const term of subject.ownership_match_terms) {
    if (!term) continue;
    params.push(`%${term}%`);
    clauses.push(`ownership ILIKE $${params.length}`);
  }

  if (subject.ownership_match_terms.length > 0) {
    params.push(subject.ownership_match_terms);
    clauses.push(`persons_responsible && $${params.length}::text[]`);
  }

  if (clauses.length === 0) return [];

  const sql = `SELECT * FROM kpis WHERE ${clauses.join(' OR ')} ORDER BY created_at DESC`;
  const result = await pool.query(sql, params);
  return result.rows;
}

async function fetchHistoryForKPIs(kpiIds: string[], windowDays: number): Promise<any[]> {
  if (kpiIds.length === 0) return [];
  const result = await pool.query(
    `SELECT * FROM kpi_history
     WHERE kpi_id = ANY($1::uuid[])
       AND recorded_date >= CURRENT_DATE - ($2::int || ' days')::interval
     ORDER BY recorded_date DESC`,
    [kpiIds, windowDays]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Data assembly per template
//
// IMPORTANT: every branch returns ONLY the rows in scope for the template.
// Callers (the prompt builder + route handler) must not augment this bundle
// with additional context.
// ---------------------------------------------------------------------------

export interface AssembledTemplateData {
  template_id: string;
  subject_label: string;
  /** The actual data rows that will be embedded in the prompt. */
  data: Record<string, any>;
  /** Resolved params (defaults applied, types coerced). */
  resolved_params: Record<string, any>;
}

export async function assembleTemplateData(
  templateId: string,
  rawParams: Record<string, any>
): Promise<AssembledTemplateData> {
  const template = reportTemplateDefinitions.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  // Apply defaults & basic coercion
  const resolved: Record<string, any> = {};
  for (const p of template.parameters) {
    let v = rawParams?.[p.name];
    if ((v === undefined || v === null || v === '') && p.default !== undefined) {
      v = p.default;
    }
    if (p.required && (v === undefined || v === null || v === '')) {
      throw new Error(`Missing required parameter: ${p.name}`);
    }
    if (p.type === 'number' && v !== undefined && v !== null && v !== '') {
      v = Number(v);
    }
    resolved[p.name] = v;
  }

  switch (templateId) {
    case 'kpi_summary_user_window': {
      const subject = await resolveUserSubject(String(resolved.user_id));
      const kpis = await fetchKPIsForSubject(subject);
      const history = await fetchHistoryForKPIs(
        kpis.map((k) => k.id),
        Number(resolved.days) || 7
      );
      return {
        template_id: templateId,
        subject_label: subject.display_name,
        resolved_params: resolved,
        data: {
          subject: {
            display_name: subject.display_name,
            email: subject.email,
          },
          window_days: Number(resolved.days) || 7,
          kpis,
          kpi_history: history,
        },
      };
    }

    case 'department_health': {
      const term = String(resolved.department || '').trim();
      if (!term) {
        throw new Error('department is required');
      }
      const result = await pool.query(
        `SELECT k.*
           FROM kpis k
      LEFT JOIN kpi_categories c ON c.id = k.category_id
          WHERE LOWER(c.name) = LOWER($1)
             OR k.ownership ILIKE $2
          ORDER BY k.created_at DESC`,
        [term, `%${term}%`]
      );
      const kpis = result.rows;
      const history = await fetchHistoryForKPIs(
        kpis.map((k) => k.id),
        90
      );
      return {
        template_id: templateId,
        subject_label: term,
        resolved_params: resolved,
        data: {
          department: term,
          kpis,
          kpi_history: history,
        },
      };
    }

    case 'monthly_strategic_review': {
      const monthStr = String(resolved.month || '').trim();
      const m = monthStr.match(/^(\d{4})-(\d{2})$/);
      if (!m) {
        throw new Error('month must be in YYYY-MM format');
      }
      const startDate = `${m[1]}-${m[2]}-01`;
      // First day of next month
      const startD = new Date(`${startDate}T00:00:00Z`);
      const endD = new Date(Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth() + 1, 1));
      const endDate = endD.toISOString().substring(0, 10);

      const [ogsm, kpis, history, initiatives] = await Promise.all([
        pool.query('SELECT * FROM ogsm_components ORDER BY component_type, order_index'),
        pool.query('SELECT * FROM kpis ORDER BY created_at DESC'),
        pool.query(
          `SELECT * FROM kpi_history
           WHERE recorded_date >= $1::date AND recorded_date < $2::date
           ORDER BY recorded_date DESC`,
          [startDate, endDate]
        ),
        pool.query('SELECT * FROM initiatives ORDER BY created_at DESC').catch(() => ({
          rows: [] as any[],
        })),
      ]);
      return {
        template_id: templateId,
        subject_label: monthStr,
        resolved_params: resolved,
        data: {
          month: monthStr,
          window: { start: startDate, end: endDate },
          ogsm_components: ogsm.rows,
          kpis: kpis.rows,
          kpi_history: history.rows,
          initiatives: initiatives.rows,
        },
      };
    }

    case 'individual_report': {
      const subject = await resolveUserSubject(String(resolved.user_id));
      const days = Number(resolved.days) || 30;
      const kpis = await fetchKPIsForSubject(subject);
      const history = await fetchHistoryForKPIs(
        kpis.map((k) => k.id),
        days
      );

      // Plan items: only via staff_plans owned by this user_id (UUID).
      let planItems: any[] = [];
      if (subject.user_id) {
        try {
          const planResult = await pool.query(
            `SELECT pi.*
               FROM plan_items pi
               JOIN staff_plans sp ON sp.id = pi.plan_id
              WHERE sp.user_id = $1
              ORDER BY pi.created_at DESC
              LIMIT 200`,
            [subject.user_id]
          );
          planItems = planResult.rows;
        } catch (err) {
          // staff_plans / plan_items may not be present on all envs.
          planItems = [];
        }
      }

      // Validations linked through chat_history for this user.
      let validations: any[] = [];
      if (subject.user_id) {
        try {
          const valResult = await pool.query(
            `SELECT v.*
               FROM ai_recommendation_validations v
               JOIN chat_history ch ON ch.id = v.chat_history_id
              WHERE ch.user_id = $1
              ORDER BY v.created_at DESC
              LIMIT 50`,
            [subject.user_id]
          );
          validations = valResult.rows;
        } catch (err) {
          validations = [];
        }
      }

      return {
        template_id: templateId,
        subject_label: subject.display_name,
        resolved_params: resolved,
        data: {
          subject: {
            user_id: subject.user_id,
            email: subject.email,
            display_name: subject.display_name,
          },
          window_days: days,
          kpis,
          kpi_history: history,
          plan_items: planItems,
          validations,
        },
      };
    }

    default:
      throw new Error(`No data assembler for template: ${templateId}`);
  }
}

// ---------------------------------------------------------------------------
// Prompt builders per template
// ---------------------------------------------------------------------------

const HARD_RULE = `
HARD RULES:
- You may ONLY reference the entities provided in the JSON data block below.
- If a metric, person, OGSM component, or initiative is not in the data block, do NOT mention it. Do not invent KPIs.
- If the data block is empty for a section, write "No data available for this section." instead of speculating.
- Output clean Markdown.
`.trim();

export function buildTemplatePrompt(bundle: AssembledTemplateData): string {
  const { template_id, data, subject_label, resolved_params } = bundle;
  const jsonBlock = JSON.stringify(data, null, 2);

  switch (template_id) {
    case 'kpi_summary_user_window':
      return `
You are an AI Chief Strategy Officer at RMU Athletics. Produce a concise KPI summary
for **${subject_label}** covering the last ${resolved_params.days} days.

${HARD_RULE}

Sections (use these exact H2 headings):
## Overview
## KPIs (current vs target)
## Recent Movement (history within window)
## Risks and Watch Items
## Suggested Next Steps

Data:
\`\`\`json
${jsonBlock}
\`\`\`
`.trim();

    case 'department_health':
      return `
You are an AI Chief Strategy Officer at RMU Athletics. Produce a Department Health Report
for **${subject_label}**.

${HARD_RULE}

Sections (use these exact H2 headings):
## Department Snapshot
## KPI Status Distribution
## Notable Movement (last 90 days)
## Risks and Watch Items
## Recommended Focus

Data:
\`\`\`json
${jsonBlock}
\`\`\`
`.trim();

    case 'monthly_strategic_review':
      return `
You are an AI Chief Strategy Officer at RMU Athletics. Produce a Monthly Strategic
Performance Review for **${subject_label}**.

${HARD_RULE}

Sections (use these exact H2 headings):
## Executive Summary
## OGSM Progress
## KPI Performance
## Initiative Status
## Risks and Issues
## Priorities for Next Month

Data:
\`\`\`json
${jsonBlock}
\`\`\`
`.trim();

    case 'individual_report':
      return `
You are an AI Chief Strategy Officer at RMU Athletics. Produce an Individual Report on
**${subject_label}** for 1:1 prep. The data below has already been pre-filtered to
entities tied to this person — you MUST NOT mention anyone or anything not in the data.

${HARD_RULE}

Required sections (use these exact H2 headings, in this order):
## Executive Summary
## Progress on Key Metrics
## Recent Activities
## Priority Actions
## Areas of Responsibility

Data:
\`\`\`json
${jsonBlock}
\`\`\`
`.trim();

    default:
      throw new Error(`No prompt builder for template: ${template_id}`);
  }
}

export function getTemplateById(id: string): ReportTemplate | undefined {
  return reportTemplateDefinitions.find((t) => t.id === id);
}
