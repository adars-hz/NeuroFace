@echo off
echo ========================================================
echo         NEUROFACE - MTCNN LIVE DEMONSTRATION
echo ========================================================
echo.
echo Starting MTCNN Live Webcam Demonstration...
echo Press 'q' or 'ESC' in the camera window to stop.
echo.
d:\Neuroface\backend\venv\Scripts\python.exe d:\Neuroface\demo_mtcnn.py %*
pause

