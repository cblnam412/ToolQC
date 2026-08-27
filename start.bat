@echo off
title QC Tool - Auto Starter
color 0B
echo ===================================================
echo             QC TOOL - STARTUP SCRIPT
echo ===================================================
echo.

:: 1. Kiem tra va cai dat Backend
echo [1/3] Kiem tra thu vien Backend...
cd backend
if not exist "node_modules\" (
    echo - Dang cai dat thu vien Backend...
    call npm install
) else (
    echo - Backend da san sang.
)
cd ..

:: 2. Kiem tra, cai dat va build Frontend
echo.
echo [2/3] Kiem tra thu vien va build Frontend...
cd frontend
if not exist "node_modules\" (
    echo - Dang cai dat thu vien Frontend...
    call npm install
)
if not exist "dist\" (
    echo - Dang build Frontend Production...
    call npm run build
) else (
    echo - Frontend da duoc build san.
)
cd ..

:: 3. Chay Server Backend (se tu host Frontend luon)
echo.
echo [3/3] Dang khoi dong He thong...
echo.
echo ===================================================
echo * He thong da san sang!
echo * Hay mo trinh duyet va truy cap: http://localhost:3001
echo * An Ctrl+C de tat he thong.
echo ===================================================
cd backend
node server.js
pause
