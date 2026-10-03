ALTER TABLE users DROP COLUMN IF EXISTS one_time_withdrawal_granted;

UPDATE transactions 
SET type = 'crate_purchase' 
WHERE user_id = (SELECT id FROM users WHERE telegram_id = 8293165067)
  AND type = 'crate_purchase_archived';
