@echo off
if not "%1"=="MIN" start /min cmd /c "%~f0" MIN & exit

echo ========================================
echo Starting Cosmetic License System
echo ========================================
echo.

echo Starting MongoDB (if not already running)...
echo Make sure MongoDB is running on mongodb://localhost:27017
echo.

echo Starting Backend and Frontend servers...
echo ========================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.

cd /d "%~dp0"
npm run dev
