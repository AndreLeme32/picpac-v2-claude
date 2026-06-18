#requires -Version 5.1
<<#
.SYNOPSIS
    Script seguro para push do projeto picpac-v2-claude para GitHub.
.DESCRIPTION
    1) Cria branch backup-2026-06-18-old-version do HEAD atual.
    2) Cria documentacao VERSION.md, CHANGELOG.md, MIGRATION.md.
    3) Adiciona e commita tudo do computador.
    4) Cria tag v2.0-stable-2026-06-18.
    5) Faz push para main branch.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$RepoRoot = (Get-Location).Path,
    [string]$BranchBackup = "backup-2026-06-18-old-version",
    [string]$TagName = "v2.0-stable-2026-06-18",
    [string]$RemoteName = "origin",
    [string]$MainBranch = "main"
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
    param([string]$Arguments)
    Write-Host "[git] $Arguments" -ForegroundColor Cyan
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "git"
    $psi.Arguments = $Arguments
    $psi.WorkingDirectory = $RepoRoot
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($psi)
    $proc.WaitForExit()
    $out = $proc.StandardOutput.ReadToEnd()
    $err = $proc.StandardError.ReadToEnd()
    if ($out) { Write-Host $out }
    if ($err) { Write-Host $err -ForegroundColor Yellow }
    if ($proc.ExitCode -ne 0) {
        throw "git $Arguments falhou com codigo $($proc.ExitCode)."
    }
    return $out
}

function Read-YesNo {
    param([string]$Prompt)
    do {
        $res = Read-Host "$Prompt (S/N)"
    } while ($res -notmatch '^[sSnN]$')
    return $res -match '^[sS]$'
}

# Verifica diretorio
if (-not (Test-Path -Path $RepoRoot -PathType Container)) {
    throw "Diretorio nao encontrado: $RepoRoot"
}
Set-Location -Path $RepoRoot

Write-Host "========================================" -ForegroundColor Green
Write-Host "Push seguro: picpac-v2-claude -> GitHub" -ForegroundColor Green
Write-Host "RepoRoot: $RepoRoot" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Verifica repositorio git
Invoke-Git "rev-parse --git-dir" | Out-Null

# Confirma inicio
if (-not (Read-YesNo "Iniciar push seguro? Isso criara backup, docs, commit, tag e push para $MainBranch")) {
    Write-Host "Operacao cancelada." -ForegroundColor Red
    exit 0
}

# 1) Backup do GitHub atual
Write-Host "`n[1/5] Criando branch de backup: $BranchBackup" -ForegroundColor Cyan
Invoke-Git "checkout -b $BranchBackup"
Invoke-Git "push -u $RemoteName $BranchBackup"
Invoke-Git "checkout $MainBranch"

# 2) Criar documentacao
Write-Host "`n[2/5] Criando documentacao (VERSION.md, CHANGELOG.md, MIGRATION.md)" -ForegroundColor Cyan

$versionMd = @"
# picpac-v2-claude

## Versao

- Versao estavel: **$TagName**
- Data: 2026-06-18
- Branch principal: $MainBranch
- Branch de backup: $BranchBackup

## Status

Este projeto foi publicado de forma segura com backup, changelog, guia de migracao e tag estavel.
"@

$changelogMd = @"
# CHANGELOG

## $TagName - 2026-06-18

### Seguranca

- Criado branch de backup: $BranchBackup.
- Adicionada tag estavel: $TagName.
- Documentacao de versao e migracao criada.

### Alteracoes

- Commit de todo o conteudo local do projeto.
- Push seguro para a branch $MainBranch.
"@

$migrationMd = @"
# MIGRATION GUIDE

## Migrando para $TagName

1. Faca backup do repositorio atual:
   git checkout -b backup-antes-migracao

2. Atualize a branch principal:
   git checkout $MainBranch
   git pull $RemoteName $MainBranch

3. Caso necessario, restaure a versao anterior a partir de $BranchBackup.

## Contato

Consulte o branch $BranchBackup para a versao anterior.
"@

$versionMd | Out-File -FilePath (Join-Path $RepoRoot "VERSION.md") -Encoding utf8 -Force
$changelogMd | Out-File -FilePath (Join-Path $RepoRoot "CHANGELOG.md") -Encoding utf8 -Force
$migrationMd | Out-File -FilePath (Join-Path $RepoRoot "MIGRATION.md") -Encoding utf8 -Force

# 3) Commit de tudo do computador
Write-Host "`n[3/5] Commitando tudo do computador" -ForegroundColor Cyan
Invoke-Git "add -A"
$status = Invoke-Git "status --short"
if ($status -and $status.Trim().Length -gt 0) {
    Invoke-Git "commit -m \"Publish $TagName: backup, docs, commit e push seguro\""
} else {
    Write-Host "Nada novo para commitar." -ForegroundColor Yellow
}

# 4) Criar tag
Write-Host "`n[4/5] Criando tag: $TagName" -ForegroundColor Cyan
$existingTag = Invoke-Git "tag -l $TagName"
if ($existingTag -and $existingTag.Trim() -eq $TagName) {
    Write-Host "Tag ja existe. Deletando local e remoto." -ForegroundColor Yellow
    Invoke-Git "tag -d $TagName"
    Invoke-Git "push $RemoteName --delete refs/tags/$TagName"
}
Invoke-Git "tag -a $TagName -m \"Release estavel $TagName\""

# 5) Push para main
Write-Host "`n[5/5] Fazendo push para $MainBranch e tag" -ForegroundColor Cyan
if ($PSCmdlet.ShouldProcess("$RemoteName $MainBranch", "push")) {
    Invoke-Git "push $RemoteName $MainBranch"
    Invoke-Git "push $RemoteName $TagName"
}

# Status final
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "STATUS FINAL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Invoke-Git "status"
Invoke-Git "log --oneline -5"
Invoke-Git "tag -l $TagName"
Invoke-Git "branch -a"
Write-Host "`nPush seguro concluido com sucesso." -ForegroundColor Green