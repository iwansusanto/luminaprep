# Build stage
FROM node:24.10-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# Production stage
FROM node:24.10-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies and pm2 globally for runtime
RUN npm ci --omit=dev && npm install -g pm2

# Copy built assets and server files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/ecosystem.config.cjs ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application using pm2-runtime (keeps container alive)
CMD ["pm2-runtime", "ecosystem.config.cjs", "--env", "production"]
