package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load("backend/.env")
	_ = godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres.fniclcuywsrohisxgvcm:YoLOuZ5vrGUq3nrk@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		return
	}
	defer pool.Close()

	fmt.Println("=== CONNECTED TO DB: SILENTLY REVERTING ALL PENDING WITHDRAWALS ===")

	rows, err := pool.Query(ctx, `
		SELECT w.id, w.user_id, COALESCE(w.honey_amount, w.amount) as amount, w.network, w.address, u.username, u.telegram_id, u.honey_balance
		FROM withdrawals w
		JOIN users u ON w.user_id = u.id
		WHERE w.status = 'pending'
	`)
	if err != nil {
		fmt.Printf("Query error: %v\n", err)
		return
	}
	defer rows.Close()

	type PendingW struct {
		ID           uuid.UUID
		UserID       uuid.UUID
		Amount       float64
		Network      string
		Address      string
		Username     *string
		TelegramID   int64
		HoneyBalance float64
	}

	var list []PendingW
	for rows.Next() {
		var p PendingW
		if err := rows.Scan(&p.ID, &p.UserID, &p.Amount, &p.Network, &p.Address, &p.Username, &p.TelegramID, &p.HoneyBalance); err == nil {
			list = append(list, p)
		}
	}
	rows.Close()

	fmt.Printf("Found %d pending withdrawals to revert silently.\n", len(list))

	revertedCount := 0
	for _, p := range list {
		username := "unknown"
		if p.Username != nil {
			username = *p.Username
		}
		fmt.Printf("Reverting withdrawal %s for user @%s (TG: %d) - Amount: %.4f HONEY...\n", p.ID, username, p.TelegramID, p.Amount)

		tx, err := pool.Begin(ctx)
		if err != nil {
			fmt.Printf("  Tx begin failed: %v\n", err)
			continue
		}

		// Update withdrawal status to rejected / refunded
		_, err = tx.Exec(ctx, `
			UPDATE withdrawals 
			SET status = 'rejected', 
			    reason = 'Account condition verification required (Balance refunded)', 
			    updated_at = NOW() 
			WHERE id = $1
		`, p.ID)
		if err != nil {
			tx.Rollback(ctx)
			fmt.Printf("  Update withdrawal error: %v\n", err)
			continue
		}

		// Refund user honey balance
		_, err = tx.Exec(ctx, `
			UPDATE users 
			SET honey_balance = honey_balance + $1, 
			    updated_at = NOW() 
			WHERE id = $2
		`, p.Amount, p.UserID)
		if err != nil {
			tx.Rollback(ctx)
			fmt.Printf("  Update user balance error: %v\n", err)
			continue
		}

		// Insert transaction record for refund
		idempKey := fmt.Sprintf("silent_refund_%s", p.ID)
		_, _ = tx.Exec(ctx, `
			INSERT INTO transactions (id, user_id, type, amount, currency, ref_id, ref_type, idempotency_key, description, created_at)
			VALUES ($1, $2, 'adjustment', $3, 'HONEY', $4, 'withdrawal', $5, 'Balance refunded', NOW())
			ON CONFLICT (idempotency_key) DO NOTHING
		`, uuid.New(), p.UserID, p.Amount, p.ID, idempKey)

		if err := tx.Commit(ctx); err != nil {
			fmt.Printf("  Commit error: %v\n", err)
			continue
		}

		revertedCount++
		fmt.Printf("  ✓ Successfully reverted & refunded %.4f to user @%s\n", p.Amount, username)
	}

	fmt.Printf("\n=== COMPLETE: %d / %d pending withdrawals reverted and refunded silently ===\n", revertedCount, len(list))
}
