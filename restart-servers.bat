@echo off
echo Stopping all running Node.js processes...
taskkill /F /IM node.exe

echo.
echo Starting backend server...
start cmd /k "cd backend && npm start"

echo.
echo Waiting for backend to initialize (5 seconds)...
timeout /T 5

echo.
echo Starting frontend server...
start cmd /k "cd frontend && npm start"

echo.
echo Both servers have been restarted!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3001
