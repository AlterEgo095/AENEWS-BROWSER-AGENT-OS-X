#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# AENEWS Agent OS X — Backup & Restore Script
# ══════════════════════════════════════════════════════════════════════
# Usage: ./backup.sh [full|db-only|restore|list]
#
# Backs up all data stores: PostgreSQL, Redis, Neo4j, Qdrant, MinIO
# Supports rotation (keeps last 7 backups) and selective restore.
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Configuration ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"
COMPOSE_PROD="${DOCKER_DIR}/docker-compose.prod.yml"
BACKUP_BASE="${PROJECT_ROOT}/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_BASE}/${TIMESTAMP}"
KEEP_BACKUPS=7  # Number of backups to retain during rotation

# Container names
PG_CONTAINER="aenews-postgres"
REDIS_CONTAINER="aenews-redis"
NEO4J_CONTAINER="aenews-neo4j"
QDRANT_CONTAINER="aenews-qdrant"
MINIO_CONTAINER="aenews-minio"

# ─── Helper Functions ──────────────────────────────────────────────────
log_header() {
    echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════════${NC}\n"
}

log_step() {
    echo -e "${BLUE}${BOLD}▶ $1${NC}"
}

log_success() {
    echo -e "${GREEN}${BOLD}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${BOLD}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}${BOLD}✗ $1${NC}"
}

log_info() {
    echo -e "${CYAN}  $1${NC}"
}

docker_compose() {
    docker compose -f "${COMPOSE_PROD}" "$@" 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" "$@"
}

container_is_running() {
    docker ps -q -f "name=^${1}$" &>/dev/null | grep -q .
}

ensure_container_running() {
    local container="$1"
    local service="$2"

    if ! container_is_running "$container"; then
        log_warning "Container '${container}' is not running. Starting it..."
        docker_compose up -d "$service"
        sleep 5
        local elapsed=0
        while [ $elapsed -lt 60 ]; do
            local status
            status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
            if [ "$status" = "healthy" ]; then
                return 0
            fi
            sleep 5
            elapsed=$((elapsed + 5))
        done
        log_error "Container '${container}' failed to start"
        return 1
    fi
}

get_env_value() {
    local key="$1"
    local default="${2:-}"
    local val
    val=$(docker exec "${PG_CONTAINER}" printenv "$key" 2>/dev/null || echo "")
    if [ -z "$val" ] && [ -f "${PROJECT_ROOT}/.env" ]; then
        val=$(grep "^${key}=" "${PROJECT_ROOT}/.env" 2>/dev/null | cut -d= -f2- || echo "")
    fi
    echo "${val:-$default}"
}

# ─── Load environment ──────────────────────────────────────────────────
load_env() {
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        set -a
        # shellcheck disable=SC1090
        source "${PROJECT_ROOT}/.env"
        set +a
    fi
}

# ─── PostgreSQL Backup ─────────────────────────────────────────────────
backup_postgres() {
    log_step "Backing up PostgreSQL..."

    ensure_container_running "${PG_CONTAINER}" "postgres"

    local db_name="${POSTGRES_DB:-aenews_osx}"
    local db_user="${POSTGRES_USER:-aenews}"
    local db_password="${POSTGRES_PASSWORD:-aenews_secret_2024}"
    local backup_file="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"

    log_info "Database: ${db_name}"

    docker exec "${PG_CONTAINER}" pg_dump \
        -U "${db_user}" \
        -d "${db_name}" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        2>/dev/null | gzip > "${backup_file}"

    local size
    size=$(du -h "${backup_file}" | cut -f1)
    log_success "PostgreSQL backup completed (${size}): ${backup_file}"
}

# ─── PostgreSQL Restore ────────────────────────────────────────────────
restore_postgres() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "PostgreSQL backup file not found: ${backup_file}"
        return 1
    fi

    log_step "Restoring PostgreSQL from ${backup_file}..."

    ensure_container_running "${PG_CONTAINER}" "postgres"

    local db_name="${POSTGRES_DB:-aenews_osx}"
    local db_user="${POSTGRES_USER:-aenews}"

    gunzip -c "${backup_file}" | docker exec -i "${PG_CONTAINER}" psql \
        -U "${db_user}" \
        -d "${db_name}" \
        2>/dev/null

    log_success "PostgreSQL restore completed"
}

# ─── Redis Backup ──────────────────────────────────────────────────────
backup_redis() {
    log_step "Backing up Redis..."

    ensure_container_running "${REDIS_CONTAINER}" "redis"

    local redis_password="${REDIS_PASSWORD:-aenews_redis_2024}"
    local backup_file="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

    # Trigger BGSAVE
    docker exec "${REDIS_CONTAINER}" redis-cli \
        -a "${redis_password}" \
        BGSAVE 2>/dev/null

    # Wait for BGSAVE to complete
    local elapsed=0
    while [ $elapsed -lt 30 ]; do
        local bgsave_status
        bgsave_status=$(docker exec "${REDIS_CONTAINER}" redis-cli \
            -a "${redis_password}" \
            LASTSAVE 2>/dev/null)
        sleep 2
        elapsed=$((elapsed + 2))
        # Check if save is done
        local saving
        saving=$(docker exec "${REDIS_CONTAINER}" redis-cli \
            -a "${redis_password}" \
            --no-auth-warning \
            INFO persistence 2>/dev/null | grep "rdb_last_bgsave_status:ok" || echo "")
        if [ -n "$saving" ]; then
            break
        fi
    done

    # Copy the dump.rdb file out of the container
    docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${backup_file}" 2>/dev/null || {
        # Fallback: try appendonly.aof
        docker cp "${REDIS_CONTAINER}:/data/appendonly.aof" "${BACKUP_DIR}/redis_${TIMESTAMP}.aof" 2>/dev/null || true
        log_warning "Could not copy Redis dump.rdb, attempted appendonly.aof"
    }

    if [ -f "${backup_file}" ]; then
        local size
        size=$(du -h "${backup_file}" | cut -f1)
        log_success "Redis backup completed (${size}): ${backup_file}"
    else
        log_warning "Redis backup file not created (Redis may be empty or using AOF only)"
    fi
}

# ─── Redis Restore ─────────────────────────────────────────────────────
restore_redis() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "Redis backup file not found: ${backup_file}"
        return 1
    fi

    log_step "Restoring Redis from ${backup_file}..."

    local redis_password="${REDIS_PASSWORD:-aenews_redis_2024}"

    # Stop Redis, replace data, start Redis
    docker_compose stop redis 2>/dev/null || true
    docker cp "${backup_file}" "${REDIS_CONTAINER}:/data/dump.rdb"
    docker_compose start redis 2>/dev/null || docker_compose up -d redis 2>/dev/null

    log_success "Redis restore completed"
}

# ─── Neo4j Backup ──────────────────────────────────────────────────────
backup_neo4j() {
    log_step "Backing up Neo4j..."

    ensure_container_running "${NEO4J_CONTAINER}" "neo4j"

    local neo4j_password="${NEO4J_PASSWORD:-aenews_neo4j_2024}"
    local backup_file="${BACKUP_DIR}/neo4j_${TIMESTAMP}.dump"

    # Use neo4j-admin dump inside the container
    docker exec "${NEO4J_CONTAINER}" neo4j-admin database dump neo4j \
        --to-path=/tmp/ \
        --overwrite-destination \
        2>/dev/null || {
            # Fallback: try older neo4j-admin syntax
            docker exec "${NEO4J_CONTAINER}" neo4j-admin dump \
                --database=neo4j \
                --to=/tmp/neo4j.dump \
                2>/dev/null || {
                    log_warning "neo4j-admin dump failed. Attempting file copy..."
                    # Fallback: copy data directory
                    docker cp "${NEO4J_CONTAINER}:/data/" "${BACKUP_DIR}/neo4j_data_${TIMESTAMP}/" 2>/dev/null || true
                    log_success "Neo4j backup completed (file copy): ${BACKUP_DIR}/neo4j_data_${TIMESTAMP}/"
                    return 0
                }
        }

    # Copy dump file from container
    docker cp "${NEO4J_CONTAINER}:/tmp/neo4j.dump" "${backup_file}" 2>/dev/null || \
        docker cp "${NEO4J_CONTAINER}:/tmp/neo4j_"*.dump "${backup_file}" 2>/dev/null || true

    # Clean up temp file in container
    docker exec "${NEO4J_CONTAINER}" rm -f /tmp/neo4j.dump 2>/dev/null || true

    if [ -f "${backup_file}" ]; then
        local size
        size=$(du -h "${backup_file}" | cut -f1)
        log_success "Neo4j backup completed (${size}): ${backup_file}"
    else
        log_warning "Neo4j dump file not created"
    fi
}

# ─── Neo4j Restore ─────────────────────────────────────────────────────
restore_neo4j() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "Neo4j backup file not found: ${backup_file}"
        return 1
    fi

    log_step "Restoring Neo4j from ${backup_file}..."

    # Stop Neo4j for restore
    docker_compose stop neo4j 2>/dev/null || true

    # Copy dump into container
    docker cp "${backup_file}" "${NEO4J_CONTAINER}:/tmp/neo4j.dump"

    # Run neo4j-admin load
    docker exec "${NEO4J_CONTAINER}" neo4j-admin database load neo4j \
        --from-path=/tmp/ \
        --overwrite-destination \
        2>/dev/null || {
            docker exec "${NEO4J_CONTAINER}" neo4j-admin load \
                --database=neo4j \
                --from=/tmp/neo4j.dump \
                --force \
                2>/dev/null || log_error "Neo4j restore failed"
        }

    # Clean up and start
    docker exec "${NEO4J_CONTAINER}" rm -f /tmp/neo4j.dump 2>/dev/null || true
    docker_compose start neo4j 2>/dev/null || docker_compose up -d neo4j 2>/dev/null

    log_success "Neo4j restore completed"
}

# ─── Qdrant Backup ─────────────────────────────────────────────────────
backup_qdrant() {
    log_step "Backing up Qdrant..."

    ensure_container_running "${QDRANT_CONTAINER}" "qdrant"

    local backup_file="${BACKUP_DIR}/qdrant_${TIMESTAMP}.tar.gz"

    # Create snapshot via Qdrant API
    local collections
    collections=$(curl -sf "http://localhost:6333/collections" 2>/dev/null | \
        python3 -c "import sys,json; data=json.load(sys.stdin); [print(c['name']) for c in data.get('result',{}).get('collections',[])]" 2>/dev/null || echo "")

    if [ -z "$collections" ]; then
        log_warning "No Qdrant collections found or API unavailable. Copying storage directory."
        docker cp "${QDRANT_CONTAINER}:/qdrant/storage/" "${BACKUP_DIR}/qdrant_storage_${TIMESTAMP}/" 2>/dev/null || true
        cd "${BACKUP_DIR}" && tar czf "qdrant_${TIMESTAMP}.tar.gz" "qdrant_storage_${TIMESTAMP}/" 2>/dev/null && \
            rm -rf "qdrant_storage_${TIMESTAMP}/"
        log_success "Qdrant backup completed (storage copy)"
        return 0
    fi

    # Create snapshots for each collection
    for collection in $collections; do
        log_info "Creating snapshot for collection: ${collection}"
        curl -sf -X POST "http://localhost:6333/collections/${collection}/snapshots" 2>/dev/null || \
            log_warning "Failed to create snapshot for collection: ${collection}"
    done

    # Copy snapshots out
    docker cp "${QDRANT_CONTAINER}:/qdrant/storage/" "${BACKUP_DIR}/qdrant_storage_${TIMESTAMP}/" 2>/dev/null || true

    # Compress
    if [ -d "${BACKUP_DIR}/qdrant_storage_${TIMESTAMP}" ]; then
        cd "${BACKUP_DIR}" && tar czf "qdrant_${TIMESTAMP}.tar.gz" "qdrant_storage_${TIMESTAMP}/" 2>/dev/null && \
            rm -rf "qdrant_storage_${TIMESTAMP}/"
    fi

    if [ -f "${backup_file}" ]; then
        local size
        size=$(du -h "${backup_file}" | cut -f1)
        log_success "Qdrant backup completed (${size}): ${backup_file}"
    else
        log_warning "Qdrant backup file not created"
    fi
}

# ─── Qdrant Restore ────────────────────────────────────────────────────
restore_qdrant() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "Qdrant backup file not found: ${backup_file}"
        return 1
    fi

    log_step "Restoring Qdrant from ${backup_file}..."

    docker_compose stop qdrant 2>/dev/null || true

    # Extract and copy back
    local extract_dir="${BACKUP_DIR}/qdrant_restore_${TIMESTAMP}"
    mkdir -p "${extract_dir}"
    tar xzf "${backup_file}" -C "${extract_dir}"

    docker cp "${extract_dir}/storage/" "${QDRANT_CONTAINER}:/qdrant/" 2>/dev/null || true
    rm -rf "${extract_dir}"

    docker_compose start qdrant 2>/dev/null || docker_compose up -d qdrant 2>/dev/null

    log_success "Qdrant restore completed"
}

# ─── MinIO Backup ──────────────────────────────────────────────────────
backup_minio() {
    log_step "Backing up MinIO..."

    ensure_container_running "${MINIO_CONTAINER}" "minio"

    local backup_file="${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz"

    # Copy data directory from container
    docker cp "${MINIO_CONTAINER}:/data/" "${BACKUP_DIR}/minio_data_${TIMESTAMP}/" 2>/dev/null || {
        log_warning "Could not copy MinIO data directory"
        return 0
    }

    # Compress
    cd "${BACKUP_DIR}" && tar czf "minio_${TIMESTAMP}.tar.gz" "minio_data_${TIMESTAMP}/" 2>/dev/null && \
        rm -rf "minio_data_${TIMESTAMP}/"

    if [ -f "${backup_file}" ]; then
        local size
        size=$(du -h "${backup_file}" | cut -f1)
        log_success "MinIO backup completed (${size}): ${backup_file}"
    else
        log_warning "MinIO backup file not created"
    fi
}

# ─── MinIO Restore ─────────────────────────────────────────────────────
restore_minio() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "MinIO backup file not found: ${backup_file}"
        return 1
    fi

    log_step "Restoring MinIO from ${backup_file}..."

    docker_compose stop minio 2>/dev/null || true

    # Extract and copy back
    local extract_dir="${BACKUP_DIR}/minio_restore_${TIMESTAMP}"
    mkdir -p "${extract_dir}"
    tar xzf "${backup_file}" -C "${extract_dir}"

    docker cp "${extract_dir}/data/" "${MINIO_CONTAINER}:/" 2>/dev/null || true
    rm -rf "${extract_dir}"

    docker_compose start minio 2>/dev/null || docker_compose up -d minio 2>/dev/null

    log_success "MinIO restore completed"
}

# ─── Full Backup ───────────────────────────────────────────────────────
full_backup() {
    log_header "AENEWS Agent OS X — Full Backup"

    load_env

    # Create backup directory
    mkdir -p "${BACKUP_DIR}"

    log_info "Backup directory: ${BACKUP_DIR}"
    log_info "Timestamp: ${TIMESTAMP}"

    # Run all backups
    backup_postgres
    backup_redis
    backup_neo4j
    backup_qdrant
    backup_minio

    # Create a compressed archive of the entire backup
    log_step "Creating compressed archive..."
    local archive_name="aenews_backup_${TIMESTAMP}.tar.gz"
    cd "${BACKUP_BASE}" && tar czf "${archive_name}" "${TIMESTAMP}/" 2>/dev/null

    local archive_size
    archive_size=$(du -h "${BACKUP_BASE}/${archive_name}" | cut -f1)
    log_success "Backup archive created (${archive_size}): ${BACKUP_BASE}/${archive_name}"

    # Write manifest
    cat > "${BACKUP_DIR}/manifest.json" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "date": "$(date -Iseconds)",
    "type": "full",
    "services": ["postgres", "redis", "neo4j", "qdrant", "minio"],
    "archive": "${archive_name}",
    "generated_by": "aenews-backup-script"
}
EOF

    # Rotate old backups
    rotate_backups

    log_header "Backup Complete!"
    echo -e "${GREEN}${BOLD}  Archive: ${BACKUP_BASE}/${archive_name}${NC}"
    echo -e "${GREEN}${BOLD}  Size: ${archive_size}${NC}"
    echo -e "${GREEN}${BOLD}  Retained: ${KEEP_BACKUPS} most recent backups${NC}"
}

# ─── Database-Only Backup ──────────────────────────────────────────────
db_only_backup() {
    log_header "AENEWS Agent OS X — Database-Only Backup"

    load_env
    mkdir -p "${BACKUP_DIR}"

    log_info "Backup directory: ${BACKUP_DIR}"
    log_info "Timestamp: ${TIMESTAMP}"

    backup_postgres
    backup_redis
    backup_neo4j

    # Create archive
    log_step "Creating compressed archive..."
    local archive_name="aenews_db_backup_${TIMESTAMP}.tar.gz"
    cd "${BACKUP_BASE}" && tar czf "${archive_name}" "${TIMESTAMP}/" 2>/dev/null

    local archive_size
    archive_size=$(du -h "${BACKUP_BASE}/${archive_name}" | cut -f1)
    log_success "Database backup archive created (${archive_size}): ${BACKUP_BASE}/${archive_name}"

    # Write manifest
    cat > "${BACKUP_DIR}/manifest.json" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "date": "$(date -Iseconds)",
    "type": "db-only",
    "services": ["postgres", "redis", "neo4j"],
    "archive": "${archive_name}",
    "generated_by": "aenews-backup-script"
}
EOF

    rotate_backups

    log_header "Database Backup Complete!"
}

# ─── Restore ───────────────────────────────────────────────────────────
restore_backup() {
    log_header "AENEWS Agent OS X — Restore"

    load_env

    local backup_path="${1:-}"

    # If no backup specified, show available backups
    if [ -z "$backup_path" ]; then
        echo -e "${YELLOW}Available backups:${NC}"
        list_backups
        echo ""
        echo -e "${RED}${BOLD}Enter backup timestamp to restore (YYYYMMDD_HHMMSS): ${NC}"
        read -r backup_ts

        if [ -z "$backup_ts" ]; then
            log_error "No backup timestamp provided"
            exit 1
        fi

        backup_path="${BACKUP_BASE}/${backup_ts}"
    fi

    # Check if it's a compressed archive or a directory
    if [ -f "${backup_path}" ] && [[ "${backup_path}" == *.tar.gz ]]; then
        log_step "Extracting archive: ${backup_path}"
        local extract_dir="${backup_path%.tar.gz}"
        mkdir -p "${extract_dir}"
        tar xzf "${backup_path}" -C "${extract_dir}" --strip-components=1
        backup_path="${extract_dir}"
    fi

    if [ ! -d "${backup_path}" ]; then
        log_error "Backup directory not found: ${backup_path}"
        exit 1
    fi

    # Show manifest if available
    if [ -f "${backup_path}/manifest.json" ]; then
        log_info "Backup manifest:"
        cat "${backup_path}/manifest.json"
        echo ""
    fi

    # Confirmation
    echo -e "${RED}${BOLD}⚠  WARNING: This will overwrite current data!  ⚠${NC}"
    echo -e "${RED}${BOLD}   Make sure you have a current backup before proceeding.${NC}"
    echo ""
    read -rp "$(echo -e ${RED}${BOLD}Type 'RESTORE' to confirm: ${NC})" confirm

    if [ "$confirm" != "RESTORE" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    # Restore each service
    local ts_dir
    ts_dir=$(basename "${backup_path}")

    # Find backup files
    local pg_file redis_file neo4j_file qdrant_file minio_file

    pg_file=$(find "${backup_path}" -name "postgres_*.sql.gz" -print -quit 2>/dev/null || echo "")
    redis_file=$(find "${backup_path}" -name "redis_*.rdb" -print -quit 2>/dev/null || echo "")
    neo4j_file=$(find "${backup_path}" -name "neo4j_*.dump" -print -quit 2>/dev/null || echo "")
    qdrant_file=$(find "${backup_path}" -name "qdrant_*.tar.gz" -print -quit 2>/dev/null || echo "")
    minio_file=$(find "${backup_path}" -name "minio_*.tar.gz" -print -quit 2>/dev/null || echo "")

    # Selective restore
    echo ""
    echo -e "${BOLD}Select services to restore:${NC}"
    echo "  1) All services"
    echo "  2) PostgreSQL only"
    echo "  3) Redis only"
    echo "  4) Neo4j only"
    echo "  5) Qdrant only"
    echo "  6) MinIO only"
    echo "  7) Custom selection"
    read -rp "$(echo -e ${BOLD}Choice [1-7]: ${NC})" choice

    case "$choice" in
        1)
            [ -n "$pg_file" ] && restore_postgres "$pg_file"
            [ -n "$redis_file" ] && restore_redis "$redis_file"
            [ -n "$neo4j_file" ] && restore_neo4j "$neo4j_file"
            [ -n "$qdrant_file" ] && restore_qdrant "$qdrant_file"
            [ -n "$minio_file" ] && restore_minio "$minio_file"
            ;;
        2) [ -n "$pg_file" ] && restore_postgres "$pg_file" ;;
        3) [ -n "$redis_file" ] && restore_redis "$redis_file" ;;
        4) [ -n "$neo4j_file" ] && restore_neo4j "$neo4j_file" ;;
        5) [ -n "$qdrant_file" ] && restore_qdrant "$qdrant_file" ;;
        6) [ -n "$minio_file" ] && restore_minio "$minio_file" ;;
        7)
            read -rp "Restore PostgreSQL? [y/N]: " r_pg
            read -rp "Restore Redis? [y/N]: " r_redis
            read -rp "Restore Neo4j? [y/N]: " r_neo4j
            read -rp "Restore Qdrant? [y/N]: " r_qdrant
            read -rp "Restore MinIO? [y/N]: " r_minio

            [[ "$r_pg" == [yY]* ]] && [ -n "$pg_file" ] && restore_postgres "$pg_file"
            [[ "$r_redis" == [yY]* ]] && [ -n "$redis_file" ] && restore_redis "$redis_file"
            [[ "$r_neo4j" == [yY]* ]] && [ -n "$neo4j_file" ] && restore_neo4j "$neo4j_file"
            [[ "$r_qdrant" == [yY]* ]] && [ -n "$qdrant_file" ] && restore_qdrant "$qdrant_file"
            [[ "$r_minio" == [yY]* ]] && [ -n "$minio_file" ] && restore_minio "$minio_file"
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    log_header "Restore Complete!"
}

# ─── List Backups ──────────────────────────────────────────────────────
list_backups() {
    if [ ! -d "${BACKUP_BASE}" ]; then
        log_info "No backups directory found at ${BACKUP_BASE}"
        return 0
    fi

    echo -e "${BOLD}Available Backups:${NC}\n"

    # List directories (raw backups)
    for dir in "${BACKUP_BASE}"/[0-9]*; do
        if [ -d "$dir" ]; then
            local name
            name=$(basename "$dir")
            local manifest="${dir}/manifest.json"
            if [ -f "$manifest" ]; then
                local btype bdate services
                btype=$(python3 -c "import json; d=json.load(open('${manifest}')); print(d.get('type','unknown'))" 2>/dev/null || echo "unknown")
                bdate=$(python3 -c "import json; d=json.load(open('${manifest}')); print(d.get('date','unknown'))" 2>/dev/null || echo "unknown")
                services=$(python3 -c "import json; d=json.load(open('${manifest}')); print(','.join(d.get('services',[])))" 2>/dev/null || echo "unknown")
                echo -e "  ${GREEN}${name}${NC}  type=${btype}  date=${bdate}  services=[${services}]"
            else
                local dir_size
                dir_size=$(du -sh "$dir" 2>/dev/null | cut -f1)
                echo -e "  ${YELLOW}${name}${NC}  size=${dir_size}  (no manifest)"
            fi
        fi
    done

    # List archives
    for archive in "${BACKUP_BASE}"/aenews_*.tar.gz; do
        if [ -f "$archive" ]; then
            local name
            name=$(basename "$archive")
            local size
            size=$(du -h "$archive" | cut -f1)
            echo -e "  ${CYAN}${name}${NC}  size=${size}  (archive)"
        fi
    done

    echo ""
    local total_count
    total_count=$(find "${BACKUP_BASE}" -maxdepth 1 -name "[0-9]*" -type d 2>/dev/null | wc -l | tr -d ' ')
    local total_size
    total_size=$(du -sh "${BACKUP_BASE}" 2>/dev/null | cut -f1)
    echo -e "  Total: ${total_count} backups, ${total_size} disk usage"
}

# ─── Rotate Backups ────────────────────────────────────────────────────
rotate_backups() {
    log_step "Rotating backups (keeping last ${KEEP_BACKUPS})..."

    local count
    count=$(find "${BACKUP_BASE}" -maxdepth 1 -name "[0-9]*" -type d | sort | wc -l | tr -d ' ')

    if [ "$count" -le "${KEEP_BACKUPS}" ]; then
        log_info "Only ${count} backups found. No rotation needed."
        return 0
    fi

    local to_delete
    to_delete=$((count - KEEP_BACKUPS))

    log_info "Removing ${to_delete} old backup(s)..."

    find "${BACKUP_BASE}" -maxdepth 1 -name "[0-9]*" -type d | sort | head -n "${to_delete}" | while read -r dir; do
        local name
        name=$(basename "$dir")
        log_info "Removing old backup: ${name}"
        rm -rf "$dir"

        # Also remove the corresponding archive if it exists
        rm -f "${BACKUP_BASE}/aenews_backup_${name}.tar.gz" 2>/dev/null
        rm -f "${BACKUP_BASE}/aenews_db_backup_${name}.tar.gz" 2>/dev/null
    done

    log_success "Backup rotation complete. Kept last ${KEEP_BACKUPS} backups."
}

# ─── Usage ─────────────────────────────────────────────────────────────
usage() {
    echo -e "${BOLD}AENEWS Agent OS X — Backup & Restore${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  full       Full backup (all services: PostgreSQL, Redis, Neo4j, Qdrant, MinIO)"
    echo "  db-only    Database-only backup (PostgreSQL, Redis, Neo4j)"
    echo "  restore    Interactive restore from a backup"
    echo "  list       List available backups"
    echo ""
    echo "Examples:"
    echo "  $0 full           # Full backup of all services"
    echo "  $0 db-only        # Backup databases only (smaller, faster)"
    echo "  $0 restore        # Interactive restore"
    echo "  $0 list           # Show all backups"
}

# ─── Main ──────────────────────────────────────────────────────────────
main() {
    local command="${1:-}"

    case "$command" in
        full)
            full_backup
            ;;
        db-only)
            db_only_backup
            ;;
        restore)
            restore_backup "${2:-}"
            ;;
        list)
            list_backups
            ;;
        help|--help|-h)
            usage
            ;;
        "")
            usage
            exit 1
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

main "$@"
