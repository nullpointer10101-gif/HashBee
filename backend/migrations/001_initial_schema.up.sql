-- 001_initial_schema.up.sql
-- HashBee initial database schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- SETTINGS (key/value store for all configurable rules)
-- ============================================================
CREATE TABLE settings (
    key VARCHAR(128) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    referrer_id UUID REFERENCES users(id),
    bp DECIMAL(20, 8) NOT NULL DEFAULT 1.0,
    honey_balance DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
    last_collect_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    streak_count INT NOT NULL DEFAULT 0,
    last_checkin_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, banned, flagged
    has_collected BOOLEAN NOT NULL DEFAULT FALSE,
    has_completed_mission BOOLEAN NOT NULL DEFAULT FALSE,
    last_hive_full_notified_at TIMESTAMPTZ,
    opted_out_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referrer_id ON users(referrer_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referred_id UUID NOT NULL UNIQUE REFERENCES users(id),
    level INT NOT NULL CHECK (level IN (1, 2, 3)),
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, active
    reward_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================================
-- CAMPAIGNS (Boost Campaigns from advertisers)
-- ============================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(32) NOT NULL, -- link, channel, group, bot
    target TEXT NOT NULL,      -- URL or @username
    title VARCHAR(255) NOT NULL DEFAULT '',
    total_completions INT NOT NULL DEFAULT 50,
    done_completions INT NOT NULL DEFAULT 0,
    reward_bp DECIMAL(20, 8) NOT NULL DEFAULT 0.1,
    cost DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, active, paused, completed, cancelled, rejected
    verification_type VARCHAR(32) NOT NULL DEFAULT 'timer', -- api, timer
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_owner ON campaigns(owner_user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================================
-- MISSIONS
-- ============================================================
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(32) NOT NULL, -- channel, group, bot, link, milestone, checkin
    target TEXT,               -- URL or @username (NULL for milestone)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward_bp DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
    campaign_id UUID REFERENCES campaigns(id),
    milestone_count INT,       -- for milestone missions: 3,10,25,100 etc
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, paused, deleted
    is_official BOOLEAN NOT NULL DEFAULT FALSE,   -- house missions
    icon_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_missions_type ON missions(type);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_campaign_id ON missions(campaign_id);

-- ============================================================
-- MISSION COMPLETIONS
-- ============================================================
CREATE TABLE mission_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    mission_id UUID NOT NULL REFERENCES missions(id),
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, verified, failed, reward_paid
    click_token VARCHAR(128),
    verified_at TIMESTAMPTZ,
    reward_paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, mission_id)
);

CREATE INDEX idx_mission_completions_user ON mission_completions(user_id);
CREATE INDEX idx_mission_completions_mission ON mission_completions(mission_id);
CREATE INDEX idx_mission_completions_token ON mission_completions(click_token);

-- ============================================================
-- TRANSACTIONS (immutable ledger)
-- ============================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(64) NOT NULL, -- collect, referral_reward, mission_reward, checkin_reward, withdrawal, campaign_payment, reinvest, bp_purchase, adjustment
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'HONEY', -- HONEY, BP, USDT, TON
    ref_id UUID,               -- reference to related entity
    ref_type VARCHAR(64),      -- referral, mission, withdrawal, campaign
    idempotency_key VARCHAR(255) UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);

-- ============================================================
-- WITHDRAWALS
-- ============================================================
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    address TEXT NOT NULL,
    network VARCHAR(32) NOT NULL, -- USDT_TRC20, USDT_ERC20, TON
    amount DECIMAL(20, 8) NOT NULL,
    honey_amount DECIMAL(20, 8) NOT NULL,
    fee DECIMAL(20, 8) NOT NULL DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending, processing, paid, rejected
    tx_hash TEXT,
    reason TEXT,
    processed_by UUID,   -- admin user id
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(64),
    target_id UUID,
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- ============================================================
-- ADMIN USERS
-- ============================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'support', -- super_admin, support, finance
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FRAUD FLAGS
-- ============================================================
CREATE TABLE fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(128) NOT NULL,
    metadata JSONB,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_resolved ON fraud_flags(resolved);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_name VARCHAR(128) NOT NULL,
    properties JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);

-- ============================================================
-- DEFAULT SETTINGS SEED
-- ============================================================
INSERT INTO settings (key, value, description) VALUES
    ('hive_cap_hours', '8', 'Hours before Hive reaches max capacity'),
    ('base_bp', '1', 'Starting Bee Power for new users'),
    ('welcome_bonus_bp', '2', 'BP bonus for users who join via referral'),
    ('referral_l1_bp', '5', 'BP reward for each Level 1 active referral'),
    ('referral_l2_bp', '1', 'BP reward for each Level 2 active referral'),
    ('referral_l3_bp', '0.5', 'BP reward for each Level 3 active referral'),
    ('min_withdrawal_usdt', '0.05', 'Minimum withdrawal amount in USDT'),
    ('max_withdrawal_per_day_usdt', '100', 'Max withdrawal per day per user'),
    ('withdrawal_cooldown_hours', '24', 'Hours between withdrawal requests'),
    ('withdrawal_min_referrals', '3', 'Min active referrals required to withdraw'),
    ('withdrawal_min_missions', '5', 'Min completed missions required to withdraw'),
    ('campaign_price_per_completion', '0.001', 'USDT cost per campaign completion'),
    ('honey_per_bp_per_hour', '0.001', 'Honey earned per BP per hour'),
    ('reinvest_rate', '100', 'Honey needed to convert to 1 BP'),
    ('honey_to_usdt_rate', '1000', 'Honey per 1 USDT for withdrawal'),
    ('checkin_streak_rewards', '1,2,3,5,7,10,15', 'Comma-separated BP rewards for day 1-7 streak'),
    ('feature_paid_packs', 'false', 'Enable BP purchase packs'),
    ('feature_campaigns', 'true', 'Enable Boost Campaigns'),
    ('feature_admin_campaign_approval', 'false', 'Require admin approval for campaigns'),
    ('feature_anti_cheat_leave_penalty', 'false', 'Remove reward if user leaves channel within 7 days'),
    ('feature_manual_withdrawal_review', 'true', 'Require admin approval for withdrawals'),
    ('mission_timer_seconds', '15', 'Timer in seconds for timer-based mission verification'),
    ('referral_qualifying_collect', 'true', 'Require first collect for referral activation'),
    ('referral_qualifying_mission', 'true', 'Require first mission for referral activation'),
    ('blocked_countries', '', 'Comma-separated ISO country codes to block'),
    ('hive_full_notify_cooldown_hours', '12', 'Hours between hive-full notifications'),
    ('milestone_counts', '3,10,25,100,250,500,1000', 'Milestone invite goals'),
    ('milestone_rewards', '10,25,50,100,250,500,1000', 'Milestone BP rewards');

-- ============================================================
-- DEFAULT MILESTONE MISSIONS SEED
-- ============================================================
INSERT INTO missions (type, title, description, reward_bp, milestone_count, sort_order, status, is_official) VALUES
    ('milestone', 'Recruit 3 Bees', 'Invite 3 active friends to your Swarm', 10, 3, 1, 'active', true),
    ('milestone', 'Recruit 10 Bees', 'Invite 10 active friends to your Swarm', 25, 10, 2, 'active', true),
    ('milestone', 'Recruit 25 Bees', 'Invite 25 active friends to your Swarm', 50, 25, 3, 'active', true),
    ('milestone', 'Recruit 100 Bees', 'Invite 100 active friends to your Swarm', 100, 100, 4, 'active', true),
    ('milestone', 'Recruit 250 Bees', 'Invite 250 active friends to your Swarm', 250, 250, 5, 'active', true),
    ('milestone', 'Recruit 500 Bees', 'Invite 500 active friends to your Swarm', 500, 500, 6, 'active', true),
    ('milestone', 'Recruit 1000 Bees', 'Invite 1000 active friends to your Swarm', 1000, 1000, 7, 'active', true);
