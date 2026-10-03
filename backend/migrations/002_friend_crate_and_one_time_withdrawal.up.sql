-- Add one_time_withdrawal_granted column
ALTER TABLE users ADD COLUMN IF NOT EXISTS one_time_withdrawal_granted BOOLEAN DEFAULT FALSE;

-- Archive past crate purchases for user 8293165067 so old crates don't qualify after 1 withdrawal
UPDATE transactions 
SET type = 'crate_purchase_archived' 
WHERE user_id = (SELECT id FROM users WHERE telegram_id = 8293165067)
  AND type = 'crate_purchase';

-- Grant 1-time withdrawal allowance to user 8293165067
UPDATE users 
SET one_time_withdrawal_granted = TRUE 
WHERE telegram_id = 8293165067;
