-- Migration: K-2 KPI Cleanup — APPLY (DESTRUCTIVE)
-- Run AFTER reviewing 008_kpi_cleanup_dryrun.sql output and confirming the
-- sample-KPI identification method in the PR description.
--
-- This script:
--   1. Merges duplicate kpi_categories (case-insensitive, whitespace-trimmed),
--      reassigning KPIs to the canonical row before deleting duplicates.
--   2. Deletes sample/fake KPIs based on the WHERE clause in section 2.
--      DEFAULT: matches obvious naming patterns. EDIT before running.
--   3. Does NOT delete owner-less KPIs — those are surfaced in the
--      admin "needs owner" queue (see frontend admin views).
--
-- All work happens in a single transaction. ROLLBACK if any step looks wrong.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/src/database/migrations/008_kpi_cleanup_apply.sql

BEGIN;

-- ============================================================
-- 1. Merge duplicate kpi_categories
-- ============================================================
-- Strategy: For each set of duplicates (matched on LOWER(TRIM(name))),
-- keep the canonical row (lowest order_index, then earliest created_at,
-- preferring is_default = true). Reassign all KPIs from duplicates to
-- canonical, then delete the duplicates.

DO $$
DECLARE
  canonical_id UUID;
  duplicate_id UUID;
  rec RECORD;
BEGIN
  FOR rec IN
    WITH normalized AS (
      SELECT
        id,
        LOWER(TRIM(name)) AS normalized_name,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(name))
          ORDER BY is_default DESC, order_index ASC, created_at ASC
        ) AS rank_within_group
      FROM kpi_categories
    ),
    grouped AS (
      SELECT normalized_name
      FROM normalized
      GROUP BY normalized_name
      HAVING COUNT(*) > 1
    )
    SELECT n.id, n.normalized_name, n.rank_within_group
    FROM normalized n
    INNER JOIN grouped g ON n.normalized_name = g.normalized_name
    ORDER BY n.normalized_name, n.rank_within_group
  LOOP
    IF rec.rank_within_group = 1 THEN
      canonical_id := rec.id;
      RAISE NOTICE 'Canonical for "%": %', rec.normalized_name, canonical_id;
    ELSE
      duplicate_id := rec.id;
      -- Reassign KPIs
      UPDATE kpis SET category_id = canonical_id WHERE category_id = duplicate_id;
      -- Delete the duplicate row
      DELETE FROM kpi_categories WHERE id = duplicate_id;
      RAISE NOTICE '  Merged duplicate % -> canonical %', duplicate_id, canonical_id;
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- 2. Delete sample/fake KPIs
-- ============================================================
-- !!! REVIEW THIS WHERE CLAUSE BEFORE RUNNING. !!!
-- Default heuristic catches obvious naming patterns. The pre-step in the dry
-- run output may have shown additional/different IDs to delete. Edit the IN()
-- list at the bottom of this query if working from a manual ID list.
--
-- The CASCADE FK on kpi_history will remove history rows automatically.

DELETE FROM kpis
WHERE
  LOWER(name) LIKE '%sample%'
  OR LOWER(name) LIKE '%test kpi%'
  OR LOWER(name) LIKE '%demo kpi%'
  OR LOWER(name) LIKE '%example%'
  OR LOWER(name) LIKE 'lorem%'
  OR LOWER(description) LIKE '%lorem ipsum%'
  -- Append a manual ID list here if needed:
  -- OR id IN ('uuid-1', 'uuid-2', ...)
;

-- Report what was deleted (count visible in the CLI summary at the end of the txn)
\echo 'Sample/fake KPIs deleted. Review counts before COMMIT.'


-- ============================================================
-- 3. Final summary
-- ============================================================

\echo ''
\echo '== After-state summary =='
SELECT
  (SELECT COUNT(*) FROM kpi_categories) AS total_categories_after,
  (SELECT COUNT(*) FROM (
    SELECT LOWER(TRIM(name)) FROM kpi_categories GROUP BY LOWER(TRIM(name)) HAVING COUNT(*) > 1
  ) d) AS duplicate_category_groups_remaining,
  (SELECT COUNT(*) FROM kpis) AS total_kpis_after,
  (SELECT COUNT(*) FROM kpis WHERE
    (ownership IS NULL OR TRIM(ownership) = '')
    AND (owner_email IS NULL OR TRIM(owner_email) = '')
    AND (persons_responsible IS NULL OR cardinality(persons_responsible) = 0)
  ) AS kpis_still_missing_owner;

-- !!! IMPORTANT !!!
-- Review the summary above before committing. If anything looks wrong:
--   ROLLBACK;
-- Otherwise:
--   COMMIT;
--
-- This script intentionally does NOT auto-COMMIT. The operator must do it.
