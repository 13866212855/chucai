# ==========================================
# 阶段 1: 构建阶段 (Builder) 使用完整版 node:20
# ==========================================
FROM node:20 AS builder

WORKDIR /app

# 复制依赖定义文件
COPY package*.json ./

# 配置 Node DNS 和国内高速镜像源
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set strict-ssl false && \
    npm config set maxsockets 3 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    (npm install --legacy-peer-deps --no-audit --no-fund || \
     npm install --registry=https://mirrors.cloud.tencent.com/npm/ --legacy-peer-deps --no-audit --no-fund)

# 验证 node_modules 是否完整安装并测试核心模块加载
RUN test -d node_modules/next && \
    test -d node_modules/react && \
    test -d node_modules/sql.js && \
    node -e "require('next'); require('react'); require('sql.js'); console.log('✓ Node modules installation verified successfully.');"

# 复制项目源代码
COPY . .

# 执行 Next.js 生产环境构建
RUN npm run build

# 验证构建产物完整性，确保未生成异常或损坏的 Bundle 包
RUN test -f .next/build-manifest.json && \
    test -d .next/server && \
    test -d .next/static && \
    node -e " \
      const fs = require('fs'); \
      const bm = JSON.parse(fs.readFileSync('.next/build-manifest.json', 'utf8')); \
      const pm = JSON.parse(fs.readFileSync('.next/prerender-manifest.json', 'utf8')); \
      console.log('✓ Next.js build bundle verified successfully. Pages count:', Object.keys(bm.pages || {}).length); \
    "

# ==========================================
# 阶段 2: 运行阶段 (Runner) 使用轻量版 node:20-slim
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

# 安装 curl 用于健康检查
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# 设置生产环境变量
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# 从构建阶段复制必要运行时产物（彻底隔离中间缓存与临时文件，防止 WSL2 磁盘 input/output error）
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.js ./start.js

# 创建并确保持久化数据目录存在
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000 7860

# 启动服务
CMD ["node", "start.js"]

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:7860 || exit 1
