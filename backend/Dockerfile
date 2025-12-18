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
RUN DATABASE_URL="mongodb+srv://bits:bits123@youtube.v7xaz1a.mongodb.net/bits_dubai?retryWrites=true&w=majority&appName=Youtube" npx prisma generate

# Build the application
RUN npm run build

FROM node:20-alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
