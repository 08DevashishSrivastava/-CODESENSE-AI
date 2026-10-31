@echo off
echo ========================================================
echo       Running CodeSense AI Complete Test Suite
echo ========================================================

echo.
echo [1/2] Running Extension Unit & E2E Tests (Node.js)...
set PATH=C:\Program Files\nodejs;%PATH%
call "C:\Program Files\nodejs\npm.cmd" run test:all

echo.
echo [2/2] Running Backend API & Static Analyzer Pytest Suite (Python 3.12)...
set PYTHONPATH=%CD%
"C:\Users\asus\AppData\Local\Programs\Python\Python312\python.exe" -m pytest backend/tests -v

echo.
echo ========================================================
echo                  Test Suite Finished
echo ========================================================
pause
