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

# Build Argument for Backend URL
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy Backend
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copy Frontend (standalone build)
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static

# Expose ports
EXPOSE 3000 3001

# Start Script
RUN echo '#!/bin/sh' > /app/run.sh && \
    echo 'echo "🚀 Starting Backend..." &&' >> /app/run.sh && \
    echo 'cd /app/backend && npx prisma generate && node dist/main.js & ' >> /app/run.sh && \
    echo 'echo "🚀 Starting Frontend..." &&' >> /app/run.sh && \
    echo 'cd /app/frontend && node server.js & ' >> /app/run.sh && \
    echo 'wait' >> /app/run.sh && \
    chmod +x /app/run.sh

ENV NODE_ENV=production

CMD ["/bin/sh", "/app/run.sh"]
