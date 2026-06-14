#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# AENEWS Agent OS X — SSL Certificate Setup Script
# ══════════════════════════════════════════════════════════════════════
# Usage: ./ssl-setup.sh [self-signed|letsencrypt DOMAIN EMAIL]
#
# Supports:
#   - Self-signed certificates (for dev/staging)
#   - Let's Encrypt via certbot with webroot (for production)
#
# Certificates are placed in docker/nginx/ssl/ for nginx to use.
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
SSL_DIR="${DOCKER_DIR}/nginx/ssl"
CERTBOT_WEBROOT="${DOCKER_DIR}/nginx/certbot-webroot"
DAYS_SELF_SIGNED=365
RSA_KEY_SIZE=2048

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
        return 1
    fi
}

# ─── Create SSL Directory ──────────────────────────────────────────────
ensure_ssl_dir() {
    mkdir -p "${SSL_DIR}"
    chmod 700 "${SSL_DIR}"
}

# ─── Backup Existing Certs ─────────────────────────────────────────────
backup_existing_certs() {
    if [ -f "${SSL_DIR}/fullchain.pem" ] || [ -f "${SSL_DIR}/privkey.pem" ]; then
        local backup_ts
        backup_ts="$(date +%Y%m%d_%H%M%S)"
        local backup_dir="${SSL_DIR}/backup_${backup_ts}"
        log_step "Backing up existing certificates to ${backup_dir}"
        mkdir -p "${backup_dir}"

        # Copy all cert files
        for f in "${SSL_DIR}"/*.pem "${SSL_DIR}"/*.csr "${SSL_DIR}"/*.key; do
            [ -f "$f" ] && cp "$f" "${backup_dir}/"
        done

        log_success "Existing certificates backed up"
    fi
}

# ─── Self-Signed Certificate ───────────────────────────────────────────
generate_self_signed() {
    log_header "Generating Self-Signed SSL Certificate"

    check_command openssl || {
        log_error "openssl is required. Install it with: brew install openssl / apt-get install openssl"
        exit 1
    }

    ensure_ssl_dir
    backup_existing_certs

    local domain="${1:-aenews-agent-osx.local}"
    log_info "Domain/hostname: ${domain}"
    log_info "Certificate validity: ${DAYS_SELF_SIGNED} days"
    log_info "RSA key size: ${RSA_KEY_SIZE} bits"

    # Generate private key and CSR
    log_step "Generating private key and certificate signing request..."
    openssl req -new \
        -newkey "rsa:${RSA_KEY_SIZE}" \
        -nodes \
        -keyout "${SSL_DIR}/privkey.pem" \
        -out "${SSL_DIR}/request.csr" \
        -subj "/C=US/ST=State/L=City/O=AENEWS-Agent-OS-X/CN=${domain}" \
        2>/dev/null

    # Generate self-signed certificate with SAN
    log_step "Generating self-signed certificate with Subject Alternative Names..."

    # Create a temporary extensions config
    local ext_file
    ext_file=$(mktemp)
    cat > "${ext_file}" <<EOF
[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${domain}
DNS.2 = localhost
DNS.3 = *.${domain}
DNS.4 = *.aenews.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    openssl x509 -req \
        -days "${DAYS_SELF_SIGNED}" \
        -in "${SSL_DIR}/request.csr" \
        -signkey "${SSL_DIR}/privkey.pem" \
        -out "${SSL_DIR}/fullchain.pem" \
        -extfile "${ext_file}" \
        -extensions v3_req \
        2>/dev/null

    rm -f "${ext_file}"

    # Set proper permissions
    chmod 600 "${SSL_DIR}/privkey.pem"
    chmod 644 "${SSL_DIR}/fullchain.pem"
    rm -f "${SSL_DIR}/request.csr"

    # Verify the certificate
    log_step "Verifying generated certificate..."
    local cert_info
    cert_info=$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -subject -dates 2>/dev/null)
    log_info "Subject: $(echo "$cert_info" | grep subject | cut -d= -f2-)"
    log_info "Not Before: $(echo "$cert_info" | grep notBefore | cut -d= -f2-)"
    log_info "Not After: $(echo "$cert_info" | grep notAfter | cut -d= -f2-)"

    # Verify key matches cert
    local key_mod cert_mod
    key_mod=$(openssl rsa -noout -modulus -in "${SSL_DIR}/privkey.pem" 2>/dev/null | openssl md5)
    cert_mod=$(openssl x509 -noout -modulus -in "${SSL_DIR}/fullchain.pem" 2>/dev/null | openssl md5)

    if [ "$key_mod" = "$cert_mod" ]; then
        log_success "Private key matches certificate"
    else
        log_error "Private key does NOT match certificate!"
        exit 1
    fi

    log_success "Self-signed SSL certificate generated successfully!"
    echo ""
    log_warning "Self-signed certificates will show browser security warnings."
    log_info "For production, use Let's Encrypt: ./ssl-setup.sh letsencrypt YOUR_DOMAIN your@email.com"
    log_info "Certificate location: ${SSL_DIR}/"
}

# ─── Let's Encrypt Certificate ─────────────────────────────────────────
generate_letsencrypt() {
    local domain="${1:-}"
    local email="${2:-}"

    if [ -z "$domain" ] || [ -z "$email" ]; then
        log_error "Domain and email are required for Let's Encrypt."
        echo ""
        echo "Usage: $0 letsencrypt DOMAIN EMAIL"
        echo "Example: $0 letsencrypt aenews.example.com admin@example.com"
        exit 1
    fi

    log_header "Generating Let's Encrypt SSL Certificate"
    log_info "Domain: ${domain}"
    log_info "Email: ${email}"

    # Check if certbot is installed
    if ! check_command certbot; then
        log_warning "certbot is not installed. Attempting to install..."

        if [[ "$(uname)" == "Darwin" ]]; then
            log_step "Installing certbot via Homebrew..."
            brew install certbot 2>/dev/null || {
                log_error "Failed to install certbot via Homebrew."
                log_info "Install manually: brew install certbot"
                exit 1
            }
        else
            log_step "Installing certbot via apt..."
            sudo apt-get update -qq
            sudo apt-get install -y certbot python3-certbot-nginx 2>/dev/null || {
                log_error "Failed to install certbot via apt."
                log_info "Install manually: sudo apt-get install certbot"
                exit 1
            }
        fi
        log_success "certbot installed successfully"
    fi

    ensure_ssl_dir
    backup_existing_certs

    # Create certbot webroot directory
    mkdir -p "${CERTBOT_WEBROOT}"
    log_info "Certbot webroot: ${CERTBOT_WEBROOT}"

    # Check if nginx is running and serving on port 80
    local nginx_running=false
    if docker ps -q -f "name=aenews-nginx" -f "status=running" | grep -q . 2>/dev/null; then
        nginx_running=true
    fi

    # Check if port 80 is available
    if ! curl -sf http://localhost/.well-known/acme-challenge/ 2>/dev/null; then
        log_warning "Port 80 does not appear to be serving the ACME challenge path."
        log_info "Ensure nginx is running with the .well-known/acme-challenge/ location configured."

        if [ "$nginx_running" = false ]; then
            log_step "Starting a temporary HTTP server for the ACME challenge..."

            # Use Python's built-in HTTP server as temporary webroot server
            (
                cd "${CERTBOT_WEBROOT}" || exit
                python3 -m http.server 80 &
                local temp_pid=$!
                sleep 2
                echo "$temp_pid" > /tmp/aenews_certbot_httpd.pid
            ) 2>/dev/null || {
                log_error "Could not start temporary HTTP server on port 80."
                log_info "Port 80 may be in use. Stop conflicting services and try again."
                exit 1
            }
            log_info "Temporary HTTP server started for ACME challenge"
        fi
    fi

    # Run certbot
    log_step "Running certbot for domain ${domain}..."
    log_info "This will verify domain ownership via HTTP-01 challenge."

    local certbot_args=(
        certonly
        --webroot
        --webroot-path="${CERTBOT_WEBROOT}"
        --domain "${domain}"
        --email "${email}"
        --agree-tos
        --non-interactive
        --no-eff-email
    )

    # Add staging flag if requested
    if [ "${3:-}" = "--staging" ]; then
        certbot_args+=(--staging)
        log_info "Using Let's Encrypt staging server (test certificates)"
    fi

    sudo certbot "${certbot_args[@]}" 2>/dev/null

    local cert_path="/etc/letsencrypt/live/${domain}"

    if [ -f "${cert_path}/fullchain.pem" ] && [ -f "${cert_path}/privkey.pem" ]; then
        log_step "Copying certificates to nginx SSL directory..."

        sudo cp "${cert_path}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
        sudo cp "${cert_path}/privkey.pem" "${SSL_DIR}/privkey.pem"

        # Also copy chain cert if available
        if [ -f "${cert_path}/chain.pem" ]; then
            sudo cp "${cert_path}/chain.pem" "${SSL_DIR}/chain.pem"
        fi

        # Fix permissions
        sudo chmod 644 "${SSL_DIR}/fullchain.pem"
        sudo chmod 600 "${SSL_DIR}/privkey.pem"
        sudo chown "$(id -u):$(id -g)" "${SSL_DIR}/fullchain.pem" "${SSL_DIR}/privkey.pem"

        log_success "Let's Encrypt certificates installed!"
    else
        log_error "Certificate files not found at expected path: ${cert_path}/"
        log_info "Check certbot output above for errors."
        exit 1
    fi

    # Clean up temporary HTTP server
    if [ -f /tmp/aenews_certbot_httpd.pid ]; then
        kill "$(cat /tmp/aenews_certbot_httpd.pid)" 2>/dev/null || true
        rm -f /tmp/aenews_certbot_httpd.pid
        log_info "Temporary HTTP server stopped"
    fi

    # Verify the certificate
    log_step "Verifying installed certificate..."
    local cert_info
    cert_info=$(openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -subject -issuer -dates 2>/dev/null)
    log_info "Subject: $(echo "$cert_info" | grep subject | cut -d= -f2-)"
    log_info "Issuer: $(echo "$cert_info" | grep issuer | cut -d= -f2-)"
    log_info "Not Before: $(echo "$cert_info" | grep notBefore | cut -d= -f2-)"
    log_info "Not After: $(echo "$cert_info" | grep notAfter | cut -d= -f2-)"

    # Setup auto-renewal cron job
    setup_renewal_cron "${domain}"

    log_success "Let's Encrypt SSL certificate setup complete!"
    echo ""
    log_info "Certificate location: ${SSL_DIR}/"
    log_info "Auto-renewal cron job has been configured."
    log_info "To manually renew: sudo certbot renew"
    log_info "To test renewal: sudo certbot renew --dry-run"
}

# ─── Setup Auto-Renewal Cron ──────────────────────────────────────────
setup_renewal_cron() {
    local domain="$1"
    local cron_marker="# AENEWS-SSL-RENEWAL-${domain}"

    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "${cron_marker}"; then
        log_info "Auto-renewal cron job already exists for ${domain}"
        return 0
    fi

    log_step "Setting up auto-renewal cron job..."

    # Create a renewal script
    local renewal_script="${SCRIPT_DIR}/ssl-renew.sh"
    cat > "${renewal_script}" <<RENEW_SCRIPT
#!/usr/bin/env bash
# Auto-generated SSL renewal script for ${domain}
# This script is called by cron to renew Let's Encrypt certificates.

set -euo pipefail

SSL_DIR="${SSL_DIR}"
DOMAIN="${domain}"
LOG_FILE="${PROJECT_ROOT}/logs/ssl-renewal.log"

mkdir -p "$(dirname "${LOG_FILE}")"

echo "\$(date -Iseconds) — Starting SSL renewal check" >> "\${LOG_FILE}"

# Attempt renewal
if sudo certbot renew --quiet 2>> "\${LOG_FILE}"; then
    echo "\$(date -Iseconds) — Renewal check completed" >> "\${LOG_FILE}"

    # Check if certificates were actually renewed
    if sudo certbot certificates 2>/dev/null | grep -q "EXPIRY"; then
        # Copy renewed certificates
        CERT_PATH="/etc/letsencrypt/live/\${DOMAIN}"
        if [ -f "\${CERT_PATH}/fullchain.pem" ]; then
            sudo cp "\${CERT_PATH}/fullchain.pem" "\${SSL_DIR}/fullchain.pem"
            sudo cp "\${CERT_PATH}/privkey.pem" "\${SSL_DIR}/privkey.pem"
            sudo chmod 644 "\${SSL_DIR}/fullchain.pem"
            sudo chmod 600 "\${SSL_DIR}/privkey.pem"
            sudo chown "$(id -u):$(id -g)" "\${SSL_DIR}/fullchain.pem" "\${SSL_DIR}/privkey.pem"

            # Reload nginx
            docker exec aenews-nginx nginx -s reload 2>/dev/null || true

            echo "\$(date -Iseconds) — Certificates renewed and nginx reloaded" >> "\${LOG_FILE}"
        fi
    fi
else
    echo "\$(date -Iseconds) — Renewal check failed" >> "\${LOG_FILE}"
fi
RENEW_SCRIPT

    chmod +x "${renewal_script}"

    # Add cron job (run at 2:30 AM on Mondays and Thursdays)
    (crontab -l 2>/dev/null | grep -v "${cron_marker}"; echo "${cron_marker}") | crontab - 2>/dev/null || true
    (crontab -l 2>/dev/null; echo "30 2 * * 1,4 ${renewal_script} ${cron_marker}") | crontab - 2>/dev/null || {
        log_warning "Could not add cron job automatically."
        log_info "Add this line to your crontab manually:"
        log_info "  30 2 * * 1,4 ${renewal_script}"
    }

    log_success "Auto-renewal cron job configured (runs Mon/Thu at 2:30 AM)"
}

# ─── Check Certificate Status ──────────────────────────────────────────
check_cert_status() {
    log_header "SSL Certificate Status"

    if [ ! -f "${SSL_DIR}/fullchain.pem" ]; then
        log_warning "No SSL certificate found at ${SSL_DIR}/"
        return 0
    fi

    local cert_file="${SSL_DIR}/fullchain.pem"
    local subject issuer not_before not_after days_remaining

    subject=$(openssl x509 -in "${cert_file}" -noout -subject 2>/dev/null | cut -d= -f2-)
    issuer=$(openssl x509 -in "${cert_file}" -noout -issuer 2>/dev/null | cut -d= -f2-)
    not_before=$(openssl x509 -in "${cert_file}" -noout -startdate 2>/dev/null | cut -d= -f2-)
    not_after=$(openssl x509 -in "${cert_file}" -noout -enddate 2>/dev/null | cut -d= -f2-)

    # Calculate days remaining
    local expiry_epoch now_epoch
    if [[ "$(uname)" == "Darwin" ]]; then
        expiry_epoch=$(date -j -f "%b %d %T %Y %Z" "${not_after}" "+%s" 2>/dev/null || echo "0")
    else
        expiry_epoch=$(date -d "${not_after}" "+%s" 2>/dev/null || echo "0")
    fi
    now_epoch=$(date "+%s")
    days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

    echo -e "${BOLD}Certificate Details:${NC}"
    echo -e "  File:     ${SSL_DIR}/fullchain.pem"
    echo -e "  Subject:  ${subject}"
    echo -e "  Issuer:   ${issuer}"
    echo -e "  Valid:    ${not_before} → ${not_after}"

    if [ "${days_remaining}" -le 0 ]; then
        echo -e "  Status:   ${RED}${BOLD}EXPIRED${NC} (${days_remaining} days)"
    elif [ "${days_remaining}" -le 30 ]; then
        echo -e "  Status:   ${YELLOW}${BOLD}EXPIRING SOON${NC} (${days_remaining} days remaining)"
    else
        echo -e "  Status:   ${GREEN}${BOLD}VALID${NC} (${days_remaining} days remaining)"
    fi

    # Check if it's self-signed
    if echo "$issuer" | grep -qi "AENEWS\|self-signed\|aenews-agent"; then
        echo -e "  Type:     ${YELLOW}Self-signed${NC} (browser warnings expected)"
    elif echo "$issuer" | grep -qi "Let's Encrypt"; then
        echo -e "  Type:     ${GREEN}Let's Encrypt${NC} (trusted)"
    else
        echo -e "  Type:     Other (${issuer})"
    fi

    # Check key/cert match
    if [ -f "${SSL_DIR}/privkey.pem" ]; then
        local key_mod cert_mod
        key_mod=$(openssl rsa -noout -modulus -in "${SSL_DIR}/privkey.pem" 2>/dev/null | openssl md5)
        cert_mod=$(openssl x509 -noout -modulus -in "${SSL_DIR}/fullchain.pem" 2>/dev/null | openssl md5)
        if [ "$key_mod" = "$cert_mod" ]; then
            echo -e "  Key Match: ${GREEN}✓ Key matches certificate${NC}"
        else
            echo -e "  Key Match: ${RED}✗ Key does NOT match certificate${NC}"
        fi
    fi

    # Check certbot renewal status if Let's Encrypt
    if command -v certbot &>/dev/null; then
        echo ""
        echo -e "${BOLD}Certbot Status:${NC}"
        sudo certbot certificates 2>/dev/null | grep -A5 "Domains:" || echo "  No Let's Encrypt certificates found"
    fi
}

# ─── Usage ─────────────────────────────────────────────────────────────
usage() {
    echo -e "${BOLD}AENEWS Agent OS X — SSL Certificate Setup${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  self-signed [DOMAIN]                    Generate self-signed certificate"
    echo "  letsencrypt DOMAIN EMAIL [--staging]    Obtain Let's Encrypt certificate"
    echo "  status                                  Check current certificate status"
    echo ""
    echo "Examples:"
    echo "  $0 self-signed                                # Self-signed for localhost"
    echo "  $0 self-signed aenews.example.com             # Self-signed for a domain"
    echo "  $0 letsencrypt aenews.example.com admin@ex.com # Let's Encrypt for production"
    echo "  $0 letsencrypt aenews.example.com admin@ex.com --staging  # Test with staging"
    echo "  $0 status                                     # Check certificate info"
}

# ─── Main ──────────────────────────────────────────────────────────────
main() {
    local command="${1:-}"

    case "$command" in
        self-signed)
            generate_self_signed "${2:-aenews-agent-osx.local}"
            ;;
        letsencrypt|le)
            if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
                log_error "Domain and email are required for Let's Encrypt."
                usage
                exit 1
            fi
            generate_letsencrypt "$2" "$3" "${4:-}"
            ;;
        status)
            check_cert_status
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
