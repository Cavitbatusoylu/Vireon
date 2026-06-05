# Paylasimli Database/vireon_local.db dosyasini GitHub'a gonderir (ekip senkronu)
param(
    [string]$Message = "chore: sync shared database (vireon_local.db)",
    [string]$Branch = "Cavit-login"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$db = Join-Path $root 'Database\vireon_local.db'

if (-not (Test-Path $db)) {
    throw "Veritabani bulunamadi: $db"
}

Write-Host "Uygulama kapatiliyor (SQLite kilidi)..."
Get-Process -Name 'Vireon.PresentationLayer' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Set-Location $root

git add Database/vireon_local.db
$staged = git diff --cached --name-only
if ($staged -notcontains 'Database/vireon_local.db') {
    Write-Host "Degisiklik yok - Database/vireon_local.db zaten guncel."
    exit 0
}

git commit -m $Message
git push origin $Branch

Write-Host "OK: Database push edildi (branch: $Branch)."
Write-Host "Diger bilgisayarda: git pull origin $Branch"
