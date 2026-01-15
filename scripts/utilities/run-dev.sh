#!/bin/bash

echo "🚀 Starting PRIMAPE Markets Development Environment"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill all child processes on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down services...${NC}"
    pkill -P $$
    exit
}

# Set up trap to call cleanup on script exit
trap cleanup INT TERM EXIT

# Start Backend
echo -e "\n${GREEN}Starting Backend Server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start Frontend
echo -e "\n${GREEN}Starting Frontend Server...${NC}"
cd ../src/frontend
npm run dev &
FRONTEND_PID=$!

echo -e "\n${BLUE}Services Running:${NC}"
echo "- Backend: http://localhost:5001"
echo "- Frontend: http://localhost:3000"
echo -e "\n${BLUE}Press Ctrl+C to stop all services${NC}\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 