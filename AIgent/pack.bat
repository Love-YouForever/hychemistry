@echo off
echo Packaging "Little Magic Language" into a standalone executable...
echo Make sure PyInstaller is installed (install.bat will take care of it).

pyinstaller --version >nul 2>&1
if errorlevel 1 (
    echo PyInstaller not found, installing...
    pip install pyinstaller
    if errorlevel 1 (
        echo PyInstaller installation failed. Please install it manually.
        pause
        exit /b 1
    )
)

rem Package as a single file without console window, including images
pyinstaller --onefile --noconsole --add-data "normal1.png;." --add-data "normal2.png;." --add-data "pull.png;." --add-data "click.png;." "%~dp0oc.py"

if errorlevel 1 (
    echo Packaging failed. Check your Python code and ensure image files exist.
    pause
    exit /b 1
)

echo Packaging successful! The executable is located at dist\pet.exe
echo Please copy normal1.png, normal2.png, pull.png, and click.png to the same folder as pet.exe.
pause