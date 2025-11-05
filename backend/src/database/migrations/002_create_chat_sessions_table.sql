-- Migration: Create chat_sessions table for better session management
-- This creates a dedicated table for chat sessions with AI-generated titles

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(user_id, updated_at DESC);

-- Clean up any chat_history records without user_id (from testing)
DELETE FROM chat_history WHERE user_id IS NULL;

-- For existing data, create session records
INSERT INTO chat_sessions (id, user_id, created_at)
SELECT DISTINCT session_id, user_id, MIN(created_at)
FROM chat_history
WHERE user_id IS NOT NULL
GROUP BY session_id, user_id
ON CONFLICT (id) DO NOTHING;

-- Now add the foreign key constraint
ALTER TABLE chat_history
ADD CONSTRAINT fk_chat_history_session
FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
