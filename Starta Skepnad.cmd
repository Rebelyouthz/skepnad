@echo off
chcp 65001 >nul
title Skepnad
setlocal
set "HERE=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js saknas. Installera det gratis fran https://nodejs.org och starta igen.
  echo.
  pause
  exit /b 1
)

if not exist "%HERE%dist\index.html" (
  echo.
  echo   Appen ar inte byggd annu. Bygger via WSL - det tar en liten stund...
  wsl.exe -e bash -lc "cd ~/projects/skepnad && export PATH=$HOME/.local/node/bin:$PATH && npm run build"
)

node "%HERE%serve.mjs" --open
