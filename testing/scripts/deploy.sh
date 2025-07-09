#!/bin/bash

# ============================================================================
# Meridian AI SaaS Platform - Production Deployment Script
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
SKIP_TESTS="${3:-false}"

# Default values
REGISTRY="ghcr.io"
IMAGE_NAME="meridian-ai"
NAMESPACE="meridian-${ENVIRONMENT}"
DEPLOYMENT_TIMEOUT="600s"
HEALTH_CHECK_TIMEOUT="300s"

# Load environment-specific configuration
if [[ -f "${PROJECT_ROOT}/config/${ENVIRONMENT}.env" ]]; then
    source "${PROJECT_ROOT}/config/${ENVIRONMENT}.env"
fi

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_environment() {
    log "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        staging|production)
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
            ;;
    esac
    
    # Check required tools
    local required_tools=("docker" "kubectl" "helm" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
        fi
    done
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
    
    success "Environment validation passed"
}

validate_image() {
    log "Validating Docker image: $REGISTRY/$IMAGE_NAME:$VERSION"
    
    # Check if image exists
    if ! docker manifest inspect "$REGISTRY/$IMAGE_NAME:$VERSION" &> /dev/null; then
        error "Docker image not found: $REGISTRY/$IMAGE_NAME:$VERSION"
    fi
    
    # Security scan
    log "Running security scan on image..."
    if command -v trivy &> /dev/null; then
        trivy image --exit-code 1 --severity HIGH,CRITICAL "$REGISTRY/$IMAGE_NAME:$VERSION" || {
            error "Security scan failed - high/critical vulnerabilities found"
        }
    else
        warning "Trivy not installed - skipping security scan"
    fi
    
    success "Image validation passed"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

create_database_backup() {
    log "Creating database backup..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    # Create backup job
    kubectl create job --from=cronjob/database-backup "$backup_name" -n "$NAMESPACE" || {
        error "Failed to create backup job"
    }
    
    # Wait for backup completion
    kubectl wait --for=condition=complete job/"$backup_name" -n "$NAMESPACE" --timeout=600s || {
        error "Backup job failed or timed out"
    }
    
    success "Database backup created: $backup_name"
    echo "$backup_name" > /tmp/backup_name
}

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

deploy_application() {
    log "Deploying application to $ENVIRONMENT..."
    
    # Update deployment manifest
    local deployment_file="${PROJECT_ROOT}/k8s/${ENVIRONMENT}/deployment.yaml"
    if [[ ! -f "$deployment_file" ]]; then
        error "Deployment file not found: $deployment_file"
    fi
    
    # Replace image tag in deployment
    export IMAGE_TAG="$REGISTRY/$IMAGE_NAME:$VERSION"
    envsubst < "$deployment_file" | kubectl apply -f -
    
    # Wait for deployment rollout
    kubectl rollout status deployment/meridian-app -n "$NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT" || {
        error "Deployment rollout failed"
    }
    
    success "Application deployed successfully"
}

deploy_blue_green() {
    log "Deploying using blue-green strategy..."
    
    # Determine current and target colors
    local current_color=$(kubectl get service meridian-app-service -n "$NAMESPACE" -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")
    local target_color
    
    if [[ "$current_color" == "blue" ]]; then
        target_color="green"
    else
        target_color="blue"
    fi
    
    log "Current: $current_color, Target: $target_color"
    
    # Deploy to target environment
    local deployment_file="${PROJECT_ROOT}/k8s/${ENVIRONMENT}/deployment-${target_color}.yaml"
    export IMAGE_TAG="$REGISTRY/$IMAGE_NAME:$VERSION"
    envsubst < "$deployment_file" | kubectl apply -f -
    
    # Wait for target deployment
    kubectl rollout status deployment/meridian-app-${target_color} -n "$NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT" || {
        error "Blue-green deployment failed"
    }
    
    # Health check on target
    health_check_deployment "meridian-app-${target_color}"
    
    # Switch traffic
    log "Switching traffic to $target_color environment..."
    kubectl patch service meridian-app-service -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"version\":\"$target_color\"}}}"
    
    # Wait for traffic switch
    sleep 30
    
    # Final health check
    health_check_service
    
    # Scale down old environment
    log "Scaling down $current_color environment..."
    kubectl scale deployment meridian-app-${current_color} -n "$NAMESPACE" --replicas=0
    
    success "Blue-green deployment completed"
}

# ============================================================================
# HEALTH CHECK FUNCTIONS
# ============================================================================

health_check_deployment() {
    local deployment_name="$1"
    log "Running health checks for $deployment_name..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app="$deployment_name" -n "$NAMESPACE" --timeout="$HEALTH_CHECK_TIMEOUT" || {
        error "Pods failed to become ready"
    }
    
    # Check deployment status
    local ready_replicas=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment "$deployment_name" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [[ "$ready_replicas" != "$desired_replicas" ]]; then
        error "Deployment not fully ready: $ready_replicas/$desired_replicas replicas"
    fi
    
    success "Deployment health check passed"
}

health_check_service() {
    log "Running service health checks..."
    
    # Get service endpoint
    local service_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        service_url="https://app.meridianai.com"
    else
        service_url="https://staging.meridianai.com"
    fi
    
    # Health check endpoint
    local health_url="${service_url}/api/health"
    
    # Wait for service to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null; then
            success "Service health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    error "Service health check failed after $max_attempts attempts"
}

# ============================================================================
# TESTING FUNCTIONS
# ============================================================================

run_smoke_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping smoke tests"
        return 0
    fi
    
    log "Running smoke tests..."
    
    local base_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        base_url="https://app.meridianai.com"
    else
        base_url="https://staging.meridianai.com"
    fi
    
    # Run smoke tests
    cd "$PROJECT_ROOT"
    npm run test:smoke -- --baseUrl="$base_url" || {
        error "Smoke tests failed"
    }
    
    success "Smoke tests passed"
}

run_performance_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping performance tests"
        return 0
    fi
    
    log "Running performance tests..."
    
    local base_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        base_url="https://app.meridianai.com"
    else
        base_url="https://staging.meridianai.com"
    fi
    
    # Run performance tests
    cd "$PROJECT_ROOT"
    npm run test:performance -- --baseUrl="$base_url" || {
        warning "Performance tests failed - monitoring required"
    }
    
    success "Performance tests completed"
}

# ============================================================================
# MONITORING FUNCTIONS
# ============================================================================

update_monitoring() {
    log "Updating monitoring configuration..."
    
    # Update Grafana dashboards
    if [[ -n "${GRAFANA_API_URL:-}" ]] && [[ -n "${GRAFANA_API_TOKEN:-}" ]]; then
        local dashboard_file="${PROJECT_ROOT}/monitoring/grafana/dashboards/${ENVIRONMENT}.json"
        if [[ -f "$dashboard_file" ]]; then
            curl -X POST "$GRAFANA_API_URL/api/dashboards/db" \
                -H "Authorization: Bearer $GRAFANA_API_TOKEN" \
                -H "Content-Type: application/json" \
                -d @"$dashboard_file" || {
                warning "Failed to update Grafana dashboard"
            }
        fi
    fi
    
    # Update Prometheus alerts
    kubectl apply -f "${PROJECT_ROOT}/monitoring/prometheus/alerts.yaml" -n "$NAMESPACE" || {
        warning "Failed to update Prometheus alerts"
    }
    
    success "Monitoring configuration updated"
}

check_metrics() {
    log "Checking post-deployment metrics..."
    
    # Wait for metrics to stabilize
    sleep 300
    
    if [[ -n "${PROMETHEUS_URL:-}" ]]; then
        # Check error rate
        local error_rate=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        
        if (( $(echo "$error_rate > 0.01" | bc -l) )); then
            error "High error rate detected: $error_rate"
        fi
        
        # Check response time
        local response_time=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        
        if (( $(echo "$response_time > 1.0" | bc -l) )); then
            warning "High response time detected: $response_time seconds"
        fi
        
        success "Metrics check passed"
    else
        warning "Prometheus URL not configured - skipping metrics check"
    fi
}

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

rollback_deployment() {
    log "Rolling back deployment..."
    
    # Get previous revision
    local previous_revision=$(kubectl rollout history deployment/meridian-app -n "$NAMESPACE" --limit=2 | tail -n 1 | awk '{print $1}')
    
    if [[ -z "$previous_revision" ]]; then
        error "No previous revision found for rollback"
    fi
    
    # Rollback to previous revision
    kubectl rollout undo deployment/meridian-app -n "$NAMESPACE" --to-revision="$previous_revision"
    
    # Wait for rollback completion
    kubectl rollout status deployment/meridian-app -n "$NAMESPACE" --timeout="$DEPLOYMENT_TIMEOUT"
    
    success "Rollback completed to revision $previous_revision"
}

# ============================================================================
# NOTIFICATION FUNCTIONS
# ============================================================================

send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        local emoji
        
        case $status in
            success)
                color="good"
                emoji="✅"
                ;;
            warning)
                color="warning"
                emoji="⚠️"
                ;;
            error)
                color="danger"
                emoji="❌"
                ;;
        esac
        
        local payload=$(cat <<EOF
{
    "text": "$emoji Meridian AI Deployment",
    "attachments": [
        {
            "color": "$color",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Version",
                    "value": "$VERSION",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$message",
                    "short": false
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" || {
            warning "Failed to send Slack notification"
        }
    fi
}

# ============================================================================
# MAIN DEPLOYMENT FLOW
# ============================================================================

main() {
    log "Starting Meridian AI deployment to $ENVIRONMENT (version: $VERSION)"
    
    # Trap errors and send notifications
    trap 'send_notification "error" "Deployment failed"; exit 1' ERR
    
    # Validation phase
    validate_environment
    validate_image
    
    # Backup phase (production only)
    if [[ "$ENVIRONMENT" == "production" ]]; then
        create_database_backup
    fi
    
    # Deployment phase
    if [[ "$ENVIRONMENT" == "production" ]]; then
        deploy_blue_green
    else
        deploy_application
    fi
    
    # Testing phase
    run_smoke_tests
    run_performance_tests
    
    # Monitoring phase
    update_monitoring
    
    # Post-deployment checks
    if [[ "$ENVIRONMENT" == "production" ]]; then
        check_metrics
    fi
    
    # Success notification
    send_notification "success" "Deployment completed successfully"
    
    success "Deployment to $ENVIRONMENT completed successfully!"
    log "Version $VERSION is now live"
}

# ============================================================================
# SCRIPT EXECUTION
# ============================================================================

# Show usage if no arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [version] [skip-tests]"
    echo ""
    echo "Arguments:"
    echo "  environment   staging or production"
    echo "  version       Docker image version (default: latest)"
    echo "  skip-tests    Skip smoke and performance tests (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production v1.2.3"
    echo "  $0 staging latest true"
    exit 1
fi

# Run main function
main "$@" 