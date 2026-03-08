Write-Host "Iniciando sistema Solarman com Ngrok..."

# 1. Iniciar API (Porta 4001)
Write-Host "Iniciando API..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WorkingDirectory "$PSScriptRoot"

# Aguardar API iniciar
Start-Sleep -Seconds 5

# 2. Iniciar Frontend (Porta 4000)
Write-Host "Iniciando Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "$PSScriptRoot/web"

# Aguardar Frontend
Start-Sleep -Seconds 5

# 3. Iniciar Ngrok (Porta 4000)
Write-Host "Iniciando Ngrok..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 4000"

Write-Host "Tudo pronto! Verifique a janela do Ngrok para o link público."
