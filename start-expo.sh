#!/bin/bash

echo "Checking Expo installation..."

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not found. Please install Node.js and npm."
    exit 1
fi

# Check if Expo is installed
if ! npx expo --version &> /dev/null; then
    echo "Expo CLI not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies."
        exit 1
    fi
fi

echo "Starting Expo development server..."
npx expo start --lan
