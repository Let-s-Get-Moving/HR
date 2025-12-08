#!/bin/bash

# HR System Comprehensive Test Runner
# Runs all major test suites in sequence

echo "🚀 HR System Test Suite Runner"
echo "=============================="
echo ""
echo "Starting comprehensive test execution..."
echo ""

# Track results
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Function to run a test suite
run_test() {
  local name=$1
  local file=$2
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running: $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  TOTAL_SUITES=$((TOTAL_SUITES + 1))
  
  if node "$file"; then
    PASSED_SUITES=$((PASSED_SUITES + 1))
    echo ""
    echo "✅ $name - PASSED"
  else
    FAILED_SUITES=$((FAILED_SUITES + 1))
    echo ""
    echo "❌ $name - FAILED"
  fi
}

# Run test suites
run_test "Core Functionality Tests" "tests/test-all-functionality.js"
run_test "New Features Comprehensive Tests" "tests/test-new-features-comprehensive.js"
run_test "Remaining Modules Tests" "tests/test-remaining-modules.js"
run_test "Frontend Comprehensive Tests" "tests/test-frontend-comprehensive.js"
run_test "Integration Workflows" "tests/test-integration-workflows.js"
run_test "API Endpoint Coverage" "tests/test-api-endpoint-coverage.js"
run_test "Security Features" "tests/test-all-security-features.js"
run_test "MFA Complete Flow" "tests/test-mfa-complete-flow.js"

# Print final summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FINAL TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Test Suites: $TOTAL_SUITES"
echo "✅ Passed: $PASSED_SUITES"
echo "❌ Failed: $FAILED_SUITES"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
  echo "🎉 ALL TEST SUITES PASSED!"
  echo ""
  exit 0
else
  echo "⚠️  $FAILED_SUITES TEST SUITE(S) FAILED"
  echo "Check the output above for details"
  echo ""
  exit 1
fi

