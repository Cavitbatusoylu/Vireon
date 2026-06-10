# Kare 256x256 ikon üretir (Windows Electron görev çubuğu için)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$srcPath = Join-Path $root 'Vireon.PresentationLayer\wwwroot\images\vireon-logo-transparent-new.png'
$outDir = Join-Path $root 'tools\electron'
$pngOut = Join-Path $outDir 'icon.png'
$icoOut = Join-Path $outDir 'icon.ico'

if (-not (Test-Path $srcPath)) { throw "Kaynak PNG bulunamadı: $srcPath" }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = [System.Drawing.Image]::FromFile($srcPath)
try {
    $side = 256
    $bmp = New-Object System.Drawing.Bitmap $side, $side
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

    $scale = [Math]::Min($side / $src.Width, $side / $src.Height)
    $w = [int]($src.Width * $scale)
    $h = [int]($src.Height * $scale)
    $x = [int](($side - $w) / 2)
    $y = [int](($side - $h) / 2)
    $g.DrawImage($src, $x, $y, $w, $h)
    $g.Dispose()

    $bmp.Save($pngOut, [System.Drawing.Imaging.ImageFormat]::Png)

    # ICO: tek 256 katman (System.Drawing)
    $iconHandle = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $fs = [System.IO.File]::Open($icoOut, [System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()
    $icon.Dispose()
    $bmp.Dispose()
}
finally {
    $src.Dispose()
}

Write-Host "OK: $pngOut"
Write-Host "OK: $icoOut"
