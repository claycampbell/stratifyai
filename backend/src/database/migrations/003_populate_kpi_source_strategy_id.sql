-- Migration: Populate source_strategy_id for existing KPIs
-- This links KPIs back to their source fiscal planning strategies

-- Update KPIs that have a matching strategy name or were created around the same time
-- This is a best-effort migration for existing data

-- Strategy 1: Link KPIs by matching OGSM component ID to strategies that were converted to OGSM
UPDATE kpis k
SET source_strategy_id = s.id
FROM fiscal_year_draft_strategies s
WHERE k.source_strategy_id IS NULL
  AND k.ogsm_component_id = s.converted_to_ogsm_id
  AND s.converted_to_ogsm_id IS NOT NULL;

-- Strategy 2: Link remaining KPIs by matching creation time window (within 5 minutes)
-- and matching fiscal plan through OGSM component hierarchy
UPDATE kpis k
SET source_strategy_id = s.id
FROM fiscal_year_draft_strategies s
INNER JOIN fiscal_year_priorities p ON s.priority_id = p.id
INNER JOIN ogsm_components oc ON k.ogsm_component_id = oc.id
WHERE k.source_strategy_id IS NULL
  AND k.created_at BETWEEN s.created_at - INTERVAL '5 minutes' AND s.created_at + INTERVAL '10 minutes'
  AND s.status = 'converted';

-- Strategy 3: For any remaining unlinked KPIs, link them to strategies from the same fiscal plan
-- based on the OGSM component's parent relationship
UPDATE kpis k
SET source_strategy_id = (
  SELECT s.id
  FROM fiscal_year_draft_strategies s
  WHERE s.converted_to_ogsm_id = k.ogsm_component_id
  LIMIT 1
)
WHERE k.source_strategy_id IS NULL
  AND k.ogsm_component_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM fiscal_year_draft_strategies s
    WHERE s.converted_to_ogsm_id = k.ogsm_component_id
  );
