@echo off
echo ========================================================
echo       Starting CodeSense AI FastAPI Backend
echo ========================================================
set PYTHONPATH=%CD%
"C:\Users\asus\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
