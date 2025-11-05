-- Migration: Add user_id to chat_history table
-- This migration adds user association to chat history for per-user conversation tracking

-- Add user_id column
ALTER TABLE chat_history
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON chat_history(user_id, session_id);

-- Note: Existing chat_history records will have NULL user_id
-- These can be cleaned up or associated with users as needed
