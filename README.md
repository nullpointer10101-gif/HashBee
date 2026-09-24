# 🐝 HashBee

A gamified rewards Telegram Mini App where users collect **Honey** using their **Bee Power** rating, grow through referrals, complete sponsored missions, and cash out real rewards.

---

## Architecture

| Component | Tech | Hosting |
|---|---|---|
| **Backend + Bot** | Go 1.22 + Gin | Render (Docker) |
| **Database** | PostgreSQL | Supabase |
| **Cache / Sessions** | Redis | Upstash |
| **Mini App (WebApp)** | React 18 + Vite + TypeScript | Vercel |
| **Admin Panel** | React 18 + Vite + TypeScript | Vercel (separate project) |

```
hashbee/
├── backend/          # Go API server + Telegram bot
│   ├── cmd/          # Entry points (server, bot, worker)
│   ├── internal/     # Business logic, handlers, models
│   ├── migrations/   # SQL migration files
│   ├── Dockerfile
│   └── .env.example
├── miniapp/          # Telegram Mini App (React + Vite)
├── admin/            # Admin panel (React + Vite)
└── docker-compose.yml
```

---

## Open Questions & Decisions

| Question | Decision | Configurable? |
|---|---|---|
| Purchase packs | **OFF** by default in v1 | Yes — `FEATURE_PAID_PACKS=false` in settings table |
| Campaigns | **ON** | Yes — admin toggle |
| Admin approval for campaigns | **Optional** — off by default | Yes — admin toggle |
| Anti-cheat leave penalty | **OFF** by default | Yes — admin toggle |
| Verification method (unverifiable missions) | Timer (15s) + honor system | Yes — per-campaign setting |
| Referral qualifying actions | First Collect + First Mission | Yes — admin settings |
| Withdrawal manual review | ON for first-time withdrawals | Yes — admin toggle |
| Payment providers | Configurable modules (crypto wallet address, TON, USDT TRC20/ERC20) | Yes |
| Min withdrawal | 0.05 USDT equivalent | Yes — settings table |
| Referral bonuses | L1: +5 BP, L2: +2 BP, L3: +1 BP | Yes — settings table |
| Daily check-in | 7-day streak with escalating bonuses | Yes |
| Hive capacity cap | 8 hours of earning | Yes — settings table |

---

## Setup

### Prerequisites
- Go 1.22+
- Node.js 20+
- Docker + Docker Compose
- Supabase project (PostgreSQL)
- Upstash Redis instance
- Telegram Bot Token (from @BotFather)

### 1. Clone and configure

```bash
git clone <repo>
cd hashbee/backend
cp .env.example .env
# Fill in your values in .env
```

### 2. Run database migrations

```bash
cd backend
go run cmd/migrate/main.go up
```

### 3. Start backend (development)

```bash
cd backend
go run cmd/server/main.go
```

Or with Docker:
```bash
docker-compose up --build
```

### 4. Start Mini App

```bash
cd miniapp
npm install
npm run dev
```

### 5. Start Admin Panel

```bash
cd admin
npm install
npm run dev
```

---

## Deployment

### Backend -> Render

1. Create a new Web Service on Render, connect your repo, set root to `backend/`
2. Build command: `go build -o server ./cmd/server`
3. Start command: `./server`
4. Add environment variables from `.env.example`

### Mini App -> Vercel

```bash
cd miniapp
vercel --prod
```

Set `VITE_API_URL` to your Render backend URL.

### Admin Panel -> Vercel

```bash
cd admin
vercel --prod
```

Set `VITE_API_URL` and `VITE_ADMIN_SECRET` environment variables.

---

## Economy

- Payouts are funded by **Boost Campaign** revenue (advertisers pay per completion).
- Admin dashboard shows **Liability vs Revenue** (total Honey owed vs funds available).
- No guaranteed returns. BP packs (if enabled) clearly show "estimates, not guaranteed."
- The app is a **rewards/tasks game**. "Bee Power" is a game stat, not a hash rate.

---

## Default Economy Parameters

| Parameter | Default |
|---|---|
| Hive capacity (hours) | 8 |
| Base BP for new users | 1 |
| Welcome bonus (invitee) | +2 BP |
| Referral L1 bonus | +5 BP |
| Referral L2 bonus | +2 BP |
| Referral L3 bonus | +1 BP |
| Daily check-in day 1-7 bonus | 1, 2, 3, 5, 7, 10, 15 BP |
| Min withdrawal (USDT) | 0.05 |
| Campaign price per completion | 0.001 USDT |
| Honey/BP/hour | 0.001 Honey per BP per hour |
| Reinvest rate | 100 Honey = 1 BP |
