@echo off
echo ========================================
echo    DUNG FRONTEND (Next.js)
echo ========================================
echo.

REM Tim va tat tat ca cac process node.exe
echo [INFO] Dang tim va tat cac process Node.js...
taskkill /f /im node.exe >nul 2>&1

REM Tim va tat process tren port 3000
echo [INFO] Dang kiem tra port 3000...
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo [INFO] Tim thay process tren port 3000. Dang tat...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /f /pid %%a >nul 2>&1
        echo [INFO] Da tat process PID: %%a
    )
) else (
    echo [INFO] Khong co process nao dang chay tren port 3000
)

echo.
echo [SUCCESS] Frontend da duoc dung thanh cong!
echo.
pause
