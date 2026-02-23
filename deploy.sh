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

# Build functions (done here instead of via predeploy to avoid npm stdin issues)
echo "=== Building functions ==="
npm --prefix "$PROJ_DIR/functions" run build
if [ $? -ne 0 ]; then
  echo "Functions build failed!"
  exit 1
fi
echo ""

# Deploy everything (predeploy removed from firebase.json — build is handled above)
echo "=== Deploying to Firebase (hosting + functions) ==="
firebase deploy --project che-kpi-analytics
if [ $? -ne 0 ]; then
  echo "Deploy failed!"
  exit 1
fi

echo ""
echo "Deploy complete!"
