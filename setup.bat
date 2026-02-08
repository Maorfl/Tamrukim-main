@echo off
echo ========================================
echo Cosmetic License System - Setup Script
echo ========================================
echo.

echo Step 1: Installing Backend Dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)
echo Backend dependencies installed successfully!
echo.

echo Step 2: Installing Frontend Dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)
echo Frontend dependencies installed successfully!
echo.

echo Step 3: Building Python Executable...
cd ..\python_scripts
call build_exe.bat
if %errorlevel% neq 0 (
    echo WARNING: Python build failed. The app might require manual python setup.
) else (
    echo Python executable built successfully!
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running
echo 2. Run 'npm run seed' in the backend folder to populate the database
echo 3. Run 'npm run dev' in the backend folder to start the API server
echo 4. Run 'npm start' in the frontend folder to start the React app
echo.
pause
