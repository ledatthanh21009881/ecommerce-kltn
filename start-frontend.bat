@echo off
echo ========================================
echo    KHOI DONG FRONTEND (Next.js)
echo ========================================
echo.

REM Kiem tra xem co process nao dang chay tren port 3000 khong
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 3000 da duoc su dung!
    echo Dang tim va tat process tren port 3000...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 >nul
)

REM Di chuyen vao thu muc web
cd /d "D:\Khoa_Luan_Tan_Phuc\code\ecommerce\web"

REM Kiem tra xem node_modules co ton tai khong
if not exist "node_modules" (
    echo [INFO] node_modules khong ton tai. Dang cai dat dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Khong the cai dat dependencies!
        pause
        exit /b 1
    )
)

echo [INFO] Dang khoi dong Next.js development server...
echo [INFO] Frontend se chay tai: http://localhost:3000
echo.

REM Khoi dong Next.js development server
npm run dev

echo.
echo [INFO] Frontend da duoc khoi dong thanh cong!
echo [INFO] Truy cap: http://localhost:3000
echo.
pause
