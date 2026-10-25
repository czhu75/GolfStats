Add-Type -AssemblyName System.Drawing

function New-GolfIcon {
  param([int]$Size, [string]$Path, [double]$Scale = 1.0)

  $s = ($Size / 512.0) * $Scale
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(255, 6, 10, 9))

  $cx = 256 * $s
  $cy = 256 * $s
  $lime = [System.Drawing.Color]::FromArgb(255, 201, 255, 53)
  $white = [System.Drawing.Color]::FromArgb(255, 244, 255, 249)

  # outer ring
  $ringW = 18 * $s
  $r = 150 * $s
  $ringPen = New-Object System.Drawing.Pen($lime, [float]$ringW)
  $g.DrawEllipse($ringPen, [float]($cx - $r), [float]($cy - $r), [float](2 * $r), [float](2 * $r))

  # flag pole
  $poleX = $cx + 26 * $s
  $polePen = New-Object System.Drawing.Pen($lime, [float](20 * $s))
  $g.DrawLine($polePen, [float]$poleX, [float](150 * $s), [float]$poleX, [float](356 * $s))

  # flag
  $flagBrush = New-Object System.Drawing.SolidBrush($lime)
  $pts = @(
    (New-Object System.Drawing.PointF([float]$poleX, [float](150 * $s))),
    (New-Object System.Drawing.PointF([float]($poleX - 122 * $s), [float](196 * $s))),
    (New-Object System.Drawing.PointF([float]$poleX, [float](242 * $s)))
  )
  $g.FillPolygon($flagBrush, $pts)

  # ball
  $ballBrush = New-Object System.Drawing.SolidBrush($white)
  $br = 42 * $s
  $bx = $cx - 62 * $s
  $by = $cy + 86 * $s
  $g.FillEllipse($ballBrush, [float]($bx - $br), [float]($by - $br), [float](2 * $br), [float](2 * $br))

  # dimples
  $dimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 180, 200, 190))
  $dr = 6 * $s
  foreach ($o in @(@(-18, -14), @(14, -16), @(-2, 12))) {
    $dx = $bx + $o[0] * $s
    $dy = $by + $o[1] * $s
    $g.FillEllipse($dimBrush, [float]($dx - $dr), [float]($dy - $dr), [float](2 * $dr), [float](2 * $dr))
  }

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $dimBrush.Dispose(); $ballBrush.Dispose(); $flagBrush.Dispose()
  $ringPen.Dispose(); $polePen.Dispose()
  $g.Dispose(); $bmp.Dispose()
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
New-GolfIcon -Size 192 -Path (Join-Path $here 'icon-192.png')
New-GolfIcon -Size 512 -Path (Join-Path $here 'icon-512.png')
New-GolfIcon -Size 180 -Path (Join-Path $here 'icon-180.png')
# maskable icons are cropped to a circle by Android; keep art inside the 80% safe zone
New-GolfIcon -Size 512 -Scale 0.72 -Path (Join-Path $here 'icon-maskable-512.png')

Get-ChildItem (Join-Path $here 'icon-*.png') | ForEach-Object { "$($_.Name) $($_.Length) bytes" }
