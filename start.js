const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

// 1. 确保数据持久化目录 /app/data 存在
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[启动引导] 数据持久化目录已创建:', dataDir);
  } catch (err) {
    console.error('[启动引导] 创建数据目录异常:', err.message);
  }
}

// 2. 端口规划：同时支持 3000 与 7860 端口（保证 HEALTHCHECK 和外部映射皆通畅）
const mainPort = parseInt(process.env.PORT || '3000', 10);
const bridgePort = mainPort === 7860 ? 3000 : 7860;

console.log('==================================================');
console.log('[公务出差管理系统] 容器服务正在启动...');
console.log('Node 版本:', process.version);
console.log(`主服务监听端口: ${mainPort} | 桥接支持端口: ${bridgePort}`);
console.log('==================================================');

// 3. 启动 Next.js 生产服务器
const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
const nextProcess = spawn(
  process.execPath,
  [nextBin, 'start', '-H', '0.0.0.0', '-p', String(mainPort)],
  {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(mainPort), HOSTNAME: '0.0.0.0' }
  }
);

nextProcess.on('error', (err) => {
  console.error('[Next.js 启动错误]:', err);
  process.exit(1);
});

nextProcess.on('exit', (code, signal) => {
  console.log(`[Next.js 进程退出] 退出码: ${code}, 信号: ${signal}`);
  process.exit(code || 0);
});

// 4. 创建 TCP 端口桥接，使 localhost:7860 与 localhost:3000 均可响应请求
const bridgeServer = net.createServer((socket) => {
  const client = net.createConnection({ port: mainPort, host: '127.0.0.1' });

  // 任一端断开或出错时必须同步关闭另一端：
  // - 出错：直接销毁对端，让浏览器立刻收到网络错误而不是无限等待；
  // - 正常关闭（如上游 Next.js 回收空闲 keep-alive 连接）：对端调用 end()，
  //   否则浏览器会继续复用这条“半死”连接发送下一个请求，数据被写入已销毁的上游
  //   连接而丢失，表现为接口永久 pending、前端一直显示“识别中”。
  socket.pipe(client);
  client.pipe(socket);
  socket.on('error', () => client.destroy());
  client.on('error', () => socket.destroy());
  socket.on('close', (hadError) => (hadError ? client.destroy() : client.end()));
  client.on('close', (hadError) => (hadError ? socket.destroy() : socket.end()));
});

bridgeServer.on('error', (err) => {
  console.log(`[端口桥接信息] 端口 ${bridgePort} 状态: ${err.message}`);
});

bridgeServer.listen(bridgePort, '0.0.0.0', () => {
  console.log(`[端口桥接就绪] 端口 ${bridgePort} 已成功桥接转发至主端口 ${mainPort}`);
});

// 5. 进程信号优雅处理
const handleShutdown = (signal) => {
  console.log(`[接收信号 ${signal}] 正在停止服务...`);
  try { bridgeServer.close(); } catch (_) {}
  try { nextProcess.kill(signal); } catch (_) {}
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
