┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (WhatsApp)                      │
└────────────────────────┬────────────────────────────────────┘
│
▼
┌─────────────────────────────┐
│      AMANDA (3001)          │
│  Agente de Atendimento      │
└────────────┬────────────────┘
│
▼
┌─────────────────────────────┐
│      ATLAS (3002)           │
│  Gerenciador de Info        │
└────────────┬────────────────┘
│
▼
┌─────────────────────────────┐
│     DECISOR (3004)          │
│  Monta Propostas            │
└────────────┬────────────────┘
│
▼
┌─────────────────────────────┐
│    BLINGBOT (3005)          │
│  Integração com Bling ERP   │
└────────────┬────────────────┘
│
▼
┌─────────────────────────────┐
│    BLING ERP (API)          │
│  Sistema de Gestão          │
└─────────────────────────────┘
## 🔄 Fluxo de Dados

### **Etapa 1: Amanda recebe mensagem**
- Cliente envia mensagem no WhatsApp
- Amanda processa a mensagem
- Extrai informações do cliente

### **Etapa 2: Atlas armazena/gerencia dados**
- Amanda envia dados para Atlas
- Atlas valida e armazena
- Retorna confirmação

### **Etapa 3: Decisor monta proposta**
- Atlas envia dados para Decisor
- Decisor valida e transforma
- Monta proposta em formato padrão
- Retorna proposta estruturada

### **Etapa 4: BlingBot processa no Bling**
- Decisor envia proposta para BlingBot
- BlingBot transforma para formato Bling
- Envia para API Bling
- Retorna ID e status

### **Etapa 5: Proposta retorna ao cliente**
- BlingBot retorna confirmação
- Decisor repassa para Atlas
- Atlas retorna para Amanda
- Amanda envia proposta/pedido ao cliente

---

## 📁 Estrutura de Pastaspicpac-v2-claude/
├── agents/
│   ├── amanda/
│   │   └── src/v2.0/
│   │       ├── amanda.js
│   │       ├── routes.js
│   │       ├── index.js
│   │       ├── package.json
│   │       └── .env.example
│   │
│   ├── atlas/
│   │   └── src/v2.0/
│   │       ├── atlas.js
│   │       ├── routes.js
│   │       ├── index.js
│   │       ├── package.json
│   │       └── .env.example
│   │
│   ├── decisor/
│   │   └── src/v2.0/
│   │       ├── services/
│   │       │   ├── contatos.service.js
│   │       │   └── produtos.service.js
│   │       ├── mappers/
│   │       │   └── propostaMapper.js
│   │       ├── utils/
│   │       │   └── logger.js
│   │       ├── schemas/
│   │       │   └── payloads.schema.json
│   │       ├── decisor.js
│   │       ├── routes.js
│   │       ├── index.js
│   │       ├── package.json
│   │       ├── .env.example
│   │       ├── mock-api.js
│   │       └── node_modules/
│   │
│   └── blingbot/
│       └── src/v2.0/
│           ├── blingbot.js
│           ├── blingbot-routes.js
│           ├── index.js
│           ├── package.json
│           ├── .env.example
│           └── node_modules/
│
└── FLUXO-COMPLETO.md (este arquivo)
---

## 🔌 Portas Utilizadas

| Agente | Porta | Status |
|--------|-------|--------|
| Amanda | 3001 | 📋 (Estrutura base) |
| Atlas | 3002 | 📋 (Estrutura base) |
| Mock API | 3003 | ✅ (Testado) |
| Decisor | 3004 | ✅ (Testado) |
| BlingBot | 3005 | ✅ (Criado) |

---

## 🧪 Como Testar

### **Teste 1: Mock API + Decisor (JÁ FEITO)**
```bash
# Terminal 1: Mock API
cd agents/decisor/src/v2.0
node mock-api.js

# Terminal 2: Decisor
cd agents/decisor/src/v2.0
npm start

# Terminal 3: Teste
curl -X POST http://localhost:3004/receberAtlas \
  -H "Content-Type: application/json" \
  -d '{"nome":"Andre Silva","documento":"29481110800",...}'Resultado esperado: ✅ Proposta estruturada retornada