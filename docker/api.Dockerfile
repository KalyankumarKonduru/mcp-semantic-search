FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY api ./api

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "api/server.js"]