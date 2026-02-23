#!/bin/bash
# Start frontend (Vite) and backend (Firebase Functions watch + emulators)

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting CHE KPI Analytics dev servers..."

# Start Functions TypeScript watcher in background
echo "Starting Functions TypeScript watcher..."
npm --prefix "$PROJ_DIR/functions" run build:watch &
echo $! > "$PROJ_DIR/.pids_functions_watch"

# Wait briefly for initial compile
sleep 2

# Start Firebase emulators in background
echo "Starting Firebase emulators..."
firebase emulators:start --project che-kpi-analytics &
echo $! > "$PROJ_DIR/.pids_emulators"

# Start Vite dev server in background
echo "Starting Vite dev server..."
npm --prefix "$PROJ_DIR" run dev &
echo $! > "$PROJ_DIR/.pids_vite"

echo ""
echo "All servers started:"
echo "  Frontend (Vite):       http://localhost:5173"
echo "  Emulator UI:           http://localhost:4000"
echo "  Functions emulator:    http://localhost:5001"
echo "  Firestore emulator:    http://localhost:8080"
echo "  Hosting emulator:      http://localhost:5002"
echo ""
echo "Run ./stop.sh to stop all servers."
echo ""

# Wait for any process to exit
wait
