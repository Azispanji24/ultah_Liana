@echo off
title A Letter to Liana — Chapter 21
echo Starting local server for A Letter to Liana — Chapter 21...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Port 8080
pause
