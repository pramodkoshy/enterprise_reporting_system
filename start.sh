#!/bin/bash

# start.sh - Start the Enterprise Reporting System development server

PORT=${1:-4050}

echo "=========================================="
echo "Enterprise Reporting System - Start"
echo "=========================================="
echo ""

# Check if server is already running
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  Server is already running on port $PORT"
    echo "To restart, first run: ./stop.sh"
    exit 1
fi

echo "Starting development server on port $PORT..."
echo ""

# Start the dev server
npm run dev -- --port $PORT

echo ""
echo "Server stopped."
