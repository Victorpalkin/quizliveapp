#!/bin/bash

# Cloud Armor Security Policy Setup Script for Zivo
# This script applies security rules one by one with testing pauses
#
# Usage:
#   ./cloud-armor-setup.sh                    # Interactive mode (pause after each rule)
#   ./cloud-armor-setup.sh --auto             # Auto mode (no pauses)
#   ./cloud-armor-setup.sh --delete           # Delete all rules and policy
#   ./cloud-armor-setup.sh --status           # Show current rules status
#
# Environment Variables:
#   GOOGLE_CLOUD_PROJECT=your-project-id      # Override default project

set -e

# =============================================================================
# Configuration
# =============================================================================
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-gquiz-prod-3r5f}"  # Set via env or default
POLICY_NAME="default-security-policy-for-backend-service-gquiz-prod"
BACKEND_SERVICE="gquiz-prod"  # Already attached to this backend

# Set gcloud project for all commands
gcloud config set project "$PROJECT_ID" 2>/dev/null || true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

wait_for_test() {
    if [ "$AUTO_MODE" != "true" ]; then
        echo ""
        echo -e "${YELLOW}>>> Test your application now: https://quiz.palkin.nl/host ${NC}"
        echo -e "${YELLOW}>>> Press ENTER to continue to next rule, or 'r' to rollback this rule${NC}"
        read -r response
        if [ "$response" = "r" ] || [ "$response" = "R" ]; then
            return 1
        fi
    fi
    return 0
}

check_policy_exists() {
    gcloud compute security-policies describe "$POLICY_NAME" --quiet 2>/dev/null
    return $?
}

# =============================================================================
# Rule Application Functions
# =============================================================================

create_policy() {
    print_header "Creating Security Policy: $POLICY_NAME"

    if check_policy_exists; then
        print_warning "Policy already exists, skipping creation"
    else
        gcloud compute security-policies create "$POLICY_NAME" \
            --description="Security policy for Zivo quiz application"
        print_success "Policy created"
    fi

    # Enable verbose logging
    gcloud compute security-policies update "$POLICY_NAME" \
        --log-level=VERBOSE
    print_success "Verbose logging enabled"
}

apply_rule() {
    local priority=$1
    local description=$2
    local expression=$3
    local action=$4
    local extra_args=$5

    print_header "Rule $priority: $description"

    # Check if rule exists
    if gcloud compute security-policies rules describe "$priority" \
        --security-policy="$POLICY_NAME" --quiet 2>/dev/null; then
        print_warning "Rule $priority exists, updating..."
        gcloud compute security-policies rules update "$priority" \
            --security-policy="$POLICY_NAME" \
            --expression="$expression" \
            --action="$action" \
            $extra_args \
            --description="$description"
    else
        gcloud compute security-policies rules create "$priority" \
            --security-policy="$POLICY_NAME" \
            --expression="$expression" \
            --action="$action" \
            $extra_args \
            --description="$description"
    fi

    print_success "Rule $priority applied"
}

delete_rule() {
    local priority=$1

    if gcloud compute security-policies rules describe "$priority" \
        --security-policy="$POLICY_NAME" --quiet 2>/dev/null; then
        gcloud compute security-policies rules delete "$priority" \
            --security-policy="$POLICY_NAME" --quiet
        print_success "Rule $priority deleted"
    else
        print_warning "Rule $priority doesn't exist"
    fi
}

# =============================================================================
# Rule Definitions
# =============================================================================

apply_static_assets_bypass() {
    # Note: Cloud Armor limits to 5 expressions per rule, so we split into multiple rules
    # Rule 500: Images
    apply_rule 500 \
        "Bypass WAF for image assets" \
        "request.path.endsWith('.png') || request.path.endsWith('.jpg') || request.path.endsWith('.jpeg') || request.path.endsWith('.gif') || request.path.endsWith('.svg')" \
        "allow"

    # Rule 502: More images and icons
    apply_rule 502 \
        "Bypass WAF for icons and webp" \
        "request.path.endsWith('.webp') || request.path.endsWith('.ico') || request.path.endsWith('.avif')" \
        "allow"

    # Rule 503: CSS/JS
    apply_rule 503 \
        "Bypass WAF for CSS and JS" \
        "request.path.endsWith('.css') || request.path.endsWith('.js') || request.path.endsWith('.mjs')" \
        "allow"

    # Rule 504: Fonts
    apply_rule 504 \
        "Bypass WAF for fonts" \
        "request.path.endsWith('.woff') || request.path.endsWith('.woff2') || request.path.endsWith('.ttf') || request.path.endsWith('.eot')" \
        "allow"

    # Rule 505: Other static files and Next.js
    apply_rule 505 \
        "Bypass WAF for maps, json, and Next.js routes" \
        "request.path.endsWith('.map') || request.path.endsWith('.json') || request.path.startsWith('/_next/') || request.path.startsWith('/__nextjs')" \
        "allow"
}

apply_favicon_bypass() {
    apply_rule 501 \
        "Allow favicon and manifest" \
        "request.path.startsWith('/favicon') || request.path.startsWith('/manifest') || request.path == '/robots.txt' || request.path.startsWith('/sitemap')" \
        "allow"
}

apply_sqli_protection() {
    apply_rule 1000 \
        "SQL Injection protection (sensitivity 1)" \
        "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_xss_protection() {
    # XSS protection - start with sensitivity 1 (most conservative, fewest false positives)
    # If issues occur, we can add opt_out_rule_ids with the -xss suffix
    apply_rule 1001 \
        "XSS protection (sensitivity 1)" \
        "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_lfi_protection() {
    apply_rule 1002 \
        "Local File Inclusion protection" \
        "evaluatePreconfiguredWaf('lfi-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_rfi_protection() {
    apply_rule 1003 \
        "Remote File Inclusion protection" \
        "evaluatePreconfiguredWaf('rfi-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_rce_protection() {
    apply_rule 1004 \
        "Remote Code Execution protection" \
        "evaluatePreconfiguredWaf('rce-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_method_enforcement() {
    apply_rule 1005 \
        "HTTP Method Enforcement" \
        "evaluatePreconfiguredWaf('methodenforcement-v33-stable')" \
        "deny-403"
}

apply_scanner_detection() {
    apply_rule 1006 \
        "Scanner Detection (sensitivity 1)" \
        "evaluatePreconfiguredWaf('scannerdetection-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_protocol_attack_protection() {
    apply_rule 1007 \
        "Protocol Attack protection" \
        "evaluatePreconfiguredWaf('protocolattack-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_session_fixation_protection() {
    apply_rule 1008 \
        "Session Fixation protection" \
        "evaluatePreconfiguredWaf('sessionfixation-v33-stable', {'sensitivity': 1})" \
        "deny-403"
}

apply_general_rate_limit() {
    apply_rule 2000 \
        "General rate limit: 100 req/min per IP" \
        "true" \
        "throttle" \
        "--rate-limit-threshold-count=100 --rate-limit-threshold-interval-sec=60 --conform-action=allow --exceed-action=deny-429 --enforce-on-key=IP"
}

apply_join_rate_limit() {
    apply_rule 2001 \
        "Join page rate limit: 20 req/min (prevent PIN brute force)" \
        "request.path.startsWith('/join')" \
        "throttle" \
        "--rate-limit-threshold-count=20 --rate-limit-threshold-interval-sec=60 --conform-action=allow --exceed-action=deny-429 --enforce-on-key=IP"
}

apply_auth_rate_limit() {
    apply_rule 2002 \
        "Auth pages rate limit: 10 req/min" \
        "request.path.startsWith('/login') || request.path.startsWith('/register') || request.path.startsWith('/forgot-password')" \
        "throttle" \
        "--rate-limit-threshold-count=10 --rate-limit-threshold-interval-sec=60 --conform-action=allow --exceed-action=deny-429 --enforce-on-key=IP"
}

apply_block_scrapers() {
    apply_rule 4000 \
        "Block common scraping tools" \
        "has(request.headers['user-agent']) && (request.headers['user-agent'].lower().contains('curl') || request.headers['user-agent'].lower().contains('wget') || request.headers['user-agent'].lower().contains('scrapy'))" \
        "deny-403"
}

apply_block_empty_ua() {
    apply_rule 4001 \
        "Block requests without user agent" \
        "!has(request.headers['user-agent']) || request.headers['user-agent'] == ''" \
        "deny-403"
}

attach_to_backend() {
    if [ -n "$BACKEND_SERVICE" ]; then
        print_header "Attaching Policy to Backend Service"
        gcloud compute backend-services update "$BACKEND_SERVICE" \
            --global \
            --security-policy="$POLICY_NAME"
        print_success "Policy attached to $BACKEND_SERVICE"
    else
        print_warning "No backend service specified, skipping attachment"
        print_info "To attach manually, run:"
        echo "  gcloud compute backend-services update YOUR-BACKEND-SERVICE --global --security-policy=$POLICY_NAME"
    fi
}

# =============================================================================
# Main Execution Modes
# =============================================================================

show_status() {
    print_header "Current Security Policy Status"

    if ! check_policy_exists; then
        print_error "Policy '$POLICY_NAME' does not exist"
        exit 1
    fi

    echo ""
    echo "Policy: $POLICY_NAME"
    echo ""
    gcloud compute security-policies rules list \
        --security-policy="$POLICY_NAME" \
        --format="table(priority, action, preview, description)"
}

delete_all() {
    print_header "Deleting All Rules and Policy"

    if ! check_policy_exists; then
        print_warning "Policy '$POLICY_NAME' does not exist"
        exit 0
    fi

    echo -e "${RED}WARNING: This will delete all security rules!${NC}"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Cancelled"
        exit 0
    fi

    # Get all rule priorities except default (2147483647)
    rules=$(gcloud compute security-policies rules list \
        --security-policy="$POLICY_NAME" \
        --format="value(priority)" | grep -v "2147483647" || true)

    for priority in $rules; do
        delete_rule "$priority"
    done

    # Detach from backend if specified
    if [ -n "$BACKEND_SERVICE" ]; then
        gcloud compute backend-services update "$BACKEND_SERVICE" \
            --global \
            --security-policy="" || true
        print_success "Policy detached from backend"
    fi

    # Delete policy
    gcloud compute security-policies delete "$POLICY_NAME" --quiet
    print_success "Policy deleted"
}

apply_all_rules() {
    print_header "Zivo Cloud Armor Setup"
    echo ""
    echo "This script will apply security rules one by one."
    echo "After each rule, test your application to ensure it still works."
    echo ""

    if [ "$AUTO_MODE" != "true" ]; then
        echo -e "${YELLOW}Running in INTERACTIVE mode - will pause after each rule${NC}"
        echo "Use --auto flag to skip pauses"
        echo ""
        read -p "Press ENTER to start..."
    else
        echo -e "${BLUE}Running in AUTO mode - no pauses${NC}"
    fi

    # Step 1: Create policy
    create_policy

    # Step 2: Static asset bypass (MUST be first - highest priority)
    echo ""
    print_info "Applying bypass rules first (these allow traffic through)"
    apply_static_assets_bypass
    if ! wait_for_test; then
        delete_rule 500
        delete_rule 502
        delete_rule 503
        delete_rule 504
        delete_rule 505
        print_error "Static asset rules rolled back"
        exit 1
    fi

    apply_favicon_bypass
    if ! wait_for_test; then
        delete_rule 501
        print_error "Rule 501 rolled back"
        exit 1
    fi

    # Step 3: WAF Rules (one by one)
    echo ""
    print_info "Applying WAF protection rules (these block malicious traffic)"

    # SQLi
    apply_sqli_protection
    if ! wait_for_test; then
        delete_rule 1000
        print_error "Rule 1000 (SQLi) rolled back"
        exit 1
    fi

    # XSS (most likely to cause issues)
    apply_xss_protection
    if ! wait_for_test; then
        delete_rule 1001
        print_error "Rule 1001 (XSS) rolled back - this is the problematic rule!"
        print_info "Your app works without XSS rule. Consider adjusting exclusions."
        exit 1
    fi

    # LFI
    apply_lfi_protection
    if ! wait_for_test; then
        delete_rule 1002
        print_error "Rule 1002 (LFI) rolled back"
        exit 1
    fi

    # RFI
    apply_rfi_protection
    if ! wait_for_test; then
        delete_rule 1003
        print_error "Rule 1003 (RFI) rolled back"
        exit 1
    fi

    # RCE
    apply_rce_protection
    if ! wait_for_test; then
        delete_rule 1004
        print_error "Rule 1004 (RCE) rolled back"
        exit 1
    fi

    # Method Enforcement
    apply_method_enforcement
    if ! wait_for_test; then
        delete_rule 1005
        print_error "Rule 1005 (Method Enforcement) rolled back"
        exit 1
    fi

    # Scanner Detection
    apply_scanner_detection
    if ! wait_for_test; then
        delete_rule 1006
        print_error "Rule 1006 (Scanner Detection) rolled back"
        exit 1
    fi

    # Protocol Attack
    apply_protocol_attack_protection
    if ! wait_for_test; then
        delete_rule 1007
        print_error "Rule 1007 (Protocol Attack) rolled back"
        exit 1
    fi

    # Session Fixation
    apply_session_fixation_protection
    if ! wait_for_test; then
        delete_rule 1008
        print_error "Rule 1008 (Session Fixation) rolled back"
        exit 1
    fi

    # Step 4: Rate Limiting Rules
    echo ""
    print_info "Applying rate limiting rules"

    apply_general_rate_limit
    if ! wait_for_test; then
        delete_rule 2000
        print_error "Rule 2000 (General Rate Limit) rolled back"
        exit 1
    fi

    apply_join_rate_limit
    if ! wait_for_test; then
        delete_rule 2001
        print_error "Rule 2001 (Join Rate Limit) rolled back"
        exit 1
    fi

    apply_auth_rate_limit
    if ! wait_for_test; then
        delete_rule 2002
        print_error "Rule 2002 (Auth Rate Limit) rolled back"
        exit 1
    fi

    # Step 5: Bot Protection
    echo ""
    print_info "Applying bot protection rules"

    apply_block_scrapers
    if ! wait_for_test; then
        delete_rule 4000
        print_error "Rule 4000 (Block Scrapers) rolled back"
        exit 1
    fi

    apply_block_empty_ua
    if ! wait_for_test; then
        delete_rule 4001
        print_error "Rule 4001 (Block Empty UA) rolled back"
        exit 1
    fi

    # Step 6: Attach to backend
    attach_to_backend

    # Done!
    print_header "Setup Complete!"
    echo ""
    show_status
    echo ""
    print_success "All rules applied successfully!"
    echo ""
    print_info "To view logs:"
    echo '  gcloud logging read "resource.type=\"http_load_balancer\" AND jsonPayload.enforcedSecurityPolicy.outcome=\"DENY\"" --limit=20'
}

# =============================================================================
# Script Entry Point
# =============================================================================

AUTO_MODE="false"

case "${1:-}" in
    --auto)
        AUTO_MODE="true"
        apply_all_rules
        ;;
    --delete)
        delete_all
        ;;
    --status)
        show_status
        ;;
    --help|-h)
        echo "Cloud Armor Setup Script for Zivo"
        echo ""
        echo "Usage:"
        echo "  $0              Interactive mode (pause after each rule)"
        echo "  $0 --auto       Auto mode (apply all rules without pauses)"
        echo "  $0 --status     Show current rules status"
        echo "  $0 --delete     Delete all rules and policy"
        echo "  $0 --help       Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  GOOGLE_CLOUD_PROJECT    GCP project ID (default: gquiz-production)"
        echo ""
        echo "Configuration:"
        echo "  Edit POLICY_NAME and BACKEND_SERVICE at the top of this script"
        echo ""
        echo "Examples:"
        echo "  GOOGLE_CLOUD_PROJECT=my-project $0 --status"
        echo "  GOOGLE_CLOUD_PROJECT=my-project $0 --auto"
        ;;
    *)
        apply_all_rules
        ;;
esac
