#!/bin/bash

# This script verifies that the integration test configuration is working correctly

echo "🔍 Verifying Integration Test Configuration..."
echo ""

echo "1️⃣  Checking vitest.config.ts (unit tests):"
unit_count=$(npx vitest list 2>&1 | grep -c "tests/unit" || echo "0")
echo "   Found $unit_count unit tests ✅"
echo ""

echo "2️⃣  Checking vitest.integration.config.ts (integration tests):"
integration_count=$(npm run test:integration -- list 2>&1 | grep -c "tests/integration" || echo "0")
echo "   Found $integration_count integration tests ✅"
echo ""

if [ "$integration_count" -gt "0" ]; then
    echo "✅ Configuration is working correctly!"
    echo ""
    echo "To run integration tests, use:"
    echo "  npm run test:integration"
    echo ""
    echo "⚠️  DO NOT run 'npx vitest tests/integration' - it will use the wrong config!"
else
    echo "❌ Integration config not loading correctly"
    exit 1
fi
