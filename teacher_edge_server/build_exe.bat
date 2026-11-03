@echo off
title NeuroFace Server Standalone EXE Builder
cd /d "%~dp0"

echo ===================================================================
echo     BUILDING NEUROFACE TEACHER DESKTOP SERVER EXECUTABLE (.EXE)
echo ===================================================================
echo.
echo Packaging Python runtime, PyTorch AI vision, and web servers...
echo This takes about 1-2 minutes to package all neural network weights.
echo.

..\backend\venv\Scripts\pyinstaller.exe --noconfirm NeuroFace-Teacher-Server.spec

echo.
echo ===================================================================
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Executable built successfully!
    echo Location: %~dp0dist\NeuroFace-Teacher-Server\NeuroFace-Teacher-Server.exe
    echo.
    echo Double-click NeuroFace-Teacher-Server.exe to start the server!
) else (
    echo [ERROR] Build encountered an error.
)
echo ===================================================================
pause
