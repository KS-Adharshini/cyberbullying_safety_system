@echo off
echo Starting Cyberbullying Safety System...
echo 1. Starting Python FastAPI Backend on Port 8000...
start cmd /k "python run_backend.py"

echo 2. Starting Vite Frontend on Port 5173...
start cmd /k "cd frontend && npm run dev"

echo Both services launched!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:5173
