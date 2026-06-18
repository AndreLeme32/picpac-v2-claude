$projectName = "picpac-v2-claude"
$sourcePath = "."  # Ajuste conforme necessário: "C:\Projetos\$projectName"
$dateString = Get-Date -Format "yyyyMMdd_HHmmss"
$zipFileName = "$projectName`_$dateString.zip"
$zipFilePath = Join-Path -Path $PWD -ChildPath $zipFileName

$excludedItems = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "out",
    "coverage",
    "*.zip",
    "*.log"
)

$sevenZipPath = "C:\Program Files\7-Zip\7z.exe"

if (-not (Test-Path -Path $sourcePath)) {
    Write-Error "Source path not found: $sourcePath"
    exit 1
}

if (Test-Path -Path $zipFilePath) {
    Remove-Item -Path $zipFilePath -Force
}

if (Test-Path -Path $sevenZipPath) {
    Write-Host "Using 7-Zip..." -ForegroundColor Cyan

    $arguments = @(
        "a",
        "-tzip",
        "-r",
        "-mx=5",
        "`"$zipFilePath`""
    )

    foreach ($item in $excludedItems) {
        $arguments += "-x!`"$item`""
    }

    $arguments += "`"$sourcePath\*`""

    & "$sevenZipPath" @arguments

    if ($LASTEXITCODE -ne 0) {
        Write-Error "7-Zip failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}
else {
    Write-Warning "7-Zip not found. Falling back to Compress-Archive..."

    $tempSource = Join-Path -Path $env:TEMP -ChildPath "$projectName`_source"

    if (Test-Path -Path $tempSource) {
        Remove-Item -Path $tempSource -Recurse -Force
    }

    Copy-Item -Path $sourcePath -Destination $tempSource -Recurse -Force

    foreach ($item in $excludedItems) {
        $fullPath = Join-Path -Path $tempSource -ChildPath $item
        if (Test-Path -Path $fullPath) {
            Remove-Item -Path $fullPath -Recurse -Force
        }
    }

    Compress-Archive -Path "$tempSource\*" -DestinationPath $zipFilePath -Force

    Remove-Item -Path $tempSource -Recurse -Force
}

if (Test-Path -Path $zipFilePath) {
    $fileSize = (Get-Item -Path $zipFilePath).Length
    Write-Host "Backup created successfully!" -ForegroundColor Green
    Write-Host "File: $zipFilePath"
    Write-Host "Size: $([math]::Round($fileSize / 1MB, 2)) MB"
}
else {
    Write-Error "Backup failed. Archive not found."
    exit 1
}