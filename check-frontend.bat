@echo off
echo ========================================
echo    KIEM TRA TRANG THAI FRONTEND
echo ========================================
echo.

REM Kiem tra port 3000
echo [INFO] Kiem tra port 3000...
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Port 3000: DANG CHAY
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo [INFO] Process ID: %%a
    )
) else (
    echo [WARNING] Port 3000: KHONG CHAY
)

echo.

REM Kiem tra cac process Node.js
echo [INFO] Kiem tra cac process Node.js...
tasklist /fi "imagename eq node.exe" 2>nul | find "node.exe" >nul
if %errorlevel% equ 0 (
    echo [SUCCESS] Node.js processes: DANG CHAY
    tasklist /fi "imagename eq node.exe"
) else (
    echo [WARNING] Node.js processes: KHONG CHAY
)

echo.
echo ========================================
echo [INFO] Frontend URL: http://localhost:3000
echo ========================================
echo.
pause
