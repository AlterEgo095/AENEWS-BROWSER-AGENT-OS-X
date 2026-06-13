#!/bin/sh
# AENEWS Agent OS X - MinIO Bucket Initialization Script
# Phase 0: Foundation
#
# This script creates the required MinIO buckets for the AENEWS Agent OS X platform.
# It waits for MinIO to be healthy, then uses the MinIO Client (mc) to configure
# buckets with appropriate policies.
#
# Usage:
#   ./init-minio.sh
#
# Environment variables (with defaults):
#   MINIO_ENDPOINT    - MinIO server endpoint (default: http://minio:9000)
#   MINIO_ROOT_USER   - MinIO root user (default: aenews_minio)
#   MINIO_ROOT_PASSWORD - MinIO root password (default: aenews_minio_secret_2024)

set -e

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-aenews_minio}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-aenews_minio_secret_2024}"
MINIO_ALIAS="aenews-local"

# Required buckets for the platform
BUCKETS="agent-artifacts agent-logs agent-models agent-configs tenant-uploads task-results event-archives plugin-assets"

echo "============================================"
echo " AENEWS Agent OS X - MinIO Initialization"
echo "============================================"
echo ""
echo "Endpoint: ${MINIO_ENDPOINT}"
echo "User:     ${MINIO_ROOT_USER}"
echo ""

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ ${RETRY_COUNT} -lt ${MAX_RETRIES} ]; do
    if wget --spider --quiet "${MINIO_ENDPOINT}/minio/health/live" 2>/dev/null; then
        echo "MinIO is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Attempt ${RETRY_COUNT}/${MAX_RETRIES} - MinIO not ready, waiting 2s..."
    sleep 2
done

if [ ${RETRY_COUNT} -eq ${MAX_RETRIES} ]; then
    echo "ERROR: MinIO did not become ready within the timeout period."
    exit 1
fi

# Configure mc client alias
echo ""
echo "Configuring MinIO client alias..."
mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" --api s3v4

# Create buckets
echo ""
echo "Creating buckets..."
for BUCKET in ${BUCKETS}; do
    if mc ls "${MINIO_ALIAS}/${BUCKET}" --quiet > /dev/null 2>&1; then
        echo "  [SKIP] Bucket '${BUCKET}' already exists"
    else
        mc mb "${MINIO_ALIAS}/${BUCKET}" --region "us-east-1"
        echo "  [CREATED] Bucket '${BUCKET}'"
    fi
done

# Set bucket policies
echo ""
echo "Configuring bucket policies..."

# agent-artifacts: public read for serving agent outputs
mc anonymous set download "${MINIO_ALIAS}/agent-artifacts" 2>/dev/null || true
echo "  [POLICY] agent-artifacts: public read"

# agent-logs: private - only internal services
mc anonymous set none "${MINIO_ALIAS}/agent-logs" 2>/dev/null || true
echo "  [POLICY] agent-logs: private"

# agent-models: private - model weights and data
mc anonymous set none "${MINIO_ALIAS}/agent-models" 2>/dev/null || true
echo "  [POLICY] agent-models: private"

# agent-configs: private - agent configuration files
mc anonymous set none "${MINIO_ALIAS}/agent-configs" 2>/dev/null || true
echo "  [POLICY] agent-configs: private"

# tenant-uploads: private - tenant uploaded files
mc anonymous set none "${MINIO_ALIAS}/tenant-uploads" 2>/dev/null || true
echo "  [POLICY] tenant-uploads: private"

# task-results: public read for task output access
mc anonymous set download "${MINIO_ALIAS}/task-results" 2>/dev/null || true
echo "  [POLICY] task-results: public read"

# event-archives: private - event archive data
mc anonymous set none "${MINIO_ALIAS}/event-archives" 2>/dev/null || true
echo "  [POLICY] event-archives: private"

# plugin-assets: public read for plugin static assets
mc anonymous set download "${MINIO_ALIAS}/plugin-assets" 2>/dev/null || true
echo "  [POLICY] plugin-assets: public read"

# Set lifecycle / retention policies on specific buckets
echo ""
echo "Configuring lifecycle rules..."

# agent-logs: expire objects after 90 days
mc ilm rule add "${MINIO_ALIAS}/agent-logs" --expire-days 90 --prefix "logs/" 2>/dev/null || true
echo "  [LIFECYCLE] agent-logs: expire logs/ after 90 days"

# event-archives: expire objects after 365 days
mc ilm rule add "${MINIO_ALIAS}/event-archives" --expire-days 365 --prefix "archived/" 2>/dev/null || true
echo "  [LIFECYCLE] event-archives: expire archived/ after 365 days"

# task-results: expire objects after 30 days
mc ilm rule add "${MINIO_ALIAS}/task-results" --expire-days 30 --prefix "results/" 2>/dev/null || true
echo "  [LIFECYCLE] task-results: expire results/ after 30 days"

# Set versioning on critical buckets
echo ""
echo "Configuring versioning..."

mc version enable "${MINIO_ALIAS}/agent-configs" 2>/dev/null || true
echo "  [VERSIONING] agent-configs: enabled"

mc version enable "${MINIO_ALIAS}/agent-models" 2>/dev/null || true
echo "  [VERSIONING] agent-models: enabled"

mc version enable "${MINIO_ALIAS}/tenant-uploads" 2>/dev/null || true
echo "  [VERSIONING] tenant-uploads: enabled"

echo ""
echo "============================================"
echo " MinIO initialization complete!"
echo "============================================"
echo ""
echo "Buckets created:"
for BUCKET in ${BUCKETS}; do
    echo "  - ${BUCKET}"
done
echo ""
echo "To verify, access the MinIO Console at:"
echo "  http://localhost:9001"
echo "  Username: ${MINIO_ROOT_USER}"
echo "  Password: ${MINIO_ROOT_PASSWORD}"
