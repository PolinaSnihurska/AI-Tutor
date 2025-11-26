#!/bin/bash

# Redis Restore Script
# This script restores Redis data from backups

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
S3_BUCKET="${S3_BACKUP_BUCKET:-ai-tutor-backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Redis connection details
REDIS_HOST="${REDIS_HOST:-redis-service}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE       Restore from specific backup file"
    echo "  -l, --latest          Restore from latest backup"
    echo "  -s, --s3              Download backup from S3"
    echo "  -d, --date DATE       Restore from backup on specific date (YYYYMMDD)"
    echo "  --no-confirm          Skip confirmation prompt"
    echo "  -h, --help            Show this help message"
    exit 1
}

# Parse arguments
BACKUP_FILE=""
USE_LATEST=false
USE_S3=false
BACKUP_DATE=""
NO_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -l|--latest)
            USE_LATEST=true
            shift
            ;;
        -s|--s3)
            USE_S3=true
            shift
            ;;
        -d|--date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        --no-confirm)
            NO_CONFIRM=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            usage
            ;;
    esac
done

# Determine backup file to restore
if [ "${USE_S3}" = true ]; then
    if [ "${USE_LATEST}" = true ]; then
        log "Downloading latest backup from S3..."
        BACKUP_FILE="latest.rdb.gz"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/redis/latest.rdb.gz" "${BACKUP_DIR}/latest.rdb.gz"
    elif [ -n "${BACKUP_DATE}" ]; then
        log "Searching for backup from date: ${BACKUP_DATE}"
        BACKUP_FILE=$(aws s3 ls "s3://${S3_BUCKET}/${ENVIRONMENT}/redis/" | grep "${BACKUP_DATE}" | awk '{print $4}' | head -1)
        if [ -z "${BACKUP_FILE}" ]; then
            error "No backup found for date: ${BACKUP_DATE}"
            exit 1
        fi
        log "Found backup: ${BACKUP_FILE}"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/redis/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"
    elif [ -n "${BACKUP_FILE}" ]; then
        log "Downloading specified backup from S3: ${BACKUP_FILE}"
        aws s3 cp "s3://${S3_BUCKET}/${ENVIRONMENT}/redis/${BACKUP_FILE}" "${BACKUP_DIR}/${BACKUP_FILE}"
    else
        error "Please specify --latest, --date, or --file when using --s3"
        usage
    fi
elif [ "${USE_LATEST}" = true ]; then
    log "Finding latest local backup..."
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/redis_backup_*.rdb.gz 2>/dev/null | head -1 | xargs basename)
    if [ -z "${BACKUP_FILE}" ]; then
        error "No local backups found in ${BACKUP_DIR}"
        exit 1
    fi
    log "Found latest backup: ${BACKUP_FILE}"
elif [ -z "${BACKUP_FILE}" ]; then
    error "Please specify a backup file, use --latest, or provide a date"
    usage
fi

# Full path to backup file
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Check if backup file exists
if [ ! -f "${BACKUP_PATH}" ]; then
    error "Backup file not found: ${BACKUP_PATH}"
    exit 1
fi

log "Backup file: ${BACKUP_PATH}"
log "Backup size: $(du -h "${BACKUP_PATH}" | cut -f1)"

# Confirmation prompt
if [ "${NO_CONFIRM}" = false ]; then
    echo ""
    echo "WARNING: This will restore Redis data on ${REDIS_HOST}:${REDIS_PORT}"
    echo "All current data will be replaced with the backup data."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    
    if [ "${CONFIRM}" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
fi

log "Starting Redis restore..."

# Redis CLI command
if [ -n "${REDIS_PASSWORD}" ]; then
    REDIS_CLI_CMD="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} -a ${REDIS_PASSWORD}"
else
    REDIS_CLI_CMD="redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT}"
fi

# Create a backup of current state
log "Creating backup of current Redis state..."
${REDIS_CLI_CMD} BGSAVE
sleep 5

# Stop Redis writes
log "Stopping Redis writes..."
${REDIS_CLI_CMD} CONFIG SET stop-writes-on-bgsave-error no

# Decompress backup
log "Decompressing backup..."
RESTORE_FILE="${BACKUP_DIR}/restore_temp.rdb"
gunzip -c "${BACKUP_PATH}" > "${RESTORE_FILE}"

# For Kubernetes, copy to pod
if command -v kubectl &> /dev/null; then
    log "Copying backup to Redis pod..."
    REDIS_POD=$(kubectl get pods -n ai-tutoring-platform -l app=redis -o jsonpath='{.items[0].metadata.name}')
    
    # Stop Redis
    log "Stopping Redis..."
    kubectl exec -n ai-tutoring-platform "${REDIS_POD}" -- redis-cli -a "${REDIS_PASSWORD}" SHUTDOWN NOSAVE || true
    sleep 5
    
    # Copy RDB file
    kubectl cp "${RESTORE_FILE}" "ai-tutoring-platform/${REDIS_POD}:/data/dump.rdb"
    
    # Restart Redis pod
    log "Restarting Redis pod..."
    kubectl delete pod -n ai-tutoring-platform "${REDIS_POD}"
    
    # Wait for pod to be ready
    log "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n ai-tutoring-platform --timeout=120s
    
else
    # For Docker, copy to volume
    log "Stopping Redis..."
    ${REDIS_CLI_CMD} SHUTDOWN NOSAVE || true
    sleep 5
    
    # Copy RDB file
    cp "${RESTORE_FILE}" /data/dump.rdb
    
    # Restart Redis
    log "Starting Redis..."
    # This depends on your orchestration (Docker Compose, systemd, etc.)
    docker restart ai-tutor-redis || systemctl restart redis
    
    # Wait for Redis to be ready
    log "Waiting for Redis to be ready..."
    for i in {1..30}; do
        if ${REDIS_CLI_CMD} PING > /dev/null 2>&1; then
            break
        fi
        sleep 2
    done
fi

# Verify restoration
log "Verifying restoration..."
if ${REDIS_CLI_CMD} PING > /dev/null 2>&1; then
    KEY_COUNT=$(${REDIS_CLI_CMD} DBSIZE | awk '{print $2}')
    log "Redis is running. Keys restored: ${KEY_COUNT}"
    
    # Clean up
    rm -f "${RESTORE_FILE}"
    
    # Send success notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ Redis restore completed successfully\n• Backup: ${BACKUP_FILE}\n• Keys: ${KEY_COUNT}\"}"
    fi
    
    log "Restore process completed successfully"
    exit 0
else
    error "Redis restore failed - Redis is not responding"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ Redis restore FAILED\n• Backup: ${BACKUP_FILE}\"}"
    fi
    
    exit 1
fi
