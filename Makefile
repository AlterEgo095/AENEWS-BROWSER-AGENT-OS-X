# ====================================================================
# AENEWS Agent OS X - Makefile
# ====================================================================
# Quick reference:
#   make setup     - First-time setup (prerequisites, env, SSL, build, start, migrate)
#   make deploy    - Full production deployment
#   make up        - Start all services
#   make down      - Stop all services
#   make status    - Show container status
#   make logs      - Tail logs
#   make help      - Show all available targets
# ====================================================================

# --- Configuration ----------------------------------------------------
SHELL := /bin/bash
DOCKER_DIR    := docker
COMPOSE_PROD  := $(DOCKER_DIR)/docker-compose.prod.yml
COMPOSE_DEV   := $(DOCKER_DIR)/docker-compose.yml
COMPOSE_MON   := $(DOCKER_DIR)/docker-compose.monitoring.yml
SCRIPTS_DIR   := $(DOCKER_DIR)/scripts
PROJECT_NAME  := aenews-agent-os-x

# Docker compose command (supports both v1 and v2)
DC := docker compose -f $(COMPOSE_PROD)
DC_DEV := docker compose -f $(COMPOSE_DEV)
DC_MON := docker compose -f $(COMPOSE_MON)

# Colors for output (when terminal supports it)
C_RED    := \033[0;31m
C_GREEN  := \033[0;32m
C_YELLOW := \033[1;33m
C_BLUE   := \033[0;34m
C_CYAN   := \033[0;36m
C_BOLD   := \033[1m
C_RESET  := \033[0m

# --- Phony Targets ----------------------------------------------------
.PHONY: setup build up down restart logs status migrate backup restore \
        ssl test lint clean deploy help dev dev-up dev-down dev-logs \
        monitoring monitoring-down ps shell-api shell-db health \
        docker-prune check-env list-backups db-backup ssl-status npm-install

# --- Default Target ---------------------------------------------------
.DEFAULT_GOAL := help

# ====================================================================
# Primary Targets
# ====================================================================

## setup: First-time project setup (prerequisites, env, SSL, build, start, migrate)
setup: check-env
        @echo -e "$(C_CYAN)$(C_BOLD)=== AENEWS Agent OS X - First-Time Setup ===$(C_RESET)"
        @bash $(SCRIPTS_DIR)/deploy.sh setup

## build: Build all Docker images
build:
        @echo -e "$(C_BLUE)$(C_BOLD)> Building Docker images...$(C_RESET)"
        @$(DC) build --parallel
        @echo -e "$(C_GREEN)$(C_BOLD)OK Build complete$(C_RESET)"

## up: Start all production services
up:
        @echo -e "$(C_BLUE)$(C_BOLD)> Starting production services...$(C_RESET)"
        @$(DC) up -d
        @echo -e "$(C_GREEN)$(C_BOLD)OK Services started$(C_RESET)"
        @$(MAKE) status

## down: Stop all production services
down:
        @echo -e "$(C_BLUE)$(C_BOLD)> Stopping production services...$(C_RESET)"
        @$(DC) down --remove-orphans
        @echo -e "$(C_GREEN)$(C_BOLD)OK Services stopped$(C_RESET)"

## restart: Restart all production services
restart: down up

## logs: Tail service logs (usage: make logs SERVICE=api)
logs:
ifdef SERVICE
        @$(DC) logs -f --tail=100 $(SERVICE)
else
        @$(DC) logs -f --tail=50
endif

## status: Show container status and health
status:
        @echo -e "$(C_CYAN)$(C_BOLD)=== AENEWS Agent OS X - Service Status ===$(C_RESET)"
        @echo ""
        @echo -e "$(C_BOLD)Containers:$(C_RESET)"
        @docker ps -a --filter "name=aenews-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  No containers found"
        @echo ""
        @echo -e "$(C_BOLD)Health Checks:$(C_RESET)"
        @for container in aenews-postgres aenews-redis aenews-neo4j aenews-qdrant aenews-rabbitmq aenews-minio aenews-api; do \
                status=$$(docker inspect --format='{{.State.Health.Status}}' $$container 2>/dev/null || echo "not found"); \
                case $$status in \
                        healthy)   echo -e "  $(C_GREEN)OK$(C_RESET) $$container: $$status" ;; \
                        unhealthy) echo -e "  $(C_RED)!!$(C_RESET) $$container: $$status" ;; \
                        starting)  echo -e "  $(C_YELLOW)..$(C_RESET) $$container: $$status" ;; \
                        *)         echo -e "  $(C_RED)??$(C_RESET) $$container: $$status" ;; \
                esac; \
        done

## migrate: Run database migrations
migrate:
        @echo -e "$(C_BLUE)$(C_BOLD)> Running database migrations...$(C_RESET)"
        @bash $(SCRIPTS_DIR)/deploy.sh migrate

## backup: Run full backup
backup:
        @echo -e "$(C_BLUE)$(C_BOLD)> Running full backup...$(C_RESET)"
        @bash $(SCRIPTS_DIR)/backup.sh full

## restore: Interactive restore from backup
restore:
        @bash $(SCRIPTS_DIR)/backup.sh restore

## ssl: Setup SSL certificates (usage: make ssl MODE=self-signed or make ssl MODE=letsencrypt DOMAIN=x EMAIL=x)
ssl:
ifdef MODE
ifeq ($(MODE),letsencrypt)
        @bash $(SCRIPTS_DIR)/ssl-setup.sh letsencrypt $(DOMAIN) $(EMAIL)
else
        @bash $(SCRIPTS_DIR)/ssl-setup.sh self-signed $(or $(DOMAIN),aenews-agent-osx.local)
endif
else
        @bash $(SCRIPTS_DIR)/ssl-setup.sh self-signed
endif

## test: Run test suite
test:
        @echo -e "$(C_BLUE)$(C_BOLD)> Running tests...$(C_RESET)"
        @cd backend && npm test 2>/dev/null || echo -e "$(C_YELLOW)!! npm test not available - running via docker$(C_RESET)"
        @docker exec aenews-api npm test 2>/dev/null || echo -e "$(C_YELLOW)!! Could not run tests$(C_RESET)"

## lint: Run linter
lint:
        @echo -e "$(C_BLUE)$(C_BOLD)> Running linter...$(C_RESET)"
        @cd backend && npm run lint 2>/dev/null || echo -e "$(C_YELLOW)!! npm lint not available$(C_RESET)"

## clean: Clean up Docker resources and build artifacts
clean:
        @echo -e "$(C_RED)$(C_BOLD)> Cleaning up...$(C_RESET)"
        @echo -e "$(C_YELLOW)  Removing build artifacts...$(C_RESET)"
        @rm -rf backend/dist/ backend/coverage/ .tmp/ node_modules/.cache/
        @rm -rf frontend/.next/ frontend/node_modules/.cache/
        @rm -rf backend/dist/ backend/coverage/
        @echo -e "$(C_YELLOW)  Removing Docker orphans...$(C_RESET)"
        @$(DC) down --remove-orphans --rmi local 2>/dev/null || true
        @echo -e "$(C_GREEN)$(C_BOLD)OK Clean complete$(C_RESET)"

## deploy: Full production deployment
deploy: check-env
        @echo -e "$(C_CYAN)$(C_BOLD)=== AENEWS Agent OS X - Production Deploy ===$(C_RESET)"
        @bash $(SCRIPTS_DIR)/deploy.sh deploy

# ====================================================================
# Development Targets
# ====================================================================

## dev: Start development environment (infrastructure only)
dev:
        @echo -e "$(C_BLUE)$(C_BOLD)> Starting development infrastructure...$(C_RESET)"
        @$(DC_DEV) up -d
        @echo -e "$(C_GREEN)$(C_BOLD)OK Development infrastructure started$(C_RESET)"
        @echo -e "  PostgreSQL:  localhost:5432"
        @echo -e "  Redis:       localhost:6379"
        @echo -e "  Neo4j:       http://localhost:7474 (bolt://localhost:7687)"
        @echo -e "  Qdrant:      http://localhost:6333"
        @echo -e "  RabbitMQ:    http://localhost:15672 (guest/guest)"
        @echo -e "  MinIO:       http://localhost:9001 (aenews_minio / aenews_minio_secret_2024)"

## dev-up: Start dev infrastructure and backend in watch mode
dev-up: dev
        @echo -e "$(C_BLUE)$(C_BOLD)> Starting backend in development mode...$(C_RESET)"
        @cd backend && npm run start:dev

## dev-down: Stop development environment
dev-down:
        @$(DC_DEV) down --remove-orphans

## dev-logs: Tail development infrastructure logs
dev-logs:
        @$(DC_DEV) logs -f --tail=50

# ====================================================================
# Monitoring Targets
# ====================================================================

## monitoring: Start monitoring stack (Prometheus, Grafana, Jaeger)
monitoring:
        @echo -e "$(C_BLUE)$(C_BOLD)> Starting monitoring stack...$(C_RESET)"
        @$(DC_MON) up -d
        @echo -e "$(C_GREEN)$(C_BOLD)OK Monitoring stack started$(C_RESET)"
        @echo -e "  Prometheus:  http://localhost:9090"
        @echo -e "  Grafana:     http://localhost:3001 (admin/admin)"
        @echo -e "  Jaeger:      http://localhost:16686"

## monitoring-down: Stop monitoring stack
monitoring-down:
        @$(DC_MON) down --remove-orphans

# ====================================================================
# Utility Targets
# ====================================================================

## ps: Show all AENEWS docker processes (including stopped)
ps:
        @docker ps -a --filter "name=aenews-"

## shell-api: Open a shell in the API container
shell-api:
        @docker exec -it aenews-api /bin/sh

## shell-db: Open psql shell in the PostgreSQL container
shell-db:
        @docker exec -it aenews-postgres psql -U aenews -d aenews_osx

## health: Check the API health endpoint
health:
        @curl -sf http://localhost:3000/api/v1/health | python3 -m json.tool 2>/dev/null || \
                curl -sf http://localhost:3000/api/v1/health || \
                echo -e "$(C_RED)!! API health check failed$(C_RESET)"

## check-env: Verify .env file exists
check-env:
        @if [ ! -f .env ]; then \
                echo -e "$(C_YELLOW)!! No .env file found. Creating from template...$(C_RESET)"; \
                if [ -f .env.production ]; then \
                        cp .env.production .env; \
                        echo -e "$(C_GREEN)OK Created .env from .env.production$(C_RESET)"; \
                elif [ -f .env.example ]; then \
                        cp .env.example .env; \
                        echo -e "$(C_YELLOW)OK Created .env from .env.example - REVIEW BEFORE DEPLOYING$(C_RESET)"; \
                else \
                        echo -e "$(C_RED)!! No .env template found$(C_RESET)"; \
                        exit 1; \
                fi; \
        fi

## docker-prune: Remove unused Docker resources (images, volumes, networks)
docker-prune:
        @echo -e "$(C_RED)$(C_BOLD)!! This will remove all unused Docker resources$(C_RESET)"
        @read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
        @docker system prune -a --volumes -f
        @echo -e "$(C_GREEN)$(C_BOLD)OK Docker resources pruned$(C_RESET)"

## list-backups: List available backups
list-backups:
        @bash $(SCRIPTS_DIR)/backup.sh list

## db-backup: Run database-only backup (faster than full)
db-backup:
        @bash $(SCRIPTS_DIR)/backup.sh db-only

## ssl-status: Check SSL certificate status
ssl-status:
        @bash $(SCRIPTS_DIR)/ssl-setup.sh status

## npm-install: Install npm dependencies for backend and frontend
npm-install:
        @echo -e "$(C_BLUE)$(C_BOLD)> Installing backend dependencies...$(C_RESET)"
        @cd backend && npm install
        @echo -e "$(C_BLUE)$(C_BOLD)> Installing frontend dependencies...$(C_RESET)"
        @cd frontend && npm install
        @echo -e "$(C_GREEN)$(C_BOLD)OK All dependencies installed$(C_RESET)"

# ====================================================================
# Help Target
# ====================================================================

## help: Show this help message
help:
        @echo ""
        @echo -e "$(C_CYAN)$(C_BOLD)====================================================================$(C_RESET)"
        @echo -e "$(C_CYAN)$(C_BOLD)  AENEWS Agent OS X - Makefile Commands$(C_RESET)"
        @echo -e "$(C_CYAN)$(C_BOLD)====================================================================$(C_RESET)"
        @echo ""
        @echo -e "$(C_BOLD)  Primary Commands:$(C_RESET)"
        @grep -E '^## [a-z]' $(MAKEFILE_LIST) | sed 's/^## //' | awk -F': ' '{ printf "    $(C_GREEN)%-16s$(C_RESET) %s\n", $$1, $$2 }'
        @echo ""
        @echo -e "$(C_BOLD)  Development:$(C_RESET)"
        @echo -e "    $(C_GREEN)dev$(C_RESET)              Start infrastructure only (for local dev)"
        @echo -e "    $(C_GREEN)dev-up$(C_RESET)           Start infra + backend in watch mode"
        @echo -e "    $(C_GREEN)dev-down$(C_RESET)         Stop development environment"
        @echo -e "    $(C_GREEN)dev-logs$(C_RESET)         Tail development infrastructure logs"
        @echo ""
        @echo -e "$(C_BOLD)  Monitoring:$(C_RESET)"
        @echo -e "    $(C_GREEN)monitoring$(C_RESET)       Start Prometheus, Grafana, Jaeger"
        @echo -e "    $(C_GREEN)monitoring-down$(C_RESET)  Stop monitoring stack"
        @echo ""
        @echo -e "$(C_BOLD)  Utilities:$(C_RESET)"
        @echo -e "    $(C_GREEN)ps$(C_RESET)               List all AENEWS containers"
        @echo -e "    $(C_GREEN)shell-api$(C_RESET)        Shell into API container"
        @echo -e "    $(C_GREEN)shell-db$(C_RESET)         psql shell into PostgreSQL"
        @echo -e "    $(C_GREEN)health$(C_RESET)           Check API health endpoint"
        @echo -e "    $(C_GREEN)npm-install$(C_RESET)      Install all npm dependencies"
        @echo -e "    $(C_GREEN)docker-prune$(C_RESET)     Remove unused Docker resources"
        @echo -e "    $(C_GREEN)list-backups$(C_RESET)     List available backups"
        @echo -e "    $(C_GREEN)db-backup$(C_RESET)        Run database-only backup"
        @echo -e "    $(C_GREEN)ssl-status$(C_RESET)       Check SSL certificate status"
        @echo ""
        @echo -e "$(C_BOLD)  Variables:$(C_RESET)"
        @echo -e "    SERVICE=api           Filter logs to a specific service"
        @echo -e "    MODE=self-signed      SSL mode for make ssl"
        @echo -e "    DOMAIN=example.com    Domain for SSL"
        @echo -e "    EMAIL=admin@x.com     Email for Let's Encrypt"
        @echo ""
        @echo -e "$(C_BOLD)  Examples:$(C_RESET)"
        @echo -e "    make logs SERVICE=api"
        @echo -e "    make ssl MODE=letsencrypt DOMAIN=aenews.example.com EMAIL=admin@example.com"
        @echo -e "    make backup"
        @echo ""
