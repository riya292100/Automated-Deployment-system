FROM node:20-alpine

# Install Git, curl, and build tools
RUN apk update && apk add --no-cache git bash python3 make g++

WORKDIR /app

# Copy dependency definition
COPY package*.json ./
RUN npm install --production

# Copy build server source code
COPY . .

# Default environment variables
ENV STORAGE_MODE=aws
ENV AWS_REGION=us-east-1
ENV NODE_ENV=production

# Run builder entrypoint
ENTRYPOINT ["node", "build-server/index.js"]
