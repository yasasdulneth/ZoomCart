@echo off
echo Checking Expo installation...
where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npx is not found. Please install Node.js and npm.
    pause
    exit /b 1
)

echo Checking if Expo is installed...
npx expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Expo CLI not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo Starting Expo development server...
npx expo start --lan
pause
