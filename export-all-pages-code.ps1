param(
  [string]$OutputPath,
  [string]$DownloadsPath
)

$ErrorActionPreference = 'Stop'

$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$pageRoot = Join-Path $projectRoot 'frontend\src\app\pages'

if (-not $OutputPath) {
  $OutputPath = Join-Path $projectRoot 'LuxeCart-All-Pages-Code.txt'
}

if (-not $DownloadsPath) {
  $DownloadsPath = 'C:\Users\Admin\Downloads\LuxeCart-All-Pages-Code.txt'
}

if (-not (Test-Path $pageRoot)) {
  throw "Pages folder not found: $pageRoot"
}

$builder = New-Object System.Text.StringBuilder
$null = $builder.AppendLine('LUXECART ALL PAGES CODE')
$null = $builder.AppendLine('')
$null = $builder.AppendLine('Generated on: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
$null = $builder.AppendLine('Source root: ' + $pageRoot)
$null = $builder.AppendLine('')

$pageDirs = Get-ChildItem -Path $pageRoot -Directory | Sort-Object Name

foreach ($dir in $pageDirs) {
  $null = $builder.AppendLine(('=' * 100))
  $null = $builder.AppendLine(('PAGE: ' + $dir.Name).ToUpperInvariant())
  $null = $builder.AppendLine(('=' * 100))
  $null = $builder.AppendLine('')

  $files = Get-ChildItem -Path $dir.FullName -File | Sort-Object Extension, Name

  foreach ($file in $files) {
    $null = $builder.AppendLine(('-' * 100))
    $null = $builder.AppendLine('FILE: ' + $file.FullName)
    $null = $builder.AppendLine(('-' * 100))
    $null = $builder.AppendLine('')
    $null = $builder.AppendLine((Get-Content -LiteralPath $file.FullName -Raw))
    $null = $builder.AppendLine('')
  }
}

[IO.File]::WriteAllText($OutputPath, $builder.ToString(), [Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath $OutputPath -Destination $DownloadsPath -Force

Write-Output "TEXT_READY: $OutputPath"
Write-Output "DOWNLOADS_COPY: $DownloadsPath"
