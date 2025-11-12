@echo off
echo ========================================
echo Building Heimdall Desktop Application
echo ========================================
echo.
echo This will create a Windows installer for Heimdall
echo Estimated time: 5-10 minutes
echo.
pause

REM Step 1: Install Node dependencies
echo.
echo [1/4] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node dependencies
    pause
    exit /b 1
)

REM Step 2: Install PyInstaller
echo.
echo [2/4] Installing PyInstaller...
pip install pyinstaller
if errorlevel 1 (
    echo ERROR: Failed to install PyInstaller
    pause
    exit /b 1
)

REM Step 3: Build Python executable
echo.
echo [3/4] Building Python backend executable...
echo This may take several minutes...
python build-python.py
if errorlevel 1 (
    echo ERROR: Failed to build Python executable
    pause
    exit /b 1
)

REM Step 4: Build Electron app
echo.
echo [4/4] Building Electron installer...
echo This may take several minutes...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build Electron app
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Your installer is located in the 'dist' folder
echo Look for: Heimdall Setup 1.x.x.exe
echo.
pause
