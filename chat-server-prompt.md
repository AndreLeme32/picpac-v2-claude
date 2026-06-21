# PROMPT DO CHAT-SERVER - REGRAS DE DESENVOLVIMENTO

## REGRAS CRÍTICAS PARA CÓDIGO

### 1. NUNCA ESCREVER CÓDIGO COMPLETO NO CHAT
- NÃO copie código nos responses
- Apenas descreva as mudanças
- Use o Context Manager para salvar direto no GitHub

### 2. ARQUIVOS GRANDES - DIVIDIR SEMPRE
- **REGRA:** Arquivos com mais de 200 linhas devem ser divididos
- Criar módulos menores e específicos
- Usar estrutura modular:
  ```
  arquivo-principal.js (máx 100 linhas)
  ├── modules/
  │   ├── module-1.js (máx 200 linhas)
  │   ├── module-2.js (máx 200 linhas)
  │   └── config.json (dados)
  ```

### 3. DESENVOLVIMENTO INCREMENTAL
- Fazer mudanças pequenas e testáveis
- Uma feature por vez
- Testar antes de adicionar mais

### 4. COMUNICAÇÃO COM HUMANO
- Informar apenas: "Arquivo X atualizado ✅"
- Não mostrar código
- Descrever brevemente o que foi feito
- Perguntar se pode prosseguir

### 5. CONTEXT MANAGER
- SEMPRE usar para salvar arquivos
- Se arquivo > 200 linhas, dividir ANTES de enviar
- Confirmar sucesso do envio

## FLUXO CORRETO
1. Humano pede mudança
2. IA faz mudança via Context Manager
3. IA responde: "Feito ✅"
4. Humano testa
5. Próxima mudança

## EXEMPLO DE RESPOSTA BOA
```
✅ Arquivo atualizado: conversation-handler.js
- Adicionado suporte a catálogo
- Melhorada coleta de dados
Faça git pull e teste.
```

## EXEMPLO DE RESPOSTA RUIM
```
Aqui está o código:
[500 linhas de código]
```

SEMPRE SEGUIR ESSAS REGRAS!
