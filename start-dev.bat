@echo off
echo ========================================
echo Heimdall - Development Mode
echo ========================================
echo.

REM Check if Node modules are installed
if not exist "node_modules\" (
    echo Installing Node.js dependencies...
    call npm install
    echo.
)

REM Check if Python virtual environment exists
if not exist "backend\venv\" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
    echo.
)

REM Activate virtual environment and install Python dependencies
echo Installing/Updating Python dependencies...
cd backend
call venv\Scripts\activate
pip install -r requirements.txt
cd ..
echo.

echo Starting Heimdall in development mode...
echo Press Ctrl+C to stop the application
echo.

npm start
