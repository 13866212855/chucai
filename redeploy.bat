@echo off
echo ========================================
echo chucai - Docker Deployment Script (Windows)
echo ========================================
echo.

:: 设置统一的数据存储目录（根据项目名字段设定）
set "DATA_DIR=D:\docker\chucai\data"

echo [1/4] Stopping and removing old container...
docker stop chucai 2>nul
docker rm chucai 2>nul
echo Done.
echo.

echo [2/4] Building Docker image...
docker build -t chucai:latest .
if errorlevel 1 (
    echo [ERROR] Docker build failed. Deployment aborted.
    pause
    exit /b 1
)
echo Build successful.
echo.

echo [3/4] Starting new container...
if not exist "%DATA_DIR%" ( mkdir "%DATA_DIR%" )

:: 启动容器
docker run -d --name chucai -p 7860:3000 -v "%DATA_DIR%:/app/data" --restart unless-stopped chucai:latest

if errorlevel 1 (
    echo [ERROR] Failed to start Docker container.
    echo.
    echo [故障诊断提示]：
    echo 检测到 Docker Desktop 内部 containerd 磁盘锁死或 Blob 损坏。
    echo 请按以下两步快速恢复：
    echo 1. 在 PowerShell 终端运行: wsl --shutdown
    echo 2. 重新打开 Docker Desktop，并执行: docker builder prune -f
    echo 3. 再次运行 .\redeploy 即可正常启动。
    pause
    exit /b 1
)
echo Done.
echo.

echo [4/4] Cleaning up unused dangling images...
docker image prune -f >nul 2>&1
echo Done.
echo.

echo [验证] 等待 3 秒后检查容器运行状态...
timeout /t 3 /nobreak >nul
docker ps | findstr chucai
echo.

echo ========================================
echo Deployment Successful!
echo ========================================
echo Access URL: http://localhost:7860
echo ========================================
echo.
pause
