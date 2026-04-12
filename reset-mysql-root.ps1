param(
  [string]$NewPassword = 'TempRoot@2026!'
)

$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  $escapedScriptPath = $PSCommandPath.Replace("'", "''")
  $escapedPassword = $NewPassword.Replace("'", "''")
  $elevatedCommand = "& '$escapedScriptPath' -NewPassword '$escapedPassword'"

  Start-Process `
    -FilePath 'powershell.exe' `
    -Verb RunAs `
    -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $elevatedCommand)

  Write-Host 'Approve the UAC prompt. The reset will continue in the new Administrator PowerShell window.'
  exit 0
}

$mysqlBin = 'C:\Program Files\MySQL\MySQL Server 8.0\bin'
$mysqldPath = Join-Path $mysqlBin 'mysqld.exe'
$mysqlPath = Join-Path $mysqlBin 'mysql.exe'
$mysqlAdminPath = Join-Path $mysqlBin 'mysqladmin.exe'
$defaultsFile = 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini'
$initFile = Join-Path $env:TEMP 'mysql-reset-init.sql'
$stdoutLog = Join-Path $env:TEMP 'mysql-reset-stdout.log'
$stderrLog = Join-Path $env:TEMP 'mysql-reset-stderr.log'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $projectRoot 'backend\.env'
$manualProcess = $null

if (-not (Test-Path $mysqldPath)) {
  throw "Could not find mysqld.exe at $mysqldPath"
}

@"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$NewPassword';
FLUSH PRIVILEGES;
"@ | Set-Content -LiteralPath $initFile -Encoding ascii

try {
  Remove-Item -LiteralPath $stdoutLog, $stderrLog -ErrorAction SilentlyContinue

  Stop-Service -Name MySQL80 -Force
  $service = Get-Service -Name MySQL80
  $service.WaitForStatus('Stopped', '00:00:20')

  $manualProcess = Start-Process `
    -FilePath $mysqldPath `
    -ArgumentList @("--defaults-file=`"$defaultsFile`"", "--init-file=`"$initFile`"", '--console') `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

  $connected = $false

  for ($attempt = 1; $attempt -le 20; $attempt++) {
    Start-Sleep -Seconds 2

    if ($manualProcess.HasExited) {
      break
    }

    & $mysqlPath --protocol=TCP --connect-timeout=2 -u root "-p$NewPassword" -e "SELECT 1 AS connected;" | Out-Null

    if ($LASTEXITCODE -eq 0) {
      $connected = $true
      break
    }
  }

  if (-not $connected) {
    $stderrTail = ''

    if (Test-Path $stderrLog) {
      $stderrTail = (Get-Content $stderrLog -Tail 20) -join [Environment]::NewLine
    }

    if ([string]::IsNullOrWhiteSpace($stderrTail)) {
      throw 'MySQL started, but the new root password could not be verified.'
    }

    throw "MySQL started, but the new root password could not be verified.`n`nMySQL log:`n$stderrTail"
  }
} finally {
  if ($manualProcess -and -not $manualProcess.HasExited) {
    Stop-Process -Id $manualProcess.Id -Force
    Start-Sleep -Seconds 2
  }

  Start-Service -Name MySQL80
  (Get-Service -Name MySQL80).WaitForStatus('Running', '00:00:20')
  Remove-Item -LiteralPath $initFile -ErrorAction SilentlyContinue
}

& $mysqlAdminPath --protocol=TCP --connect-timeout=5 -u root "-p$NewPassword" ping | Out-Null

if ($LASTEXITCODE -ne 0) {
  throw 'MySQL service restarted, but the new password still does not work.'
}

if (Test-Path $envFile) {
  $envContent = Get-Content $envFile -Raw
  $updatedEnv = [regex]::Replace($envContent, '^DB_PASSWORD=.*$', "DB_PASSWORD=$NewPassword", 'Multiline')
  Set-Content -LiteralPath $envFile -Value $updatedEnv -Encoding ascii
}

Write-Host "MySQL root password reset complete."
Write-Host "Password: $NewPassword"
Write-Host 'The backend .env file was updated if it already existed.'
