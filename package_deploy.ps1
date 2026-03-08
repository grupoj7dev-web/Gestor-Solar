$deployDir = "deploy_temp"
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $deployDir

# Root files
Copy-Item "docker-compose.yml" -Destination $deployDir
Copy-Item ".env" -Destination $deployDir
Copy-Item "nginx.conf" -Destination $deployDir
Copy-Item "package.json" -Destination $deployDir

# Web (Dist only)
New-Item -ItemType Directory -Force -Path "$deployDir\web"
Copy-Item "web\dist" -Destination "$deployDir\web" -Recurse

# API (Exclude node_modules)
New-Item -ItemType Directory -Force -Path "$deployDir\api"
Get-ChildItem "api" | Where-Object { $_.Name -ne 'node_modules' } | Copy-Item -Destination "$deployDir\api" -Recurse

# Compress
Compress-Archive -Path "$deployDir\*" -DestinationPath "deploy_package_new.zip" -Force
Remove-Item $deployDir -Recurse -Force
Write-Host "Package created: deploy_package_new.zip"
