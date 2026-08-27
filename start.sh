#!/bin/bash
set -e

PROJECT_DIR="/home/kevin/Documents/BUBAPC-Family-Connect"

echo "========================================="
echo "  BUBAPC Family Connect - Setup & Start"
echo "========================================="
echo ""

# Navigate to project
cd "$PROJECT_DIR"

# 1. Start PostgreSQL via Docker/Podman
echo "[1/6] Starting PostgreSQL..."
if command -v docker &> /dev/null; then
    docker compose up -d db 2>/dev/null || podman-compose up -d db 2>/dev/null || echo "  -> Docker/Podman failed. Make sure Docker Desktop or Podman is running."
    sleep 3
elif command -v pg_isready &> /dev/null; then
    echo "  -> Using system PostgreSQL"
    pg_isready -h localhost -p 5432 >/dev/null 2>&1 || echo "  -> PostgreSQL not responding on port 5432"
else
    echo "  -> ERROR: No PostgreSQL found. Install Docker or PostgreSQL."
    exit 1
fi

# 2. Install server dependencies
echo "[2/6] Installing server dependencies..."
cd "$PROJECT_DIR/server"
npm install --silent 2>/dev/null

# 3. Create .env if missing
if [ ! -f .env ]; then
    echo "  -> Creating .env file..."
    cat > .env << 'EOF'
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bubapc_family_connect
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=bubapc-family-connect-dev-secret-key-2024
JWT_EXPIRES_IN=7d
VITE_API_URL=http://localhost:5000/api
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
EOF
fi

# 4. Run migrations
echo "[3/6] Running database migrations..."
npm run migrate 2>&1 | tail -1

# 5. Seed database
echo "[4/6] Seeding database..."
npm run seed 2>&1 | tail -1

# 6. Build & start server
echo "[5/6] Building backend..."
npm run build 2>/dev/null

# Kill any existing server on port 5000
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

echo "  -> Starting backend server..."
nohup node dist/index.js > /tmp/bubapc-server.log 2>&1 & disown
sleep 2

if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "  -> Backend running on http://localhost:5000"
else
    echo "  -> WARNING: Backend may not have started. Check /tmp/bubapc-server.log"
fi

# 7. Install client dependencies and start
echo "[6/6] Starting frontend..."
cd "$PROJECT_DIR/client"
npm install --silent 2>/dev/null

echo ""
echo "========================================="
echo "  BUBAPC Family Connect is running!"
echo "========================================="
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:5000"
echo ""
echo "  Login credentials:"
echo "    Admin:  admin@bubapc.org / admin123"
echo "    Member: john.doe@example.com / member123"
echo ""
echo "  Starting Vite dev server..."
echo ""

npx vite --port 3000
