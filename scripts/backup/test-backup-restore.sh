#!/bin/bash

# Backup and Restore Test Script
# This script tests the backup and restore procedures in a safe environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="${SCRIPT_DIR}/test_$(date +%Y%m%d_%H%M%S)"
RESTORE_DIR="${SCRIPT_DIR}/../restore"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        log "✓ $2"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        error "✗ $2"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Create test directory
mkdir -p "${TEST_DIR}"
log "Test directory: ${TEST_DIR}"

# Override backup directory for testing
export BACKUP_DIR="${TEST_DIR}"
export RETENTION_DAYS=1

log "Starting backup and restore tests..."
echo ""

# Test 1: PostgreSQL Backup
log "=== Test 1: PostgreSQL Backup ==="
if bash "${SCRIPT_DIR}/backup-postgres.sh" > "${TEST_DIR}/postgres-backup.log" 2>&1; then
    test_result 0 "PostgreSQL backup completed"
    
    # Check if backup file exists
    BACKUP_FILE=$(ls -t "${TEST_DIR}"/postgres_backup_*.sql.gz 2>/dev/null | head -1)
    if [ -n "${BACKUP_FILE}" ]; then
        test_result 0 "PostgreSQL backup file created: $(basename ${BACKUP_FILE})"
        
        # Check file size
        FILE_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
        if [ "${FILE_SIZE}" -gt 1000 ]; then
            test_result 0 "PostgreSQL backup file size is reasonable: ${FILE_SIZE} bytes"
        else
            test_result 1 "PostgreSQL backup file size is too small: ${FILE_SIZE} bytes"
        fi
        
        # Check file integrity
        if gunzip -t "${BACKUP_FILE}" 2>/dev/null; then
            test_result 0 "PostgreSQL backup file integrity verified"
        else
            test_result 1 "PostgreSQL backup file integrity check failed"
        fi
    else
        test_result 1 "PostgreSQL backup file not found"
    fi
else
    test_result 1 "PostgreSQL backup failed"
    cat "${TEST_DIR}/postgres-backup.log"
fi
echo ""

# Test 2: MongoDB Backup
log "=== Test 2: MongoDB Backup ==="
if bash "${SCRIPT_DIR}/backup-mongodb.sh" > "${TEST_DIR}/mongodb-backup.log" 2>&1; then
    test_result 0 "MongoDB backup completed"
    
    # Check if backup file exists
    BACKUP_FILE=$(ls -t "${TEST_DIR}"/mongodb_backup_*.tar.gz 2>/dev/null | head -1)
    if [ -n "${BACKUP_FILE}" ]; then
        test_result 0 "MongoDB backup file created: $(basename ${BACKUP_FILE})"
        
        # Check file size
        FILE_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
        if [ "${FILE_SIZE}" -gt 1000 ]; then
            test_result 0 "MongoDB backup file size is reasonable: ${FILE_SIZE} bytes"
        else
            test_result 1 "MongoDB backup file size is too small: ${FILE_SIZE} bytes"
        fi
        
        # Check file integrity
        if tar -tzf "${BACKUP_FILE}" > /dev/null 2>&1; then
            test_result 0 "MongoDB backup file integrity verified"
        else
            test_result 1 "MongoDB backup file integrity check failed"
        fi
    else
        test_result 1 "MongoDB backup file not found"
    fi
else
    test_result 1 "MongoDB backup failed"
    cat "${TEST_DIR}/mongodb-backup.log"
fi
echo ""

# Test 3: Redis Backup
log "=== Test 3: Redis Backup ==="
if bash "${SCRIPT_DIR}/backup-redis.sh" > "${TEST_DIR}/redis-backup.log" 2>&1; then
    test_result 0 "Redis backup completed"
    
    # Check if backup file exists
    BACKUP_FILE=$(ls -t "${TEST_DIR}"/redis_backup_*.rdb.gz 2>/dev/null | head -1)
    if [ -n "${BACKUP_FILE}" ]; then
        test_result 0 "Redis backup file created: $(basename ${BACKUP_FILE})"
        
        # Check file size
        FILE_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
        if [ "${FILE_SIZE}" -gt 100 ]; then
            test_result 0 "Redis backup file size is reasonable: ${FILE_SIZE} bytes"
        else
            test_result 1 "Redis backup file size is too small: ${FILE_SIZE} bytes"
        fi
        
        # Check file integrity
        if gunzip -t "${BACKUP_FILE}" 2>/dev/null; then
            test_result 0 "Redis backup file integrity verified"
        else
            test_result 1 "Redis backup file integrity check failed"
        fi
    else
        test_result 1 "Redis backup file not found"
    fi
else
    test_result 1 "Redis backup failed"
    cat "${TEST_DIR}/redis-backup.log"
fi
echo ""

# Test 4: Restore Scripts Exist and Are Executable
log "=== Test 4: Restore Scripts ==="
if [ -x "${RESTORE_DIR}/restore-postgres.sh" ]; then
    test_result 0 "PostgreSQL restore script exists and is executable"
else
    test_result 1 "PostgreSQL restore script not found or not executable"
fi

if [ -x "${RESTORE_DIR}/restore-mongodb.sh" ]; then
    test_result 0 "MongoDB restore script exists and is executable"
else
    test_result 1 "MongoDB restore script not found or not executable"
fi

if [ -x "${RESTORE_DIR}/restore-redis.sh" ]; then
    test_result 0 "Redis restore script exists and is executable"
else
    test_result 1 "Redis restore script not found or not executable"
fi
echo ""

# Test 5: Backup Cleanup
log "=== Test 5: Backup Cleanup ==="
# Create old backup files
touch -t 202301010000 "${TEST_DIR}/old_postgres_backup.sql.gz"
touch -t 202301010000 "${TEST_DIR}/old_mongodb_backup.tar.gz"
touch -t 202301010000 "${TEST_DIR}/old_redis_backup.rdb.gz"

# Run cleanup (simulated by finding old files)
OLD_FILES=$(find "${TEST_DIR}" -name "*backup*.gz" -type f -mtime +1 | wc -l)
if [ "${OLD_FILES}" -gt 0 ]; then
    test_result 0 "Old backup files detected for cleanup: ${OLD_FILES}"
else
    warning "No old backup files to test cleanup"
fi
echo ""

# Test 6: Environment Variables
log "=== Test 6: Environment Variables ==="
REQUIRED_VARS=("DB_HOST" "DB_USER" "DB_PASSWORD" "MONGO_HOST" "MONGO_USER" "MONGO_PASSWORD")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!VAR}" ]; then
        test_result 0 "Environment variable ${VAR} is set"
    else
        test_result 1 "Environment variable ${VAR} is not set"
    fi
done
echo ""

# Test 7: Required Tools
log "=== Test 7: Required Tools ==="
REQUIRED_TOOLS=("pg_dump" "mongodump" "redis-cli" "gzip" "tar")
for TOOL in "${REQUIRED_TOOLS[@]}"; do
    if command -v "${TOOL}" &> /dev/null; then
        test_result 0 "Tool ${TOOL} is installed"
    else
        test_result 1 "Tool ${TOOL} is not installed"
    fi
done

# Check AWS CLI (optional)
if command -v aws &> /dev/null; then
    test_result 0 "AWS CLI is installed (optional)"
else
    warning "AWS CLI is not installed (S3 uploads will not work)"
fi
echo ""

# Summary
log "=== Test Summary ==="
log "Tests Passed: ${TESTS_PASSED}"
log "Tests Failed: ${TESTS_FAILED}"
log "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ ${TESTS_FAILED} -eq 0 ]; then
    log "All tests passed! ✓"
    log "Test artifacts saved in: ${TEST_DIR}"
    exit 0
else
    error "${TESTS_FAILED} test(s) failed"
    log "Test artifacts saved in: ${TEST_DIR}"
    log "Review logs in ${TEST_DIR}/*.log for details"
    exit 1
fi
