# Production Multi-Stage Dockerfile for Vercel Cloud Clone
FROM node:22-alpine

# Install git and bash for repository cloning and build operations
RUN apk add --no-cache git bash python3 make g++

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application sources
COPY . .

# Ensure storage and temp-builds directories exist with write permissions
RUN mkdir -p storage/s3-bucket temp-builds && chmod -R 777 storage temp-builds

# Environment configuration for single-port unified cloud mode
ENV NODE_ENV=production
ENV UNIFIED_SERVER=true
ENV PORT=3000
ENV STORAGE_MODE=local

EXPOSE 3000

# Health check against unified health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
