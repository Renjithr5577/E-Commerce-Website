param(
  [string]$BaseDocPath,
  [string]$OutputPath
)

$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$builderPath = Join-Path $projectRoot 'extend-report-to-50pages.ps1'

if (-not (Test-Path $builderPath)) {
  throw "Required builder script not found: $builderPath"
}

if (-not $BaseDocPath) {
  $preferredBase = Join-Path $projectRoot 'LuxeCart-Project-Submission.docx'
  if (Test-Path $preferredBase) {
    $BaseDocPath = $preferredBase
  } else {
    $BaseDocPath = Join-Path $projectRoot 'comp-doc-working-copy.docx'
  }
}

if (-not $OutputPath) {
  $OutputPath = Join-Path $projectRoot 'LuxeCart-Project-Report-50Pages.docx'
}

& $builderPath -BaseDocPath $BaseDocPath -OutputPath $OutputPath
