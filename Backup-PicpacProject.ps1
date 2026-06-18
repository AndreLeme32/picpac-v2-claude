param(
    [Parameter(Mandatory = $false)]
    [string]$SourcePath = (Join-Path -Path $env:USERPROFILE -ChildPath 'picpac-v2-claude'),

    [Parameter(Mandatory = $false)]
    [string]$BackupRoot = (Join-Path -Path $env:USERPROFILE -ChildPath 'backups'),

    [Parameter(Mandatory = $false)]
    [string]$BackupLabel = 'picpac-v2-claude',

    [Parameter(Mandatory = $false)]
    [switch]$Mirror
)

$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupFolderName = "$BackupLabel`_$timestamp"
$DestinationPath = Join-Path -Path $BackupRoot -ChildPath $backupFolderName

if (-not (Test-Path -LiteralPath $SourcePath)) {
    throw "Source path not found: $SourcePath"
}

if (-not (Test-Path -LiteralPath $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
}

New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null

$excludedItems = @(
    'node_modules',
    '.git',
    'sessions',
    'tmp',
    'temp',
    '*.tmp',
    '*.log',
    '*.cache',
    'Thumbs.db',
    '.DS_Store'
)

$robocopyArgs = @(
    '"{0}"' -f $SourcePath
    '"{0}"' -f $DestinationPath
    '/E'
    '/R:3'
    '/W:5'
    '/NP'
    '/NDL'
    '/NFL'
    '/MT:8'
    '/XD'
)

$excludedDirs = @('node_modules', '.git', 'sessions', 'tmp', 'temp')
$robocopyArgs += $excludedDirs | ForEach-Object { '"{0}"' -f $_ }

$robocopyArgs += '/XF'
$excludedFiles = @('*.tmp', '*.log', '*.cache', 'Thumbs.db', '.DS_Store')
$robocopyArgs += $excludedFiles | ForEach-Object { '"{0}"' -f $_ }

if ($Mirror) {
    $robocopyArgs += '/MIR'
}

$arguments = $robocopyArgs -join ' '
$process = Start-Process -FilePath 'robocopy' -ArgumentList $arguments -NoNewWindow -Wait -PassThru

$exitCode = $process.ExitCode

$robocopySuccessCodes = @(0, 1, 2, 3, 4, 5, 6, 7)
$robocopyWarningCodes = @(8)

$summary = [PSCustomObject]@{
    Source      = $SourcePath
    Destination = $DestinationPath
    StartedAt   = (Get-Date).AddSeconds(-$process.TotalProcessorTime.TotalSeconds).ToString('yyyy-MM-dd HH:mm:ss')
    CompletedAt = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    ExitCode    = $exitCode
    Status      = if ($exitCode -in $robocopySuccessCodes) { 'Success' } elseif ($exitCode -in $robocopyWarningCodes) { 'Warning' } else { 'Error' }
}

$summary | Format-List | Out-String | Write-Host

if ($exitCode -gt 8) {
    throw "Robocopy failed with exit code $exitCode. Check the output above for details."
}