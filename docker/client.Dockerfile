FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy only package.json + lock file first for better Docker cache
COPY client/package*.json ./client/

# Install deps inside /app/client
WORKDIR /app/client
RUN npm install

# Copy the rest of the client code (after installing)
COPY client ./client

# Expose dev server port
EXPOSE 3001

# Set environment variable to support hot reload (especially on Mac/WSL)
ENV CHOKIDAR_USEPOLLING=true

# Start dev server
CMD ["npm", "start"]
