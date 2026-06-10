# Entity modelleri ile SQLite tablolarini esitler (C# — migration + dogrulama + veri hizalama)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$db = Join-Path $root 'Database\vireon_local.db'
$proj = Join-Path $root 'Vireon.PresentationLayer\Vireon.PresentationLayer.csproj'

Write-Host "Uygulama kapatiliyor (SQLite kilidi)..."
Get-Process -Name 'Vireon.PresentationLayer' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Set-Location (Join-Path $root 'Vireon.PresentationLayer')
Write-Host "C# veritabani esitleme calistiriliyor..."
dotnet run --project $proj --no-launch-profile -- --align-database
if ($LASTEXITCODE -ne 0) { throw "Veritabani esitleme basarisiz (exit $LASTEXITCODE)." }

Write-Host "OK: $db entity modelleri ile uyumlu."
