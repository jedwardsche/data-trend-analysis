#!/bin/bash
# Deploy to Firebase (hosting + functions)

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJ_DIR"

echo "Deploying CHE KPI Analytics to Firebase..."
echo ""

# Build frontend
echo "=== Building frontend ==="
npm run build
if [ $? -ne 0 ]; then
  echo "Frontend build failed!"
  exit 1
fi
echo ""

# Deploy everything (functions build runs via predeploy in firebase.json)
echo "=== Deploying to Firebase (hosting + functions) ==="
firebase deploy --project che-kpi-analytics
if [ $? -ne 0 ]; then
  echo "Deploy failed!"
  exit 1
fi

echo ""
echo "Deploy complete!"
