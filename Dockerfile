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

# 1. 验证 node_modules 是否完整安装并测试核心模块加载
RUN test -d node_modules/next && \
    test -d node_modules/react && \
    test -d node_modules/sql.js && \
    node -e "require('next'); require('react'); require('sql.js'); console.log('✓ Node modules installation verified successfully.');"

# Copy source files
COPY . .

# 确保启动脚本具备执行权限
RUN chmod +x docker-entrypoint.sh

# 2. 构建 Next.js 生产应用
RUN npm run build

# 3. 严格验证构建产物完整性，确保未生成异常或损坏的 Bundle 包
RUN test -f .next/build-manifest.json && \
    test -d .next/server && \
    test -d .next/static && \
    node -e " \
      const fs = require('fs'); \
      const bm = JSON.parse(fs.readFileSync('.next/build-manifest.json', 'utf8')); \
      const pm = JSON.parse(fs.readFileSync('.next/prerender-manifest.json', 'utf8')); \
      console.log('✓ Next.js build bundle verified successfully. Pages count:', Object.keys(bm.pages || {}).length); \
    "

# Production environment settings
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# 确保持久化数据目录存在
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# 4. 健康检查 (HEALTHCHECK)：定期检测服务是否正常运行与响应，排查启动后特定模块报错崩溃
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const req = http.get('http://127.0.0.1:3000/api/records', (res) => { \
      if (res.statusCode === 200) { \
        process.exit(0); \
      } else { \
        console.error('Healthcheck failed with HTTP status:', res.statusCode); \
        process.exit(1); \
      } \
    }); \
    req.on('error', (err) => { \
      console.error('Healthcheck connection error:', err.message); \
      process.exit(1); \
    }); \
  "

# 使用具备环境诊断和错误输出的入口脚本启动
CMD ["/app/docker-entrypoint.sh"]
