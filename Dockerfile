FROM node:22

# Set working directory
WORKDIR /app

# Copy package files and tsconfig
COPY package.json bun.lock tsconfig.json ./

# Copy environment variables (optional)
COPY .env .gitignore ./

COPY eslint.config.mjs ./

# Install dependencies (legacy-peer-deps for bun/npm conflicts)
RUN npm install --legacy-peer-deps
RUN npm install -g ts-node-dev

# Copy the rest of the source code
COPY ./src ./src


# Expose port
EXPOSE 5000

# Run dev server (ignore TS errors, fast)
CMD ["ts-node-dev", "--respawn", "--transpile-only", "./src/server.ts"]