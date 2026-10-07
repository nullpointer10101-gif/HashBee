-- Create user_plans table for 24-hour daily yield mining plans
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    cost_gram NUMERIC(18, 4) NOT NULL,
    return_gram NUMERIC(18, 4) NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 86400,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'claimed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    matures_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON user_plans(status);
CREATE INDEX IF NOT EXISTS idx_user_plans_matures_at ON user_plans(matures_at);
