# MIGRATION GUIDE

## Migrando para v2.0-stable-2026-06-18

1. Faca backup do repositorio atual:
   git checkout -b backup-antes-migracao

2. Atualize a branch principal:
   git checkout main
   git pull origin main

3. Caso necessario, restaure a versao anterior:
   git checkout backup-2026-06-18-old-version
