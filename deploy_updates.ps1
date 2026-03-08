$Server = "root@kit.iasolar.io"
$RemotePath = "/var/www/apisolarman/api/src"

Write-Host "Deploying updates to $Server..." -ForegroundColor Cyan

# Copy config
Write-Host "Copying supabase.js..."
$Server = "root@kit.iasolar.io"
$RemotePath = "/var/www/apisolarman/api/src"

Write-Host "Deploying updates to $Server..." -ForegroundColor Cyan

# Copy config
Write-Host "Copying supabase.js..."
scp api/src/config/supabase.js "$Server`:$RemotePath/config/"

# Copy index (API entry point)
Write-Host "Copying index.js..."
scp api/src/index.js "$Server`:$RemotePath/"

# Copy routes
Write-Host "Copying auth.js..."
scp api/src/routes/auth.js "$Server`:$RemotePath/routes/"

# Copy server.js (main router config)
Write-Host "Copying server.js..."
scp api/src/server.js "$Server`:$RemotePath/"

# Restart Service
Write-Host "Restarting API service..."
ssh $Server "pm2 restart solarman-api || pm2 start ecosystem.config.js || echo 'Warning: Could not restart service automatically. Please restart manually.'"

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Please verify by running: curl -X POST http://kit.iasolar.io:4001/api/health"
