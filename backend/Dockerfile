FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Make startup script executable
RUN chmod +x ./scripts/start.sh

# Expose port
EXPOSE 3001

# Start the application (runs migrations first)
CMD ["./scripts/start.sh"]

