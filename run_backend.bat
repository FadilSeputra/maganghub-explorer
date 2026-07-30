@echo off
title MagangHub Explorer Backend Server
echo ========================================================
echo   MAGANGHUB EXPLORER - FASTAPI BACKEND SERVER (8000)
echo ========================================================
echo.
cd /d "%~dp0"
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
pause
