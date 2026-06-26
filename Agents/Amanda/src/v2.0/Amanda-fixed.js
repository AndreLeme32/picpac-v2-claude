const { OpenAI } = require('openai');
const axios = require('axios');
const BoxPricingCalculator = require('./calculator');
const logger = require('../../../decisor/src/v2.0/utils/logger');

const memory = new Map();
const clientData = new Map();
const calculator = new BoxPricingCalculator();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
Você é AMANDA, assistente oficial da PicPac e Leme32.

Atende exclusivamente via WhatsApp.

Seu estilo é sempre:
- curto
- direto
- simpático
- educado
- humano (WhatsApp real)
- sem narrativa
- sem explicações internas
- sem frases longas
- sem "estou verificando", "processando..."

REGRAS BASE
- Nunca mencione que é IA
- Nunca diga "estou processando" ou "aguarde"
- Nunca use bullet points longos
- Máximo 3 linhas por mensagem
- Use emojis com moderação
- Sempre conclua com uma pergunta ou ação clara

CATÁLOGO PRONTA ENTREGA (preços por unidade):
11×11×40 = R$1,77 | 30×20×20 = R$3,16 | 27×18×9 = R$1,93
24×15×10 = R$1,57 | 19×12×12 = R$1,19 | 16×11×6 = R$0,74
17×14×5 = R$0,95 | 20×14×8 = R$1,21 | 20×15×15 = R$1,67
35×35×17 = R$5,69 | 16×11×6 Auto = R$1,49 | 30×20×11 Auto = R$3,80
26×19×3,5 Auto = R$1,77 | 20×10×36 = R$2,17 | 20×20×36 = R$8,38
45×35×6 = R$5,15 | 15×15×15 = R$1,43 | 15×13×4 Auto = R$1,11
23×14×4,5 Auto = R$1,50 | 15,5×11,5×4,5 Auto = R$1,18
18×9,5×6 Auto = R$1,40 | 9×9×27 = R$1,05 | 16×11×8 = R$0,82
18×13×9 = R$1,11 | 12×12×60 = R$2,71 | 40×30×20 = R$5,47
50×30×40 = R$8,71 | 60×40×50 = R$13,95 | 20×20×20 = R$2,53
16×11×10 = R$0,92 | 16×11×3 = R$0,62 | 19×11×4 = R$0,74
23×21×16 = R$2,57 | 23×21×12 = R$2,37 | 10×10×67 = R$2,43
25×25×25 = R$3,92 | 11×5×40 = R$1,15 | 25×17×9 Auto = R$3,04
7×7×24 = R$0,70 | 35×26×5 = R$3,00 | 30×20×10 = R$2,38

PEDIDO MÍNIMO: 200 unidades

COMO CALCULAR SOB MEDIDA:
- Maleta: use calculateMaletaPrice(C, L, A, qtd, gramatura, impressao, phone)
- Automontável: use calculateAutomontavelPrice(C, L, A, qtd, gramatura, impressao, phone)
- Gramatura padrão: Wave B
- Impressão padrão: false

FLUXO DE ATENDIMENTO:
1. Cliente pede orçamento → perguntar: medidas? quantidade? tem impressão?
2. Calcular preço → apresentar valor unitário e total
3. Cliente confirma → pedir: nome, CPF, email
4. Formalizar → enviar para Atlas
`;

async function processarMensagem(phoneNumber, message) {
    try {
        if (!memory.has(phoneNumber)) {
            memory.set(phoneNumber, []);
            clientData.set(phoneNumber, {});
        }

        const history = memory.get(phoneNumber);
        history.push({ role: 'user', content: message });

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-20)
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 500
        });

        const response = completion.choices[0].message.content;
        history.push({ role: 'assistant', content: response });
        memory.set(phoneNumber, history);

        return response;

    } catch (error) {
        logger.error('[Amanda-fixed] Erro ao processar mensagem:', error.message);
        throw error;
    }
}

function getClientData(phoneNumber) {
    return clientData.get(phoneNumber) || {};
}

function resetMemory(phoneNumber) {
    memory.delete(phoneNumber);
    clientData.delete(phoneNumber);
}

module.exports = {
    processarMensagem,
    getClientData,
    resetMemory
};
