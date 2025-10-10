# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy database SQL files (needed at runtime)
COPY src/database ./src/database

# Copy migration scripts
COPY create-strategic-tables.sql ./

# Create uploads directory
RUN mkdir -p uploads

# Set default environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=8000
ENV DB_HOST=ogsm-postgres-server.postgres.database.azure.com
ENV DB_PORT=5432
ENV DB_NAME=ogsm_manager
ENV DB_USER=ogsmadmin
ENV DB_PASSWORD=OgsmPassword2025
ENV GEMINI_API_KEY=PLACEHOLDER_ADD_YOUR_KEY
ENV MAX_FILE_SIZE=10485760
ENV UPLOAD_DIR=/app/uploads

# Expose port (flexible for both 5000 and 8000)
EXPOSE 5000
EXPOSE 8000

# Health check (use PORT variable)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 5000; require('http').get('http://localhost:' + port + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "dist/server.js"]
