# AENEWS Agent OS X — Deployment Runbook

## Prerequisites

### VPS Requirements
- **OS**: Ubuntu 22.04+ or Debian 12+
- **RAM**: Minimum 4GB (8GB recommended for all services)
- **Storage**: Minimum 40GB SSD
- **CPU**: Minimum 2 vCPUs (4 recommended)
- **Network**: Public IP with ports 80/443 open

### Software Requirements
- Docker Engine 24+
- Docker Compose v2+
- Git
- Make (optional)

## Quick Deploy (One Command)

```bash
# Clone the repository
git clone https://github.com/AlterEgo095/AENEWS-BROWSER-AGENT-OS-X.git
cd AENEWS-BROWSER-AGENT-OS-X

# Run the deployment
make deploy
```

## Step-by-Step Deployment

### 1. Initial VPS Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose v2 (comes with Docker above)
docker compose version

# Clone the repository
git clone https://github.com/AlterEgo095/AENEWS-BROWSER-AGENT-OS-X.git
cd AENEWS-BROWSER-AGENT-OS-X
```

### 2. Environment Configuration

```bash
# Copy the production template
cp docker/.env.production backend/.env

# Edit with your real values
nano backend/.env
```

**Critical variables to set:**
- `DB_PASSWORD` — PostgreSQL password
- `REDIS_PASSWORD` — Redis password
- `NEO4J_PASSWORD` — Neo4j password
- `RABBITMQ_PASSWORD` — RabbitMQ password
- `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — MinIO credentials
- `JWT_SECRET` — Must be a random 64-byte hex string
- `ENCRYPTION_KEY` — Must be exactly 32 characters
- `OPENAI_API_KEY` — Your OpenAI API key
- `APP_DOMAIN` — Your domain name

**Quick secret generation:**
```bash
# Generate all secrets at once
echo "DB_PASSWORD=$(openssl rand -hex 32)"
echo "REDIS_PASSWORD=$(openssl rand -hex 32)"
echo "NEO4J_PASSWORD=$(openssl rand -hex 32)"
echo "RABBITMQ_PASSWORD=$(openssl rand -hex 32)"
echo "MINIO_ACCESS_KEY=$(openssl rand -hex 16)"
echo "MINIO_SECRET_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
```

### 3. SSL Certificate Setup

```bash
# Option A: Self-signed (for testing)
make ssl MODE=self-signed DOMAIN=localhost

# Option B: Let's Encrypt (for production)
make ssl MODE=letsencrypt DOMAIN=your-domain.com EMAIL=admin@your-domain.com
```

### 4. Build & Start Services

```bash
# Build all Docker images
make build

# Start all services
make up

# Check service status
make status
```

### 5. Run Database Migrations

```bash
# Run TypeORM migrations
make migrate
```

### 6. Verify Deployment

```bash
# Health check
curl https://your-domain.com/health

# API check
curl https://your-domain.com/api/v1/health

# Check logs
make logs
```

## GitHub Actions CI/CD Setup

### Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions, and add:

| Secret | Description | Example |
|--------|-------------|---------|
| `VPS_HOST` | VPS public IP or hostname | `123.45.67.89` |
| `VPS_USER` | SSH username | `ubuntu` |
| `VPS_SSH_KEY` | Full private SSH key content | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT` | SSH port | `22` |
| `DOCKER_USERNAME` | Docker Hub username | `yourusername` |
| `DOCKER_PASSWORD` | Docker Hub access token | `dckr_pat_...` |

### Deployment Flow

1. Push to `main` branch triggers automatic deployment
2. CI pipeline runs: lint → test → e2e → build
3. If all checks pass, Docker images are built and pushed
4. SSH into VPS, pull new images, restart services
5. Health check confirms successful deployment

## Backup & Restore

### Create Backup
```bash
make backup
# or
docker/scripts/backup.sh full
```

### Restore from Backup
```bash
make restore
# or
docker/scripts/backup.sh restore
```

### List Backups
```bash
make list-backups
```

Backups are stored in `./backups/` and rotated automatically (last 7 kept).

## Monitoring

### Start Monitoring Stack
```bash
make monitoring
```

This starts:
- **Prometheus** on port 9090 (metrics scraping)
- **Grafana** on port 3001 (dashboards)
- **Jaeger** on port 16686 (distributed tracing)

### Useful URLs
- Grafana: `http://your-vps:3001` (admin/admin)
- Prometheus: `http://your-vps:9090`
- Jaeger: `http://your-vps:16686`
- RabbitMQ Management: `http://your-vps:15672`
- MinIO Console: `https://your-domain.com/minio/`

## Troubleshooting

### Services won't start
```bash
# Check logs for specific service
docker compose -f docker/docker-compose.prod.yml logs api
docker compose -f docker/docker-compose.prod.yml logs nginx

# Restart a specific service
docker compose -f docker/docker-compose.prod.yml restart api
```

### Database connection issues
```bash
# Check PostgreSQL is healthy
docker compose -f docker/docker-compose.prod.yml ps postgres

# Connect to PostgreSQL
make shell-db
# Then: \l to list databases, \dt to list tables
```

### SSL certificate issues
```bash
# Check certificate status
make ssl-status

# Renew Let's Encrypt certificate
docker/scripts/ssl-setup.sh letsencrypt your-domain.com admin@your-domain.com
```

### Out of disk space
```bash
# Clean up Docker resources
make docker-prune

# Check disk usage
df -h
du -sh /var/lib/docker/volumes/
```

## Architecture Overview

```
Internet → [Nginx :443] → [Frontend :3001]
                          → [API :3000] → [PostgreSQL :5432]
                                         → [Redis :6379]
                                         → [Neo4j :7687]
                                         → [Qdrant :6333]
                                         → [RabbitMQ :5672]
                                         → [MinIO :9000]
```

## Service Resource Requirements

| Service | Min RAM | Recommended RAM | Min CPU |
|---------|---------|-----------------|---------|
| API | 512MB | 1GB | 0.5 |
| Frontend | 128MB | 256MB | 0.25 |
| Nginx | 64MB | 128MB | 0.25 |
| PostgreSQL | 256MB | 1GB | 0.5 |
| Redis | 256MB | 512MB | 0.25 |
| Neo4j | 512MB | 1GB | 0.5 |
| Qdrant | 256MB | 512MB | 0.25 |
| RabbitMQ | 256MB | 512MB | 0.25 |
| MinIO | 128MB | 256MB | 0.25 |
| **Total** | **2.3GB** | **4.2GB** | **3.0** |

## Rollback Procedure

1. SSH into VPS
2. Find the previous working image tag
3. Update docker-compose to use the previous tag
4. Restart services
5. Verify health

```bash
# List available image tags
docker images | grep aenews

# Rollback to previous version
docker compose -f docker/docker-compose.prod.yml down
# Edit image tag in compose file or .env
docker compose -f docker/docker-compose.prod.yml up -d
```
