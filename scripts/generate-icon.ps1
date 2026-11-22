Add-Type -AssemblyName System.Drawing

$resDir = Join-Path $PSScriptRoot "..\resources"
if (-not (Test-Path $resDir)) {
  New-Item -ItemType Directory -Path $resDir -Force | Out-Null
}

function New-RgbIconBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = [float]($size * 0.06)
  $w = [float]($size - $pad * 2)
  $radius = [float]($size * 0.22)

  # Fundo arredondado escuro (#0B101D)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $path.AddArc($pad, $pad, $d, $d, 180, 90)
  $path.AddArc($pad + $w - $d, $pad, $d, $d, 270, 90)
  $path.AddArc($pad + $w - $d, $pad + $w - $d, $d, $d, 0, 90)
  $path.AddArc($pad, $pad + $w - $d, $d, $d, 90, 90)
  $path.CloseFigure()

  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new(0, 0),
    [System.Drawing.PointF]::new($size, $size),
    [System.Drawing.Color]::FromArgb(255, 15, 23, 42),
    [System.Drawing.Color]::FromArgb(255, 9, 11, 18)
  )
  $g.FillPath($bgBrush, $path)

  # Borda sutil ciano/roxo
  $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, 34, 211, 238), [Math]::Max(1.0, $size * 0.025))
  $g.DrawPath($borderPen, $path)

  # Anel RGB principal (Ciano -> Roxo -> Magenta -> Ciano)
  $ringPad = [float]($size * 0.23)
  $ringW = [float]($size - $ringPad * 2)
  $ringRect = [System.Drawing.RectangleF]::new($ringPad, $ringPad, $ringW, $ringW)
  $stroke = [Math]::Max(2.0, $size * 0.11)

  $pCyan = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 240, 255), $stroke)
  $pCyan.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pCyan.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($pCyan, $ringRect, -135, 110)

  $pPurple = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 124, 58, 237), $stroke)
  $pPurple.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pPurple.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($pPurple, $ringRect, -15, 110)

  $pPink = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 236, 72, 153), $stroke)
  $pPink.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pPink.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($pPink, $ringRect, 105, 110)

  # Núcleo luminoso central (estrela/prisma)
  $cx = [float]($size / 2.0)
  $cy = [float]($size / 2.0)
  $coreR = [float]($size * 0.14)
  $coreBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 249, 255))
  $g.FillEllipse($coreBrush, $cx - $coreR, $cy - $coreR, $coreR * 2, $coreR * 2)

  $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(110, 0, 240, 255))
  $glowR = [float]($size * 0.21)
  $g.FillEllipse($glowBrush, $cx - $glowR, $cy - $glowR, $glowR * 2, $glowR * 2)

  $g.Dispose()
  return $bmp
}

$png256 = New-RgbIconBitmap 256
$pngPath = Join-Path $resDir "icon.png"
$png256.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$tray32 = New-RgbIconBitmap 32
$trayPath = Join-Path $resDir "tray-icon.png"
$tray32.Save($trayPath, [System.Drawing.Imaging.ImageFormat]::Png)
$tray32.Dispose()

# Gera icon.ico multi-resolução (16, 32, 48, 256) usando PNG embutido no formato ICO padrão do Windows
$sizes = @(16, 32, 48, 256)
$pngStreams = @()
foreach ($s in $sizes) {
  $bmp = New-RgbIconBitmap $s
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngStreams += ,($ms.ToArray())
  $ms.Dispose()
  $bmp.Dispose()
}
$png256.Dispose()

$icoPath = Join-Path $resDir "icon.ico"
$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)
# ICONDIR header: reserved=0, type=1 (icon), count=4
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$sizes.Count)

$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]
  $data = $pngStreams[$i]
  $wByte = if ($s -ge 256) { [byte]0 } else { [byte]$s }
  $bw.Write($wByte)         # Width
  $bw.Write($wByte)         # Height
  $bw.Write([byte]0)        # ColorCount
  $bw.Write([byte]0)        # Reserved
  $bw.Write([uint16]1)      # Planes
  $bw.Write([uint16]32)     # BitCount
  $bw.Write([uint32]$data.Length)
  $bw.Write([uint32]$offset)
  $offset += $data.Length
}
foreach ($data in $pngStreams) {
  $bw.Write($data)
}
$bw.Flush()
$bw.Close()
$fs.Close()

Write-Output "OK: Generated $icoPath, $pngPath, $trayPath"
