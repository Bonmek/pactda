# Build stage
FROM node:20-alpine AS build

# Install Python and build tools for native dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    py3-pip \
    linux-headers \
    eudev-dev

WORKDIR /app
# Copy all source files first
COPY . .

# Install dependencies using npm instead of pnpm
# Skip optional dependencies and native compilation steps
RUN npm install --omit=optional --ignore-scripts

# Install dev dependencies with force flag to bypass version compatibility checks
RUN npm install --save-dev @vitejs/plugin-react-swc@3.5.0 picomatch@latest --force

# Verify plugin installation and config
RUN ls -la node_modules/@vitejs/plugin-react-swc || echo "Plugin directory not found"
RUN cat vite.config.ts

# Now build
RUN npm run build

# Serve with static server
FROM node:18-alpine

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist /app/dist

CMD ["serve", "-s", "dist", "-l", "4173"]