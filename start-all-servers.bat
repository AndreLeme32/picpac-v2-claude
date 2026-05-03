@echo off
chcp 65001 > nul
echo ============================================
echo Iniciando todos os servidores V2.0...
echo ============================================
echo.

echo [1/5] Iniciando Amanda (porta 3001)...
start "Amanda" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\Amanda\src\v2.0 && node index.js"
timeout /t 3

echo [2/5] Iniciando Atlas (porta 3002)...
start "Atlas" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\Atlas\src\v2.0 && node index.js"
timeout /t 3

echo [3/5] Iniciando Decisor (porta 3003)...
start "Decisor" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\Decisor\src\v2.0 && node index.js"
timeout /t 3

echo [4/5] Iniciando BlingBot (porta 3004)...
start "BlingBot" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\BlingBot\src\v2.0 && node index.js"
timeout /t 3

echo [5/5] Iniciando WPP Connect (WhatsApp)...
start "WPP Connect" cmd /k "cd /d C:\Users\André\Desktop\picpac-v2-claude\Agents\Amanda\src\v2.0 && node index-whatsapp.js"

echo.
echo ============================================
echo Todos os 5 servidores foram iniciados!
echo ============================================
echo.
echo Amanda:     http://localhost:3001
echo Atlas:      http://localhost:3002
echo Decisor:    http://localhost:3003
echo BlingBot:   http://localhost:3004
echo WhatsApp:   Verificar terminal WPP Connect
echo.
pause