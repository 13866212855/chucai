FROM node:20-bookworm

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Set Node DNS and TLS stability options for Windows Docker / WSL2
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Configure high-speed mirror with low concurrency (maxsockets=3) to prevent packet fragmentation
# Automatic fallback from Alibaba npmmirror to Tencent Cloud mirror
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set strict-ssl false && \
    npm config set maxsockets 3 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    (npm install --legacy-peer-deps --no-audit --no-fund || \
     npm install --registry=https://mirrors.cloud.tencent.com/npm/ --legacy-peer-deps --no-audit --no-fund)

# Copy source files
COPY . .

# Build Next.js application
RUN npm run build

# Production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start"]
