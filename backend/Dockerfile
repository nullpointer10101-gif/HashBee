# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

COPY . .

# Remove any empty/invalid go.sum and generate fresh checksums
RUN rm -f go.sum && go mod tidy

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Production stage
FROM alpine:3.19

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/public/admin ./public/admin

# NOTE: public/app (miniapp frontend) is intentionally NOT copied here.
# The MiniApp is served from Vercel CDN to avoid consuming Render's 5 GB/month bandwidth.

EXPOSE 8080

CMD ["./server"]
