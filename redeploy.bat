@echo off
echo ========================================
echo chucai - Docker Deployment Script (Windows)
echo ========================================
echo.

:: 设置统一的数据存储目录（根据项目名字段设定）
set "DATA_DIR=D:\docker\chucai\data"

echo [1/4] Building Docker image...
docker build -t chucai:latest .
if errorlevel 1 (
    echo [ERROR] Docker build failed. Deployment aborted.
    pause
    exit /b 1
)
echo Build successful.
echo.

echo [2/4] Stopping and removing old container...
docker stop chucai 2>nul
docker rm chucai 2>nul
echo Done.
echo.

echo [3/4] Cleaning up dangling images...
for /f "tokens=*" %%i in ('docker images chucai -q --filter "dangling=true" 2^>nul') do docker rmi %%i 2>nul
echo Done.
echo.

echo [4/4] Starting new container...
if not exist "%DATA_DIR%" ( mkdir "%DATA_DIR%" )

:: 启动容器
docker run -d --name chucai -p 7860:3000 -v "%DATA_DIR%:/app/data" --restart unless-stopped chucai:latest

if errorlevel 1 (
    echo [ERROR] Failed to start Docker container.
    pause
    exit /b 1
)
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
