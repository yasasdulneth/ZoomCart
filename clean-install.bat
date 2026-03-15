@echo off
cd /d "%~dp0"
echo Removing node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo.
echo Running npm install (with legacy-peer-deps)...
call npm.cmd install
if %errorlevel% neq 0 (
    echo.
    echo Install failed. Try: npm.cmd install --legacy-peer-deps
    pause
    exit /b 1
)
echo.
echo Done. Run npm-start.bat or start-expo.bat to start the app.
pause
