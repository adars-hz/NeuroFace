@echo off
title NeuroFace Teacher Edge Server
cd /d "%~dp0\.."
echo ========================================================
echo    Launching NeuroFace Teacher Edge Server
echo    Your computer is now the Attendance Server!
echo ========================================================
backend\venv\Scripts\python.exe teacher_edge_server\gui_app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server closed with an error. Check logs above.
    pause
)

