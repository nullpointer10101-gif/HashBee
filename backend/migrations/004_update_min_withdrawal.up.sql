-- Update min withdrawal amount to 0.10 USDT
UPDATE settings SET value = '0.10', updated_at = NOW() WHERE key = 'min_withdrawal_usdt';
