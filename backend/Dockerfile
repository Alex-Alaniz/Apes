FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy all backend files
COPY . .

# Expose the port
EXPOSE 5000

# Start the server
CMD ["node", "server-minimal.js"]