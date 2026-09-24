package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates a new PostgreSQL connection pool
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	config.MaxConns = 15
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	// Ensure compatibility with Supabase connection poolers / PgBouncer
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Retry ping up to 3 times in case of cold start
	var lastErr error
	for i := 0; i < 3; i++ {
		pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		if err := pool.Ping(pingCtx); err == nil {
			cancel()
			return pool, nil
		} else {
			lastErr = err
		}
		cancel()
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to ping database: %w", lastErr)
}
