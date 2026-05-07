-- Migration: add_validation_source_entity
-- Description: Add source-entity tracking to ai_recommendation_validations.
--              Lets the dashboard surface which KPI / OGSM / plan-item change
--              triggered an AI recommendation that hit the philosophy validator.
-- Dependencies: 005_philosophy_system.sql (creates ai_recommendation_validations)
-- Author: Backlog 2026-05-07 (V-1, V-2)
--
-- Run manually against any environment that was provisioned before this column
-- was added to init.sql. Idempotent — safe to re-run.

ALTER TABLE ai_recommendation_validations
  ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_validations_source_entity
  ON ai_recommendation_validations(source_entity_type, source_entity_id);

COMMENT ON COLUMN ai_recommendation_validations.source_entity_type IS
  'Domain entity that triggered the recommendation (e.g. kpi_update, ogsm_edit, plan_item_change). Nullable.';
COMMENT ON COLUMN ai_recommendation_validations.source_entity_id IS
  'UUID of the source entity row. Nullable; not a foreign key because the entity may be deleted later.';
