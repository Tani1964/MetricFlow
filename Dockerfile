FROM node:20

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install Temporal CLI
RUN curl -sSfL https://temporal.download/cli.sh | bash \
    && mv /root/.temporalio/bin/temporal /usr/local/bin/temporal \
    && chmod +x /usr/local/bin/temporal

# Verify installation
RUN temporal --version

# Install TypeScript & ts-node globally
RUN npm install -g typescript ts-node

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
