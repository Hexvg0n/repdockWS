$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
$mongoExe = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
$dbPath = Join-Path $workspace ".mongo-data"
$logPath = Join-Path $dbPath "mongod.log"

if (-not (Test-Path $mongoExe)) {
  throw "mongod.exe was not found at $mongoExe"
}

New-Item -ItemType Directory -Force $dbPath | Out-Null

Write-Host "Starting MongoDB on 127.0.0.1:27017"
Write-Host "Data: $dbPath"
Write-Host "Log:  $logPath"
Write-Host ""
Write-Host "Keep this window open while working on the app."
Write-Host ""

& $mongoExe `
  --dbpath $dbPath `
  --bind_ip 127.0.0.1 `
  --port 27017 `
  --wiredTigerCacheSizeGB 0.5 `
  --setParameter diagnosticDataCollectionEnabled=false `
  --logpath $logPath `
  --logappend
