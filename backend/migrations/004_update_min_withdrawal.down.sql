-- Rollback min withdrawal amount to 0.30 USDT
UPDATE settings SET value = '0.30', updated_at = NOW() WHERE key = 'min_withdrawal_usdt';
