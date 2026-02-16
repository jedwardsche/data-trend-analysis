#!/bin/bash
# Stop all dev servers started by run.sh

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping CHE KPI Analytics dev servers..."

# Kill processes by saved PIDs
for pidfile in "$PROJ_DIR"/.pids_*; do
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      echo "  Stopped PID $pid ($(basename "$pidfile" | sed 's/.pids_//'))"
    fi
    rm -f "$pidfile"
  fi
done

# Also kill any remaining child processes by name
pkill -f "vite.*kpi2-dashboard" 2>/dev/null
pkill -f "tsc.*functions.*watch" 2>/dev/null
pkill -f "firebase.*emulators:start" 2>/dev/null
pkill -f "java.*cloud-firestore-emulator" 2>/dev/null

echo "All servers stopped."
