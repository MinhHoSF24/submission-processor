#!/usr/bin/env bash
#
# Build TypeScript → dist/, install prod deps, package into lambda.zip
# Usage (CI or local): bash scripts/package-lambda.sh
#
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/.lambda-build"
OUTPUT="$PROJECT_ROOT/lambda.zip"

echo "=== 1/4  Clean ==="
rm -rf "$BUILD_DIR" "$OUTPUT"
mkdir -p "$BUILD_DIR"

echo "=== 2/4  Compile TypeScript ==="
cd "$PROJECT_ROOT"
npx tsc --outDir "$BUILD_DIR/dist"

echo "=== 3/4  Install production dependencies ==="
cp package.json package-lock.json "$BUILD_DIR/"
cd "$BUILD_DIR"
npm ci --omit=dev --ignore-scripts

echo "=== 4/4  Zip ==="
cd "$BUILD_DIR"
zip -rq "$OUTPUT" dist/ node_modules/ package.json

echo ""
echo "lambda.zip created: $(du -h "$OUTPUT" | cut -f1)"
echo "Handler: dist/handler.handler"

rm -rf "$BUILD_DIR"
