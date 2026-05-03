@echo off
REM ============================================================
REM PICPAC V2.0 - PARAR TODOS OS SERVIDORES
REM ============================================================

cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║              ENCERRANDO TODOS OS SERVIDORES...             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Parar todos os processos Node.js
taskkill /im node.exe /f

REM Aguardar um segundo
timeout /t 1 /nobreak

echo.
echo ✅ Todos os servidores foram encerrados!
echo.
pause