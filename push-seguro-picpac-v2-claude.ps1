# Push Seguro - PicPac v2-claude

Write-Host "========================================" -ForegroundColor Green
Write-Host "Push Seguro: picpac-v2-claude -> GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Confirma inicio
$confirm = Read-Host "Iniciar push seguro? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Red
    exit
}

# 1) Criar branch de backup
Write-Host "`n[1/5] Criando branch de backup..." -ForegroundColor Cyan
git checkout -b backup-2026-06-18-old-version
git push -u origin backup-2026-06-18-old-version
git checkout main

# 2) Criar documentacao
Write-Host "`n[2/5] Criando documentacao..." -ForegroundColor Cyan

$version = @"
# picpac-v2-claude

## Versao
- Versao estavel: v2.0-stable-2026-06-18
- Data: 2026-06-18
- Branch de backup: backup-2026-06-18-old-version

## Status
Projeto publicado com backup, changelog e guia de migracao.
"@

$changelog = @"
# CHANGELOG

## v2.0-stable-2026-06-18 - 2026-06-18

### Seguranca
- Criado branch de backup: backup-2026-06-18-old-version
- Adicionada tag estavel: v2.0-stable-2026-06-18
- Documentacao de versao e migracao criada

### Alteracoes
- Commit de todo o conteudo local do projeto
- Push seguro para a branch main
"@

$migration = @"
# MIGRATION GUIDE

## Migrando para v2.0-stable-2026-06-18

1. Faca backup do repositorio atual:
   git checkout -b backup-antes-migracao

2. Atualize a branch principal:
   git checkout main
   git pull origin main

3. Caso necessario, restaure a versao anterior:
   git checkout backup-2026-06-18-old-version
"@

$version | Out-File -FilePath "VERSION.md" -Encoding utf8 -Force
$changelog | Out-File -FilePath "CHANGELOG.md" -Encoding utf8 -Force
$migration | Out-File -FilePath "MIGRATION.md" -Encoding utf8 -Force

Write-Host "Arquivos criados: VERSION.md, CHANGELOG.md, MIGRATION.md" -ForegroundColor Green

# 3) Commit de tudo
Write-Host "`n[3/5] Commitando tudo..." -ForegroundColor Cyan
git add -A
git commit -m "Release v2.0-stable-2026-06-18: backup, docs, commit e push seguro"

# 4) Criar tag
Write-Host "`n[4/5] Criando tag..." -ForegroundColor Cyan
git tag -a v2.0-stable-2026-06-18 -m "Release estavel v2.0-stable-2026-06-18"

# 5) Push para main
Write-Host "`n[5/5] Fazendo push para main..." -ForegroundColor Cyan
git push origin main
git push origin v2.0-stable-2026-06-18

# Status final
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "STATUS FINAL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
git status
git log --oneline -5
git tag -l v2.0-stable-2026-06-18
git branch -a

Write-Host "`nPush seguro concluido com sucesso!" -ForegroundColor Green