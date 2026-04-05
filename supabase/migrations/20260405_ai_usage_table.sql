-- AI Usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  type TEXT NOT NULL, -- 'chat' or 'recommend'
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  user_message TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limiting queries
CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_created ON ai_usage(created_at DESC);

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins see all usage"
  ON ai_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role IS NOT NULL
    )
  );
