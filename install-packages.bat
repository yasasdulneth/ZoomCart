@echo off
cd /d "%~dp0"
echo Installing Node.js packages for ZoomCart...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo Failed. Make sure Node.js is installed from https://nodejs.org
    pause
    exit /b 1
)
echo.
echo Done! Run start-expo.bat or "npm start" to start the app.
pause
