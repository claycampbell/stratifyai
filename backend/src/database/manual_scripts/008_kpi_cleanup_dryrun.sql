-- Migration: K-2 KPI Cleanup — DRY RUN
-- Run this FIRST against production. It writes nothing; it returns three result sets so an operator can review what would change before running the destructive variant (008_kpi_cleanup_apply.sql).
--
-- Per backlog ticket K-2 (docs/BACKLOG_2026-05-07_meeting_feedback.md):
--   1. De-duplicate kpi_categories (case-insensitive, whitespace-trimmed)
--   2. Identify sample/fake KPIs (pre-step required: confirm identification method)
--   3. Audit KPIs missing an owner
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/src/database/migrations/008_kpi_cleanup_dryrun.sql

-- ============================================================
-- 1. Duplicate categories (case-insensitive, whitespace-trimmed)
-- ============================================================
-- Output: groups of duplicate names. Within each group, the canonical row
-- is the one with the lowest order_index, then earliest created_at.

\echo ''
\echo '== Duplicate KPI categories (would be merged) =='
WITH normalized AS (
  SELECT
    id,
    name,
    LOWER(TRIM(name)) AS normalized_name,
    order_index,
    is_default,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(name))
      ORDER BY is_default DESC, order_index ASC, created_at ASC
    ) AS rank_within_group
  FROM kpi_categories
),
duplicates AS (
  SELECT normalized_name
  FROM normalized
  GROUP BY normalized_name
  HAVING COUNT(*) > 1
)
SELECT
  n.normalized_name,
  n.id,
  n.name AS original_name,
  CASE WHEN n.rank_within_group = 1 THEN 'CANONICAL (keep)' ELSE 'DUPLICATE (merge into canonical)' END AS action,
  (SELECT COUNT(*) FROM kpis WHERE category_id = n.id) AS kpis_using_this_category
FROM normalized n
INNER JOIN duplicates d ON n.normalized_name = d.normalized_name
ORDER BY n.normalized_name, n.rank_within_group;


-- ============================================================
-- 2. Sample / fake KPIs — IDENTIFICATION PRE-STEP
-- ============================================================
-- Per backlog K-2 pre-step: this query is INDICATIVE only. The operator must
-- confirm the identification method (column flag → naming pattern → manual
-- ID list) and document it in the PR before running the apply script.
--
-- This dry-run reports KPIs that match common sample/test patterns. Review the
-- output and override the WHERE clause in 008_kpi_cleanup_apply.sql with the
-- actual identification method before running.

\echo ''
\echo '== Suspected sample/fake KPIs (CONFIRM before deletion) =='
SELECT
  id,
  name,
  description,
  ownership,
  current_value,
  target_value,
  created_at,
  CASE
    WHEN LOWER(name) LIKE '%sample%' THEN 'name contains "sample"'
    WHEN LOWER(name) LIKE '%test%' THEN 'name contains "test"'
    WHEN LOWER(name) LIKE '%demo%' THEN 'name contains "demo"'
    WHEN LOWER(name) LIKE '%example%' THEN 'name contains "example"'
    WHEN LOWER(name) LIKE 'lorem%' OR LOWER(description) LIKE '%lorem ipsum%' THEN 'lorem ipsum content'
    WHEN ownership IS NULL AND owner_email IS NULL AND current_value IS NULL THEN 'no owner and no value'
    ELSE 'OTHER (review)'
  END AS suspect_reason
FROM kpis
WHERE
  LOWER(name) LIKE '%sample%'
  OR LOWER(name) LIKE '%test%'
  OR LOWER(name) LIKE '%demo%'
  OR LOWER(name) LIKE '%example%'
  OR LOWER(name) LIKE 'lorem%'
  OR LOWER(description) LIKE '%lorem ipsum%'
ORDER BY created_at;


-- ============================================================
-- 3. KPIs missing an owner
-- ============================================================
-- Per backlog K-2 sub-task 3: surface KPIs with null/empty owner.
-- These are NOT auto-deleted; the apply script flags them for an admin queue.

\echo ''
\echo '== KPIs missing an owner =='
SELECT
  id,
  name,
  ownership,
  owner_email,
  persons_responsible,
  created_at
FROM kpis
WHERE
  (ownership IS NULL OR TRIM(ownership) = '')
  AND (owner_email IS NULL OR TRIM(owner_email) = '')
  AND (persons_responsible IS NULL OR cardinality(persons_responsible) = 0)
ORDER BY created_at DESC;


-- ============================================================
-- Summary counts
-- ============================================================
\echo ''
\echo '== Summary =='
SELECT
  (SELECT COUNT(*) FROM kpi_categories) AS total_categories,
  (SELECT COUNT(*) FROM (
    SELECT LOWER(TRIM(name)) FROM kpi_categories GROUP BY LOWER(TRIM(name)) HAVING COUNT(*) > 1
  ) d) AS duplicate_category_groups,
  (SELECT COUNT(*) FROM kpis) AS total_kpis,
  (SELECT COUNT(*) FROM kpis WHERE
    LOWER(name) LIKE '%sample%' OR LOWER(name) LIKE '%test%'
    OR LOWER(name) LIKE '%demo%' OR LOWER(name) LIKE '%example%'
  ) AS suspected_sample_kpis,
  (SELECT COUNT(*) FROM kpis WHERE
    (ownership IS NULL OR TRIM(ownership) = '')
    AND (owner_email IS NULL OR TRIM(owner_email) = '')
    AND (persons_responsible IS NULL OR cardinality(persons_responsible) = 0)
  ) AS kpis_missing_owner;
