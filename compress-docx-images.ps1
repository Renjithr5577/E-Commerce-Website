param(
  [Parameter(Mandatory = $true)]
  [string]$InputDocx,

  [Parameter(Mandatory = $true)]
  [string]$OutputDocx,

  [int]$MaxDimension = 1280,
  [int]$JpegQuality = 80,
  [int]$MinBytesToCompress = 250000
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' } |
    Select-Object -First 1
}

function Save-AsJpeg {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [int]$Quality = 80
  )

  $codec = Get-JpegCodec
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]$Quality)

  try {
    $Bitmap.Save($Path, $codec, $encoderParameters)
  } finally {
    $encoderParameters.Dispose()
  }
}

function New-ScaledBitmap {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Image]$Image,
    [int]$MaxDimension = 1280
  )

  $scale = [Math]::Min($MaxDimension / [double]$Image.Width, $MaxDimension / [double]$Image.Height)
  $scale = [Math]::Min($scale, 1.0)

  $width = [Math]::Max(1, [int][Math]::Round($Image.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($Image.Height * $scale))

  $bitmap = New-Object System.Drawing.Bitmap($width, $height)
  $bitmap.SetResolution(96, 96)

  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($Image, 0, 0, $width, $height)
  } finally {
    $graphics.Dispose()
  }

  $bitmap
}

function Update-RelationshipsTarget {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.Compression.ZipArchive]$Zip,
    [Parameter(Mandatory = $true)]
    [string]$OldMediaName,
    [Parameter(Mandatory = $true)]
    [string]$NewMediaName
  )

  foreach ($relsEntry in $Zip.Entries | Where-Object { $_.FullName -like 'word/_rels/*.rels' }) {
    $xml = New-Object xml
    $stream = $relsEntry.Open()
    try {
      $xml.Load($stream)
    } finally {
      $stream.Dispose()
    }

    $updated = $false

    foreach ($relationship in $xml.Relationships.Relationship) {
      $target = [string]$relationship.Target
      if ($target -eq "media/$OldMediaName") {
        $relationship.Target = "media/$NewMediaName"
        $updated = $true
      }
    }

    if ($updated) {
      $entryName = $relsEntry.FullName
      $relsEntry.Delete()
      $newEntry = $Zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
      $writer = New-Object System.IO.StreamWriter($newEntry.Open())
      try {
        $writer.Write($xml.OuterXml)
      } finally {
        $writer.Dispose()
      }
    }
  }
}

if (-not (Test-Path -LiteralPath $InputDocx)) {
  throw "Input file not found: $InputDocx"
}

Copy-Item -LiteralPath $InputDocx -Destination $OutputDocx -Force

$zip = [System.IO.Compression.ZipFile]::Open($OutputDocx, [System.IO.Compression.ZipArchiveMode]::Update)
$tempDir = Join-Path $env:TEMP ("docx-compress-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir | Out-Null

$summary = New-Object System.Collections.Generic.List[object]

try {
  $mediaEntries = @(
    $zip.Entries |
      Where-Object {
        $_.FullName -like 'word/media/*' -and
        $_.Length -ge $MinBytesToCompress -and
        $_.FullName.ToLowerInvariant().EndsWith('.png')
      } |
      Sort-Object Length -Descending
  )

  foreach ($entry in $mediaEntries) {
    $oldMediaName = [IO.Path]::GetFileName($entry.FullName)
    $baseName = [IO.Path]::GetFileNameWithoutExtension($oldMediaName)
    $tempOriginal = Join-Path $tempDir $oldMediaName
    $tempCompressed = Join-Path $tempDir ($baseName + '.jpg')

    $outStream = [IO.File]::Open($tempOriginal, [IO.FileMode]::Create, [IO.FileAccess]::Write)
    $inStream = $entry.Open()
    try {
      $inStream.CopyTo($outStream)
    } finally {
      $inStream.Dispose()
      $outStream.Dispose()
    }

    $image = [System.Drawing.Image]::FromFile($tempOriginal)
    try {
      $bitmap = New-ScaledBitmap -Image $image -MaxDimension $MaxDimension
      try {
        Save-AsJpeg -Bitmap $bitmap -Path $tempCompressed -Quality $JpegQuality
      } finally {
        $bitmap.Dispose()
      }
    } finally {
      $image.Dispose()
    }

    $originalSize = (Get-Item -LiteralPath $tempOriginal).Length
    $compressedSize = (Get-Item -LiteralPath $tempCompressed).Length

    if ($compressedSize -ge ($originalSize * 0.95)) {
      Remove-Item -LiteralPath $tempOriginal, $tempCompressed -Force
      continue
    }

    $newMediaName = $baseName + '.jpg'
    $newEntryPath = 'word/media/' + $newMediaName

    Update-RelationshipsTarget -Zip $zip -OldMediaName $oldMediaName -NewMediaName $newMediaName

    $entry.Delete()

    $existingNewEntry = $zip.GetEntry($newEntryPath)
    if ($existingNewEntry) {
      $existingNewEntry.Delete()
    }

    $newEntry = $zip.CreateEntry($newEntryPath, [System.IO.Compression.CompressionLevel]::Optimal)
    $newEntryStream = $newEntry.Open()
    $compressedStream = [IO.File]::OpenRead($tempCompressed)
    try {
      $compressedStream.CopyTo($newEntryStream)
    } finally {
      $compressedStream.Dispose()
      $newEntryStream.Dispose()
    }

    [void]$summary.Add([pscustomobject]@{
        OldName       = $oldMediaName
        NewName       = $newMediaName
        OriginalBytes = $originalSize
        NewBytes      = $compressedSize
      })

    Remove-Item -LiteralPath $tempOriginal, $tempCompressed -Force
  }

  $contentTypesEntry = $zip.GetEntry('[Content_Types].xml')
  if ($contentTypesEntry) {
    $contentTypesXml = New-Object xml
    $stream = $contentTypesEntry.Open()
    try {
      $contentTypesXml.Load($stream)
    } finally {
      $stream.Dispose()
    }

    $jpgDefault = $contentTypesXml.Types.Default | Where-Object { $_.Extension -eq 'jpg' } | Select-Object -First 1
    if (-not $jpgDefault) {
      $defaultElement = $contentTypesXml.CreateElement('Default', 'http://schemas.openxmlformats.org/package/2006/content-types')
      [void]$defaultElement.SetAttribute('Extension', 'jpg')
      [void]$defaultElement.SetAttribute('ContentType', 'image/jpeg')
      [void]$contentTypesXml.Types.AppendChild($defaultElement)
    }

    $contentTypesEntry.Delete()
    $newContentTypesEntry = $zip.CreateEntry('[Content_Types].xml', [System.IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object System.IO.StreamWriter($newContentTypesEntry.Open())
    try {
      $writer.Write($contentTypesXml.OuterXml)
    } finally {
      $writer.Dispose()
    }
  }
} finally {
  $zip.Dispose()
  if (Test-Path -LiteralPath $tempDir) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force
  }
}

$outputInfo = Get-Item -LiteralPath $OutputDocx
$summary | Format-Table -AutoSize | Out-String | Write-Output
Write-Output ("OUTPUT_BYTES: {0}" -f $outputInfo.Length)
Write-Output ("OUTPUT_MB: {0:N2}" -f ($outputInfo.Length / 1MB))
