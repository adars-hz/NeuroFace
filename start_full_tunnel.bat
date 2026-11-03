@echo off
title NeuroFace - Complete Mobile HTTPS Tunnel (Frontend + AI Backend)
echo ========================================================
echo   NeuroFace - Instant Public Mobile Access (Frontend + AI)
echo ========================================================
echo.
echo Connecting your full NeuroFace system (port 5173) to Cloudflare...
echo Your secure public https://... URL will appear below in a few seconds.
echo.
echo Open the generated https://... URL on ANY mobile phone or tablet!
echo The camera will work automatically with full permissions.
echo.
echo (Keep this window open while the app is in use!)
echo.
npx cloudflared tunnel --url http://localhost:5173
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Notice: cloudflared failed or is downloading. Trying localtunnel fallback...
    npx localtunnel --port 5173
)
pause
