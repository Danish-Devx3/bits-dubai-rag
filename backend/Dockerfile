FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source files including prisma schema
COPY . .

# Generate Prisma Client with the full schema
# Using a dummy URL since prisma generate only needs the schema, not actual connection
RUN DATABASE_URL="mongodb://localhost:27017/dummy" npx prisma generate

# Build the application
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
