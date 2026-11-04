#!/bin/sh
set -e

echo "=================================================="
echo "[公务出差管理系统] Docker 容器正在启动..."
echo "Node 版本: $(node -v)"
echo "当前工作目录: $(pwd)"
echo "当前环境: NODE_ENV=${NODE_ENV}, PORT=${PORT:-3000}, HOSTNAME=${HOSTNAME:-0.0.0.0}"
echo "=================================================="

# 1. 检查并确保数据存储目录权限正常
if [ ! -d "/app/data" ]; then
  echo "[1/3] 创建数据存储目录 /app/data..."
  mkdir -p /app/data
fi
echo "[1/3] 数据持久化目录 /app/data 已就绪"

# 2. 检查 .next 构建产物完整性
echo "[2/3] 检查 Next.js 构建产物..."
if [ ! -f "/app/.next/build-manifest.json" ] || [ ! -d "/app/.next/server" ]; then
  echo "[ERROR] 未检测到有效的 .next 构建产物目录！"
  ls -la /app/.next 2>/dev/null || true
  exit 1
fi
echo "      检测到有效 Next.js 构建包 (包含 build-manifest.json 与 server 目录)"

# 3. 验证关键原生依赖模块（如 sql.js）能否在当前环境下正常加载
echo "[3/3] 验证核心模块加载状态..."
node -e "
  try {
    require('next');
    require('react');
    require('sql.js');
    console.log('      ✓ 核心依赖模块加载正常 (next, react, sql.js)');
  } catch (err) {
    console.error('      ✗ 模块加载异常:', err.message);
    process.exit(1);
  }
"

echo "=================================================="
echo "服务就绪，正在启动 Next.js 生产服务器..."
echo "=================================================="

# 使用 exec 将 PID 1 赋予 Node 进程，确保信号能正确传递与日志完整输出
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
