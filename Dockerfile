# =============================================================================
# BITS Dubai RAG - Unified Docker Image
# Contains both Frontend (Next.js) and Backend (NestJS)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Backend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY backend/ .

# Generate Prisma Client
RUN DATABASE_URL="mongodb://localhost:27017/dummy" npx prisma generate

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY frontend/ .

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Install curl for healthchecks
RUN apk add --no-cache curl

# Install process manager to run multiple services
RUN npm install -g concurrently

WORKDIR /app

# Copy Backend
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copy Frontend (standalone build)
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'cd /app/backend && node dist/main.js &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo 'cd /app/frontend && node server.js &' >> /app/start.sh && \
    echo 'FRONTEND_PID=$!' >> /app/start.sh && \
    echo 'trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGTERM SIGINT' >> /app/start.sh && \
    echo 'wait' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set environment
ENV NODE_ENV=production

# Expose both ports
EXPOSE 3000 3001

# Start both services
CMD ["/bin/sh", "/app/start.sh"]
