FROM node:22-alpine

WORKDIR /app

# Install git (required for cloning repos into codespaces)
RUN apk add --no-cache git

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose backend port
EXPOSE 3000

# Start the application - push db changes first then start
CMD npx prisma db push && npm start
