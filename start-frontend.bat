@echo off
echo Starting Next.js Frontend Server...
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
npm run dev

pause
