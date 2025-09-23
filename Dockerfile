FROM node:18-alpine

# Install pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Remove dev dependencies after build
RUN pnpm prune --prod

EXPOSE 3000

CMD ["pnpm", "start:worker"]