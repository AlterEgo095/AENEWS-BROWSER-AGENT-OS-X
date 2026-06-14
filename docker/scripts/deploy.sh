#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# AENEWS Agent OS X — Production Deployment Script
# ══════════════════════════════════════════════════════════════════════
# Usage: ./deploy.sh [setup|start|stop|restart|status|logs|backup|migrate|ssl]
#
# Designed for macOS (OS X) VPS deployment with Docker.
# All operations are idempotent — safe to run multiple times.
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Configuration ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_PRODUCTION="${PROJECT_ROOT}/.env.production"
COMPOSE_PROD="${DOCKER_DIR}/docker-compose.prod.yml"
COMPOSE_MONITORING="${DOCKER_DIR}/docker-compose.monitoring.yml"
SSL_DIR="${DOCKER_DIR}/nginx/ssl"
BACKUP_DIR="${PROJECT_ROOT}/backups"
HEALTH_TIMEOUT=180  # seconds to wait for health checks

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

check_command() {
    if ! command -v "$1" &>/dev/null; then
        log_error "Required command '$1' is not installed."
        echo -e "${YELLOW}  Install with: brew install $1${NC}" 2>/dev/null || \
            echo -e "${YELLOW}  Install with: apt-get install $1${NC}"
        exit 1
    fi
}

wait_for_url() {
    local url="$1"
    local name="$2"
    local timeout="${3:-$HEALTH_TIMEOUT}"
    local elapsed=0

    log_step "Waiting for ${name} to become healthy (timeout: ${timeout}s)..."

    while [ $elapsed -lt $timeout ]; do
        if curl -sf -o /dev/null "$url" 2>/dev/null; then
            log_success "${name} is healthy!"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -e "${YELLOW}  ... ${elapsed}s elapsed${NC}"
    done

    log_error "${name} did not become healthy within ${timeout}s"
    return 1
}

wait_for_container() {
    local container="$1"
    local timeout="${2:-$HEALTH_TIMEOUT}"
    local elapsed=0

    log_step "Waiting for container '${container}' to be healthy..."

    while [ $elapsed -lt $timeout ]; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
        if [ "$status" = "healthy" ]; then
            log_success "Container '${container}' is healthy!"
            return 0
        elif [ "$status" = "missing" ]; then
            log_error "Container '${container}' not found"
            return 1
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -e "${YELLOW}  ... ${elapsed}s elapsed (status: ${status})${NC}"
    done

    log_error "Container '${container}' not healthy within ${timeout}s (status: ${status})"
    return 1
}

# ─── Prerequisites Check ───────────────────────────────────────────────
check_prerequisites() {
    log_header "Checking Prerequisites"

    check_command docker
    log_success "docker found: $(docker --version)"

    check_command docker-compose 2>/dev/null || docker compose version &>/dev/null || {
        log_error "docker-compose (or 'docker compose') is not installed."
        exit 1
    }
    local compose_version
    compose_version=$(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null)
    log_success "docker-compose found: ${compose_version}"

    check_command curl
    log_success "curl found: $(curl --version | head -1)"

    # Check Docker daemon is running
    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    log_success "Docker daemon is running"

    # Check disk space (minimum 10GB free)
    local free_space
    free_space=$(df -g "${PROJECT_ROOT}" | awk 'NR==2 {print $4}')
    if [ "${free_space:-0}" -lt 10 ]; then
        log_warning "Low disk space: ${free_space}GB free. Recommend at least 10GB."
    else
        log_success "Disk space OK: ${free_space}GB free"
    fi

    log_success "All prerequisites met!"
}

# ─── Environment Setup ─────────────────────────────────────────────────
setup_env() {
    log_header "Setting Up Environment"

    if [ -f "${ENV_FILE}" ]; then
        log_success ".env file already exists at ${ENV_FILE}"
        # Source it for current session
        set -a
        # shellcheck disable=SC1090
        source "${ENV_FILE}"
        set +a
        return 0
    fi

    if [ -f "${ENV_PRODUCTION}" ]; then
        log_step "Copying .env.production to .env"
        cp "${ENV_PRODUCTION}" "${ENV_FILE}"
        log_success "Created .env from .env.production"
    elif [ -f "${PROJECT_ROOT}/.env.example" ]; then
        log_warning "No .env.production found. Using .env.example as template."
        log_warning "REVIEW AND UPDATE .env BEFORE DEPLOYING TO PRODUCTION!"
        cp "${PROJECT_ROOT}/.env.example" "${ENV_FILE}"

        # Generate secure random secrets for production
        log_step "Generating secure random secrets..."

        local jwt_secret
        jwt_secret=$(openssl rand -hex 64)
        local encryption_key
        encryption_key=$(openssl rand -hex 16)

        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" "${ENV_FILE}"
            sed -i '' "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${encryption_key}|" "${ENV_FILE}"
            sed -i '' "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 24)|" "${ENV_FILE}"
            sed -i '' "s|^NEO4J_PASSWORD=.*|NEO4J_PASSWORD=$(openssl rand -hex 24)|" "${ENV_FILE}"
            sed -i '' "s|^RABBITMQ_PASSWORD=.*|RABBITMQ_PASSWORD=$(openssl rand -hex 24)|" "${ENV_FILE}"
            sed -i '' "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=aenews_$(openssl rand -hex 8)|" "${ENV_FILE}"
            sed -i '' "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$(openssl rand -hex 24)|" "${ENV_FILE}"
        else
            sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" "${ENV_FILE}"
            sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${encryption_key}|" "${ENV_FILE}"
            sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 24)|" "${ENV_FILE}"
            sed -i "s|^NEO4J_PASSWORD=.*|NEO4J_PASSWORD=$(openssl rand -hex 24)|" "${ENV_FILE}"
            sed -i "s|^RABBITMQ_PASSWORD=.*|RABBITMQ_PASSWORD=$(openssl rand -hex 24)|" "${ENV_FILE}"
            sed -i "s|^MINIO_ACCESS_KEY=.*|MINIO_ACCESS_KEY=aenews_$(openssl rand -hex 8)|" "${ENV_FILE}"
            sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$(openssl rand -hex 24)|" "${ENV_FILE}"
        fi

        # Set production mode
        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s|^APP_ENV=.*|APP_ENV=production|" "${ENV_FILE}"
            sed -i '' "s|^DB_SYNCHRONIZE=.*|DB_SYNCHRONIZE=false|" "${ENV_FILE}"
        else
            sed -i "s|^APP_ENV=.*|APP_ENV=production|" "${ENV_FILE}"
            sed -i "s|^DB_SYNCHRONIZE=.*|DB_SYNCHRONIZE=false|" "${ENV_FILE}"
        fi

        log_success "Generated secure secrets and saved to .env"
    else
        log_error "No .env, .env.production, or .env.example found. Cannot continue."
        exit 1
    fi

    # Source the env file
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
}

# ─── SSL Certificate Setup ─────────────────────────────────────────────
setup_ssl() {
    log_header "Setting Up SSL Certificates"

    mkdir -p "${SSL_DIR}"

    # Check if real certificates already exist
    if [ -f "${SSL_DIR}/fullchain.pem" ] && [ -f "${SSL_DIR}/privkey.pem" ]; then
        local cert_expiry
        cert_expiry=$(openssl x509 -enddate -noout -in "${SSL_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2 || echo "unknown")
        log_success "SSL certificates already exist (expires: ${cert_expiry})"
        return 0
    fi

    log_warning "No SSL certificates found. Generating self-signed certificates..."
    log_info "For production, use: ./ssl-setup.sh letsencrypt YOUR_DOMAIN your@email.com"

    # Generate self-signed certificate
    openssl req -x509 -nodes \
        -days 365 \
        -newkey rsa:2048 \
        -keyout "${SSL_DIR}/privkey.pem" \
        -out "${SSL_DIR}/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=AENEWS/CN=aenews-agent-osx.local" \
        2>/dev/null

    chmod 600 "${SSL_DIR}/privkey.pem"
    chmod 644 "${SSL_DIR}/fullchain.pem"

    log_success "Self-signed SSL certificates generated at ${SSL_DIR}/"
    log_warning "Self-signed certs will show browser warnings. Use Let's Encrypt for production."
}

# ─── Database Migration ────────────────────────────────────────────────
run_migrations() {
    log_header "Running Database Migrations"

    # Ensure postgres is healthy first
    local pg_status
    pg_status=$(docker inspect --format='{{.State.Health.Status}}' aenews-postgres 2>/dev/null || echo "missing")

    if [ "$pg_status" != "healthy" ]; then
        log_step "Starting PostgreSQL for migrations..."
        docker compose -f "${COMPOSE_PROD}" up -d postgres 2>/dev/null || \
            docker-compose -f "${COMPOSE_PROD}" up -d postgres 2>/dev/null
        wait_for_container "aenews-postgres" 60
    fi

    # Check if API container exists and is running
    local api_running
    api_running=$(docker ps -q -f name=aenews-api 2>/dev/null)

    if [ -n "$api_running" ]; then
        log_step "Running migrations via API container..."
        docker exec aenews-api node -e "
            const { DataSource } = require('typeorm');
            const ds = new DataSource({
                type: 'postgres',
                host: process.env.DB_HOST || 'postgres',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'aenews_osx',
                username: process.env.DB_USER || 'aenews',
                password: process.env.DB_PASSWORD,
                migrations: ['dist/migrations/*.js'],
                migrationsRun: true,
            });
            ds.initialize().then(() => { console.log('Migrations completed'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
        " 2>/dev/null && log_success "Migrations completed successfully" && return 0
    fi

    # Fallback: use TypeORM CLI from the project
    if [ -f "${PROJECT_ROOT}/backend/node_modules/.bin/typeorm" ]; then
        log_step "Running TypeORM migrations from project..."
        cd "${PROJECT_ROOT}/backend" && npx typeorm migration:run -d src/data-source.ts 2>/dev/null && \
            log_success "Migrations completed successfully" && return 0
    fi

    log_warning "Could not run migrations automatically."
    log_info "You may need to run manually:"
    log_info "  cd backend && npx typeorm migration:run -d src/data-source.ts"
    log_info "  Or set DB_SYNCHRONIZE=true in .env for initial setup (not recommended for production)"
}

# ─── Build Services ────────────────────────────────────────────────────
build_services() {
    log_header "Building Docker Images"

    log_step "Building backend image..."
    docker compose -f "${COMPOSE_PROD}" build api 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" build api 2>/dev/null
    log_success "Backend image built"

    log_step "Building frontend image..."
    docker compose -f "${COMPOSE_PROD}" build frontend 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" build frontend 2>/dev/null || {
            log_warning "Frontend image build failed or not defined in compose file. Skipping."
        }

    log_success "All images built!"
}

# ─── Start Services ────────────────────────────────────────────────────
start_services() {
    log_header "Starting Services"

    # Start infrastructure services first
    log_step "Starting infrastructure services (postgres, redis, neo4j, qdrant, rabbitmq, minio)..."
    docker compose -f "${COMPOSE_PROD}" up -d postgres redis neo4j qdrant rabbitmq minio 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" up -d postgres redis neo4j qdrant rabbitmq minio 2>/dev/null

    # Wait for infrastructure to be healthy
    log_step "Waiting for infrastructure services to be healthy..."
    wait_for_container "aenews-postgres" 90
    wait_for_container "aenews-redis" 60
    wait_for_container "aenews-neo4j" 120
    wait_for_container "aenews-qdrant" 60
    wait_for_container "aenews-rabbitmq" 90
    wait_for_container "aenews-minio" 60

    # Start application services
    log_step "Starting application services (api, frontend, nginx)..."
    docker compose -f "${COMPOSE_PROD}" up -d api 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" up -d api 2>/dev/null

    docker compose -f "${COMPOSE_PROD}" up -d frontend 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" up -d frontend 2>/dev/null || true

    docker compose -f "${COMPOSE_PROD}" up -d nginx 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" up -d nginx 2>/dev/null || true

    # Wait for API to be healthy
    wait_for_container "aenews-api" "${HEALTH_TIMEOUT}"

    log_success "All services started!"
}

# ─── Stop Services ─────────────────────────────────────────────────────
stop_services() {
    log_header "Stopping Services"

    docker compose -f "${COMPOSE_PROD}" down --remove-orphans 2>/dev/null || \
        docker-compose -f "${COMPOSE_PROD}" down --remove-orphans 2>/dev/null

    log_success "All services stopped"
}

# ─── Restart Services ──────────────────────────────────────────────────
restart_services() {
    log_header "Restarting Services"

    stop_services
    sleep 3
    start_services

    log_success "All services restarted!"
}

# ─── Show Status ───────────────────────────────────────────────────────
show_status() {
    log_header "AENEWS Agent OS X — Service Status"

    echo -e "${BOLD}Docker Containers:${NC}"
    docker ps -a \
        --filter "name=aenews-" \
        --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" \
        2>/dev/null | head -20

    echo ""
    echo -e "${BOLD}Resource Usage:${NC}"
    docker stats --no-stream \
        --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker ps -q --filter "name=aenews-" 2>/dev/null) 2>/dev/null | head -20

    echo ""
    echo -e "${BOLD}Health Check Summary:${NC}"
    for container in aenews-postgres aenews-redis aenews-neo4j aenews-qdrant aenews-rabbitmq aenews-minio aenews-api; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not found")
        case "$status" in
            healthy)   echo -e "  ${GREEN}✓${NC} ${container}: ${status}" ;;
            unhealthy) echo -e "  ${RED}✗${NC} ${container}: ${status}" ;;
            starting)  echo -e "  ${YELLOW}⏳${NC} ${container}: ${status}" ;;
            *)         echo -e "  ${RED}?${NC} ${container}: ${status}" ;;
        esac
    done

    echo ""
    echo -e "${BOLD}Disk Usage:${NC}"
    docker system df 2>/dev/null

    echo ""
    echo -e "${BOLD}Uptime:${NC}"
    for container in aenews-api aenews-postgres aenews-redis; do
        local started
        started=$(docker inspect --format='{{.State.StartedAt}}' "$container" 2>/dev/null || echo "N/A")
        echo -e "  ${container}: started at ${started}"
    done
}

# ─── Show Logs ─────────────────────────────────────────────────────────
show_logs() {
    local service="${1:-}"
    local tail_count="${2:-100}"

    if [ -n "$service" ]; then
        docker compose -f "${COMPOSE_PROD}" logs -f --tail="${tail_count}" "$service" 2>/dev/null || \
            docker-compose -f "${COMPOSE_PROD}" logs -f --tail="${tail_count}" "$service" 2>/dev/null
    else
        docker compose -f "${COMPOSE_PROD}" logs -f --tail=50 2>/dev/null || \
            docker-compose -f "${COMPOSE_PROD}" logs -f --tail=50 2>/dev/null
    fi
}

# ─── Run Backup ────────────────────────────────────────────────────────
run_backup() {
    log_header "Running Backup"

    if [ -f "${SCRIPT_DIR}/backup.sh" ]; then
        bash "${SCRIPT_DIR}/backup.sh" full
    else
        log_error "backup.sh not found at ${SCRIPT_DIR}/backup.sh"
        log_info "Creating backup directory..."
        mkdir -p "${BACKUP_DIR}"
        log_warning "Manual backup required. Use backup.sh script."
    fi
}

# ─── Full Setup (first-time) ──────────────────────────────────────────
full_setup() {
    log_header "AENEWS Agent OS X — First-Time Setup"

    check_prerequisites
    setup_env
    setup_ssl
    build_services
    start_services
    run_migrations

    log_header "Setup Complete!"
    echo -e "${GREEN}${BOLD}"
    echo "  AENEWS Agent OS X is now running!"
    echo ""
    echo "  Dashboard:  https://localhost"
    echo "  API:        https://localhost/api/v1"
    echo "  Health:     https://localhost/api/v1/health"
    echo ""
    echo "  Useful commands:"
    echo "    ./deploy.sh status    — Check service status"
    echo "    ./deploy.sh logs      — Tail all logs"
    echo "    ./deploy.sh logs api  — Tail API logs"
    echo "    ./deploy.sh backup    — Run backup"
    echo "    ./deploy.sh ssl       — Setup SSL certs"
    echo ""
    echo "  Next steps:"
    echo "    1. Review and update .env with production values"
    echo "    2. Setup real SSL certs: ./ssl-setup.sh letsencrypt DOMAIN EMAIL"
    echo "    3. Create admin user via API"
    echo -e "${NC}"
}

# ─── Full Production Deploy ────────────────────────────────────────────
full_deploy() {
    log_header "AENEWS Agent OS X — Production Deployment"

    check_prerequisites
    setup_env
    setup_ssl
    build_services

    # Run backup before deploy
    if [ -f "${SCRIPT_DIR}/backup.sh" ]; then
        log_step "Running pre-deploy backup..."
        bash "${SCRIPT_DIR}/backup.sh" db-only 2>/dev/null || log_warning "Pre-deploy backup failed. Continuing..."
    fi

    start_services
    run_migrations

    log_header "Deployment Complete!"
    show_status
}

# ─── Usage ─────────────────────────────────────────────────────────────
usage() {
    echo -e "${BOLD}AENEWS Agent OS X — Deployment Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     First-time setup (prerequisites, env, SSL, build, start, migrate)"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status and health"
    echo "  logs      Tail service logs (optional: service name, e.g., 'logs api')"
    echo "  backup    Run full backup"
    echo "  migrate   Run database migrations"
    echo "  ssl       Setup SSL certificates"
    echo "  deploy    Full production deployment (backup + build + start + migrate)"
    echo ""
    echo "Examples:"
    echo "  $0 setup          # First-time setup"
    echo "  $0 deploy         # Full production deploy"
    echo "  $0 logs api       # Tail API logs"
    echo "  $0 logs postgres  # Tail PostgreSQL logs"
}

# ─── Main ──────────────────────────────────────────────────────────────
main() {
    local command="${1:-}"
    local sub_arg="${2:-}"

    case "$command" in
        setup)
            full_setup
            ;;
        start)
            check_prerequisites
            setup_env
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$sub_arg" "${3:-100}"
            ;;
        backup)
            run_backup
            ;;
        migrate)
            run_migrations
            ;;
        ssl)
            setup_ssl
            ;;
        deploy)
            full_deploy
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
