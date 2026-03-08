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

# Compress using tar
# Change to deploy_temp to zip contents at root of zip, or zip the folder? 
# Better to zip the contents so extraction is easier.
Set-Location $deployDir
tar -a -cf ..\deploy_package.zip *
Set-Location ..

Remove-Item $deployDir -Recurse -Force
Write-Host "Package created: deploy_package.zip"
