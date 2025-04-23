FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json for client
COPY client/package*.json ./client/

# Install dependencies
WORKDIR /app/client
RUN npm install

# Return to main directory
WORKDIR /app

# Copy client source code
COPY client ./client

# Expose port
EXPOSE 3001

# Start development server
WORKDIR /app/client
CMD ["npm", "start"]