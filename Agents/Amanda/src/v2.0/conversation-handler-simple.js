// Teste simples para verificar se salva
const { analyzeIntent } = require('./modules/conversation-intents');
const { formatCatalogo } = require('./modules/conversation-catalog');

function test() {
    return "Módulos carregados com sucesso";
}

module.exports = { test };
