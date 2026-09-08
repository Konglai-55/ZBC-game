@echo off
setlocal
if not exist ".env.local" (
  echo [ERROR] Copy .env.example to .env.local and configure admin credentials first.
  pause
  exit /b 1
)
if "%PORT%"=="" set "PORT=3000"
if "%HOSTNAME%"=="" set "HOSTNAME=0.0.0.0"
set "NODE_PATH=%CD%\node_modules\.pnpm\node_modules"
node node_modules\next\dist\bin\next start
