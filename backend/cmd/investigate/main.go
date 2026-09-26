package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		fmt.Printf("Failed to connect: %v\n", err)
		return
	}
	defer pool.Close()

	fmt.Println("=== CONNECTED TO DB ===")

	// 1. Find user hi / Hihe1091
	rows, err := pool.Query(ctx, `
		SELECT id, telegram_id, username, first_name, last_name, bp, bonus_bp, streak_count, 
		       free_spins, honey_balance, total_mined, status, is_bot, role, created_at, last_active_at, last_claimed_at
		FROM users
		WHERE username ILIKE '%Hihe1091%' OR first_name ILIKE '%hi%'
	`)
	if err != nil {
		fmt.Printf("Error querying user: %v\n", err)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			continue
		}
		fieldDescs := rows.FieldDescriptions()
		uMap := make(map[string]interface{})
		for i, fd := range fieldDescs {
			uMap[string(fd.Name)] = values[i]
		}
		users = append(users, uMap)
	}

	userJSON, _ := json.MarshalIndent(users, "", "  ")
	fmt.Println("USER RECORD:")
	fmt.Println(string(userJSON))

	if len(users) == 0 {
		return
	}

	userId := users[0]["id"].(string)

	// 2. Withdrawals
	wRows, err := pool.Query(ctx, `SELECT * FROM withdrawals WHERE user_id = $1`, userId)
	if err == nil {
		defer wRows.Close()
		var withs []map[string]interface{}
		for wRows.Next() {
			vals, _ := wRows.Values()
			fds := wRows.FieldDescriptions()
			m := make(map[string]interface{})
			for i, fd := range fds {
				m[string(fd.Name)] = vals[i]
			}
			withs = append(withs, m)
		}
		wJSON, _ := json.MarshalIndent(withs, "", "  ")
		fmt.Println("\nWITHDRAWALS:")
		fmt.Println(string(wJSON))
	}

	// 3. Referrals invited by this user
	rRows, err := pool.Query(ctx, `
		SELECT r.*, u.username, u.first_name, u.created_at as joined_at, u.bp, u.honey_balance
		FROM referrals r
		LEFT JOIN users u ON r.referred_id = u.id
		WHERE r.referrer_id = $1
	`, userId)
	if err == nil {
		defer rRows.Close()
		var refs []map[string]interface{}
		for rRows.Next() {
			vals, _ := rRows.Values()
			fds := rRows.FieldDescriptions()
			m := make(map[string]interface{})
			for i, fd := range fds {
				m[string(fd.Name)] = vals[i]
			}
			refs = append(refs, m)
		}
		rJSON, _ := json.MarshalIndent(refs, "", "  ")
		fmt.Printf("\nREFERRALS INVITED (%d total):\n", len(refs))
		fmt.Println(string(rJSON))
	}

	// 4. Who invited this user?
	upRows, err := pool.Query(ctx, `
		SELECT r.*, u.username, u.first_name, u.telegram_id
		FROM referrals r
		LEFT JOIN users u ON r.referrer_id = u.id
		WHERE r.referred_id = $1
	`, userId)
	if err == nil {
		defer upRows.Close()
		var upline []map[string]interface{}
		for upRows.Next() {
			vals, _ := upRows.Values()
			fds := upRows.FieldDescriptions()
			m := make(map[string]interface{})
			for i, fd := range fds {
				m[string(fd.Name)] = vals[i]
			}
			upline = append(upline, m)
		}
		upJSON, _ := json.MarshalIndent(upline, "", "  ")
		fmt.Println("\nINVITED BY (UPLINE):")
		fmt.Println(string(upJSON))
	}

	// 5. Missions completed
	mRows, err := pool.Query(ctx, `
		SELECT um.*, m.title, m.reward_amount, m.reward_type
		FROM user_missions um
		LEFT JOIN missions m ON um.mission_id = m.id
		WHERE um.user_id = $1
	`, userId)
	if err == nil {
		defer mRows.Close()
		var missions []map[string]interface{}
		for mRows.Next() {
			vals, _ := mRows.Values()
			fds := mRows.FieldDescriptions()
			m := make(map[string]interface{})
			for i, fd := range fds {
				m[string(fd.Name)] = vals[i]
			}
			missions = append(missions, m)
		}
		mJSON, _ := json.MarshalIndent(missions, "", "  ")
		fmt.Printf("\nMISSIONS COMPLETED (%d total):\n", len(missions))
		fmt.Println(string(mJSON))
	}

	// 6. Transactions
	tRows, err := pool.Query(ctx, `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at ASC`, userId)
	if err == nil {
		defer tRows.Close()
		var txs []map[string]interface{}
		for tRows.Next() {
			vals, _ := tRows.Values()
			fds := tRows.FieldDescriptions()
			m := make(map[string]interface{})
			for i, fd := range fds {
				m[string(fd.Name)] = vals[i]
			}
			txs = append(txs, m)
		}
		tJSON, _ := json.MarshalIndent(txs, "", "  ")
		fmt.Printf("\nTRANSACTIONS AUDIT TRAIL (%d total):\n", len(txs))
		fmt.Println(string(tJSON))
	}
}
