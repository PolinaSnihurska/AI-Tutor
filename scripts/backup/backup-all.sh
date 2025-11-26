#!/bin/bash

# Master Backup Script
# This script orchestrates all backup operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

log "Starting full backup process..."

# Track failures
FAILURES=0

# Backup PostgreSQL
log "=== PostgreSQL Backup ==="
if bash "${SCRIPT_DIR}/backup-postgres.sh"; then
    log "PostgreSQL backup completed successfully"
else
    error "PostgreSQL backup failed"
    FAILURES=$((FAILURES + 1))
fi

# Backup MongoDB
log "=== MongoDB Backup ==="
if bash "${SCRIPT_DIR}/backup-mongodb.sh"; then
    log "MongoDB backup completed successfully"
else
    error "MongoDB backup failed"
    FAILURES=$((FAILURES + 1))
fi

# Backup Redis
log "=== Redis Backup ==="
if bash "${SCRIPT_DIR}/backup-redis.sh"; then
    log "Redis backup completed successfully"
else
    error "Redis backup failed"
    FAILURES=$((FAILURES + 1))
fi

# Summary
log "=== Backup Summary ==="
if [ ${FAILURES} -eq 0 ]; then
    log "All backups completed successfully"
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ Full backup completed successfully\n• PostgreSQL: ✓\n• MongoDB: ✓\n• Redis: ✓\"}"
    fi
    
    exit 0
else
    error "${FAILURES} backup(s) failed"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"⚠️ Backup completed with ${FAILURES} failure(s)\nPlease check logs for details.\"}"
    fi
    
    exit 1
fi
