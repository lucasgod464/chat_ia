#!/bin/bash
set -e

echo "Building frontend..."
./node_modules/.bin/vite build

echo "Building backend..."
./node_modules/.bin/esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server.js

echo "Build completed successfully!"