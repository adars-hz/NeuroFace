@echo off
title NeuroFace - Cloudflare Public HTTPS Tunnel (Backend)
echo ========================================================
echo   NeuroFace - Cloudflare Public HTTPS Tunnel
echo ========================================================
echo.
echo Connecting your local AI backend (port 8000) to Cloudflare...
echo Your secure public https://... URL will appear below in a few seconds.
echo.
echo (Keep this window open while taking attendance!)
echo.
npx cloudflared tunnel --url http://localhost:8000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Notice: cloudflared failed or is downloading. Trying localtunnel fallback...
    npx localtunnel --port 8000
)
pause

