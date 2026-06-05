# PWA / favicon için kare PNG ikonlar (manifest sizes ile birebir)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root 'Vireon.PresentationLayer\wwwroot\images\vireon-logo-transparent-new.png'
$outDir = Join-Path $root 'Vireon.PresentationLayer\wwwroot\images\pwa'

if (-not (Test-Path $srcPath)) { throw "Kaynak PNG bulunamadı: $srcPath" }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Save-SquareIcon {
    param(
        [System.Drawing.Image]$Source,
        [int]$Side,
        [string]$Path,
        [double]$PaddingRatio = 0.12
    )
    $bmp = New-Object System.Drawing.Bitmap $Side, $Side
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(10, 15, 26))

    $inner = [int]($Side * (1.0 - $PaddingRatio))
    $scale = [Math]::Min($inner / $Source.Width, $inner / $Source.Height)
    $w = [int]($Source.Width * $scale)
    $h = [int]($Source.Height * $scale)
    $x = [int](($Side - $w) / 2)
    $y = [int](($Side - $h) / 2)
    $g.DrawImage($Source, $x, $y, $w, $h)
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$src = [System.Drawing.Image]::FromFile($srcPath)
try {
    foreach ($size in @(72, 96, 128, 192, 384, 512)) {
        $out = Join-Path $outDir "icon-$size.png"
        Save-SquareIcon -Source $src -Side $size -Path $out
        Write-Host "OK: $out"
    }
}
finally {
    $src.Dispose()
}
