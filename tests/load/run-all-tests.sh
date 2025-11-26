#!/bin/bash

# Run all load tests and generate comprehensive report
# Usage: ./run-all-tests.sh [light|full]

set -e

MODE=${1:-light}
RESULTS_DIR="results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/report_${TIMESTAMP}.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AI Tutoring Platform - Load Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Mode: ${YELLOW}${MODE}${NC}"
echo -e "Timestamp: ${TIMESTAMP}"
echo ""

# Create results directory
mkdir -p ${RESULTS_DIR}

# Initialize report
cat > ${REPORT_FILE} << EOF
AI Tutoring Platform - Load Test Report
========================================
Date: $(date)
Mode: ${MODE}

EOF

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_script=$2
    local test_args=$3
    
    echo -e "${BLUE}Running: ${test_name}${NC}"
    echo "----------------------------------------" | tee -a ${REPORT_FILE}
    echo "Test: ${test_name}" | tee -a ${REPORT_FILE}
    echo "Started: $(date)" | tee -a ${REPORT_FILE}
    echo "" | tee -a ${REPORT_FILE}
    
    local result_file="${RESULTS_DIR}/${test_name}_${TIMESTAMP}.json"
    
    if k6 run ${test_args} --out json=${result_file} ${test_script} 2>&1 | tee -a ${REPORT_FILE}; then
        echo -e "${GREEN}✓ ${test_name} completed successfully${NC}" | tee -a ${REPORT_FILE}
    else
        echo -e "${RED}✗ ${test_name} failed${NC}" | tee -a ${REPORT_FILE}
    fi
    
    echo "" | tee -a ${REPORT_FILE}
    echo "Completed: $(date)" | tee -a ${REPORT_FILE}
    echo "" | tee -a ${REPORT_FILE}
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"
services=(
    "http://localhost:3001/health:Auth Service"
    "http://localhost:8000/health:AI Service"
    "http://localhost:3003/health:Test Service"
    "http://localhost:3004/health:Learning Plan Service"
    "http://localhost:3005/health:Analytics Service"
)

all_healthy=true
for service in "${services[@]}"; do
    IFS=':' read -r url name <<< "$service"
    if curl -s -f ${url} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${name} is running${NC}"
    else
        echo -e "${RED}✗ ${name} is not responding${NC}"
        all_healthy=false
    fi
done

if [ "$all_healthy" = false ]; then
    echo -e "${RED}Error: Not all services are running${NC}"
    echo "Please start all services before running load tests"
    exit 1
fi

echo ""

# Setup test users
echo -e "${YELLOW}Setting up test users...${NC}"
if node setup-test-users.js; then
    echo -e "${GREEN}✓ Test users ready${NC}"
else
    echo -e "${YELLOW}⚠ Test user setup had issues, continuing anyway...${NC}"
fi

echo ""
echo -e "${BLUE}Starting load tests...${NC}"
echo ""

# Run tests based on mode
if [ "$MODE" = "full" ]; then
    echo -e "${YELLOW}Running FULL load tests (this will take ~20 minutes)${NC}"
    echo ""
    
    run_test "full-load" "scenarios/full-load.js" "--vus 1000 --duration 5m"
    sleep 30  # Cool down between tests
    
    run_test "ai-service" "scenarios/ai-service.js" "--vus 500 --duration 3m"
    sleep 30
    
    run_test "database-stress" "scenarios/database-stress.js" "--vus 800 --duration 5m"
    sleep 30
    
    run_test "cache-effectiveness" "scenarios/cache-effectiveness.js" ""
    
else
    echo -e "${YELLOW}Running LIGHT load tests (this will take ~10 minutes)${NC}"
    echo ""
    
    run_test "full-load-light" "scenarios/full-load.js" "--vus 100 --duration 2m"
    sleep 15
    
    run_test "ai-service-light" "scenarios/ai-service.js" "--vus 100 --duration 1m"
    sleep 15
    
    run_test "database-stress-light" "scenarios/database-stress.js" "--vus 200 --duration 2m"
    sleep 15
    
    run_test "cache-effectiveness" "scenarios/cache-effectiveness.js" ""
fi

# Generate summary
echo "" | tee -a ${REPORT_FILE}
echo "========================================" | tee -a ${REPORT_FILE}
echo "Test Suite Summary" | tee -a ${REPORT_FILE}
echo "========================================" | tee -a ${REPORT_FILE}
echo "Completed: $(date)" | tee -a ${REPORT_FILE}
echo "Results directory: ${RESULTS_DIR}" | tee -a ${REPORT_FILE}
echo "Report file: ${REPORT_FILE}" | tee -a ${REPORT_FILE}
echo "" | tee -a ${REPORT_FILE}

# Count test results
total_tests=$(ls -1 ${RESULTS_DIR}/*_${TIMESTAMP}.json 2>/dev/null | wc -l)
echo "Total tests executed: ${total_tests}" | tee -a ${REPORT_FILE}
echo "" | tee -a ${REPORT_FILE}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Load test suite completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "View full report: ${BLUE}${REPORT_FILE}${NC}"
echo -e "View results: ${BLUE}${RESULTS_DIR}/${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the report file for detailed metrics"
echo "2. Check for any failed tests or threshold violations"
echo "3. Compare results with previous test runs"
echo "4. Monitor service logs for any errors"
echo ""
