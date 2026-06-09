@echo off
chcp 65001 > nul
echo ============================================
echo Iniciando servidores...
echo ============================================
echo.
echo [1/3] Iniciando Sync...
start "Sync GitHub" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude && node sync-from-github.js"
timeout /t 3
echo [2/3] Iniciando Context Manager...
start "Context Manager" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\picpac-context-manager\src\v2.0 && node context-manager-v2.js"
timeout /t 3
echo [3/3] Iniciando Chat Server...
start "Chat Server" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\picpac-context-manager\src\chat && node chat-server.js"
echo.
echo ============================================
echo Todos os 3 servidores foram iniciados!
echo ============================================
echo.
pause