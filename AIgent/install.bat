@echo off
echo Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Please install Python 3.8 or later and add it to PATH.
    pause
    exit /b 1
)

echo Installing required libraries...
pip install requests Pillow pyinstaller
if errorlevel 1 (
    echo Failed to install dependencies. Check your network or run manually: pip install requests Pillow pyinstaller
    pause
    exit /b 1
)

echo All dependencies installed successfully!
echo Make sure the following image files exist in the current directory:
echo   normal1.png, normal2.png, pull.png, click.png
echo Otherwise, the program may not display correctly.
pause