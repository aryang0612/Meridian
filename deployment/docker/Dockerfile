# ============================================================================
# Multi-stage Dockerfile for Meridian AI SaaS Platform
# Optimized for production deployment with security and performance
# ============================================================================

# ============================================================================
# STAGE 1: Dependencies
# ============================================================================
FROM node:18-alpine AS dependencies

# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    libc6-compat \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory with proper permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY --chown=nextjs:nodejs package*.json ./

# Install dependencies with clean install
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================================================
# STAGE 2: Builder
# ============================================================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Copy environment variables for build (if needed)
COPY .env.example .env.local

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force

# ============================================================================
# STAGE 3: Production Runtime
# ============================================================================
FROM node:18-alpine AS production

# Install runtime dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R nextjs:nodejs /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy production node_modules
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy additional configuration files
COPY --chown=nextjs:nodejs scripts/ ./scripts/
COPY --chown=nextjs:nodejs sql/ ./sql/

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Don't run as root
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "server.js"]

# ============================================================================
# STAGE 4: Development (Optional)
# ============================================================================
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    libc6-compat \
    git \
    curl \
    vim \
    && rm -rf /var/cache/apk/*

# Create user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY --chown=nextjs:nodejs . .

# Create development directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R nextjs:nodejs /app

# Set environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# ============================================================================
# Build Arguments and Labels
# ============================================================================

# Build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Metadata labels
LABEL maintainer="Meridian AI Team <support@meridianai.com>" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="Meridian AI SaaS Platform" \
      org.label-schema.description="AI-powered bookkeeping automation platform" \
      org.label-schema.url="https://meridianai.com" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/meridianai/platform" \
      org.label-schema.vendor="Meridian AI Inc." \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"

# ============================================================================
# Build Instructions
# ============================================================================

# Build for production:
# docker build --target production -t meridian-ai:latest .
#
# Build for development:
# docker build --target development -t meridian-ai:dev .
#
# Build with build args:
# docker build \
#   --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
#   --build-arg VCS_REF=$(git rev-parse --short HEAD) \
#   --build-arg VERSION=1.0.0 \
#   --target production \
#   -t meridian-ai:1.0.0 .

# ============================================================================
# Security Considerations
# ============================================================================

# 1. Non-root user: Application runs as 'nextjs' user (UID 1001)
# 2. Minimal base image: Alpine Linux for smaller attack surface
# 3. Security updates: Latest packages with security patches
# 4. No unnecessary packages: Only required dependencies installed
# 5. Multi-stage build: Reduces final image size and excludes build tools
# 6. Health checks: Enables container health monitoring
# 7. Signal handling: Proper process management with tini
# 8. File permissions: Proper ownership and permissions set

# ============================================================================
# Performance Optimizations
# ============================================================================

# 1. Layer caching: Dependencies installed before source code copy
# 2. npm ci: Clean install for reproducible builds
# 3. Production dependencies: Only runtime dependencies in final image
# 4. Static assets: Optimized Next.js build with static generation
# 5. Standalone output: Self-contained application bundle
# 6. Cache cleaning: npm cache cleared to reduce image size 