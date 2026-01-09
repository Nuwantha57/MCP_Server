param()

Write-Host "=== Claude Desktop MCP Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "Node.js installed: $nodeVersion" -ForegroundColor Green
}
else {
    Write-Host "Node.js not found" -ForegroundColor Red
    exit 1
}

# Step 2: Create Claude config directory
Write-Host "[2/4] Setting up Claude config directory..." -ForegroundColor Yellow
$claudeConfigDir = "$env:APPDATA\Claude"
if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}
Write-Host "Directory: $claudeConfigDir" -ForegroundColor Green

# Step 3: Copy configuration
Write-Host "[3/4] Copying MCP configuration..." -ForegroundColor Yellow
$configSource = "c:\MCP_Server\claude_desktop_config.json"
$configDest = "$claudeConfigDir\claude_desktop_config.json"

if (Test-Path $configSource) {
    Copy-Item -Path $configSource -Destination $configDest -Force
    Write-Host "Config copied" -ForegroundColor Green
}
else {
    Write-Host "Config file not found" -ForegroundColor Red
    exit 1
}

# Step 4: Test bridge
Write-Host "[4/4] Testing bridge server..." -ForegroundColor Yellow
$bridgeProcess = Start-Process -FilePath "node" -ArgumentList "c:\MCP_Server\bridge.js" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

$testPayload = @{ tool = "echo"; args = @{ message = "Test" } } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000" -Method POST -Body $testPayload -ContentType "application/json" -ErrorAction SilentlyContinue

if ($response) {
    Write-Host "Bridge server OK" -ForegroundColor Green
    Stop-Process -Id $bridgeProcess.Id -Force
}
else {
    Write-Host "Bridge server error" -ForegroundColor Red
    Stop-Process -Id $bridgeProcess.Id -Force
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start bridge server: cd c:\MCP_Server; node bridge.js"
Write-Host "2. Restart Claude Desktop"
Write-Host "3. Test with prompts in Claude Desktop"
Write-Host ""
