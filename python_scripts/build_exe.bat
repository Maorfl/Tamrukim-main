@echo off
echo Building Python script into executable...

cd %~dp0

:: Check if PyInstaller is installed
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo PyInstaller not found. Installing...
    pip install pyinstaller
)

:: Create the executable
:: --onefile: Create a single exe file
:: --noconsole: Don't show a console window when running (optional, good for backend calls)
:: --name: Name of the output file
:: --additional-hooks-dir: If we needed special hooks
pyinstaller --onefile --name extract_numbers extract_numbers.py

if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)

echo Build successful! Executable is in python_scripts/dist/extract_numbers.exe
exit /b 0
