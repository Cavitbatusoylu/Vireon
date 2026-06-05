# Paylaşımlı Database/vireon_local.db dosyasını GitHub'a gönderir (ekip senkronu)
param(
    [string]$Message = "chore: sync shared database (vireon_local.db)",
    [string]$Branch = "Cavit-login"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$db = Join-Path $root 'Database\vireon_local.db'

if (-not (Test-Path $db)) {
    throw "Veritabanı bulunamadı: $db"
}

Write-Host "Uygulama kapatılıyor (SQLite kilidi)..."
Get-Process -Name 'Vireon.PresentationLayer' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Set-Location $root

git add Database/vireon_local.db
$staged = git diff --cached --name-only
if ($staged -notcontains 'Database/vireon_local.db') {
    Write-Host "Değişiklik yok — Database/vireon_local.db zaten güncel."
    exit 0
}

git commit -m $Message
git push origin $Branch

Write-Host "OK: Database GitHub'a gönderildi ($Branch)."
Write-Host "Diğer bilgisayarda: git pull origin $Branch"
