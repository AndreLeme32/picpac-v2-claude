// ============================================
// CONVERSATION HANDLER V3
// Engine: Amanda-fixed.js (prompt completo PicPac)
// ============================================

// Amanda-fixed usa maps internos por phoneNumber
// Precisamos chamar as funções diretamente do arquivo
const { processarMensagem, getMemory, getClientData } = require('./Amanda-fixed');

const sessions = new Map();

async function processCustomerMessage(phoneNumber, message, profileName = null) {
    try {
        const response = await processarMensagem(phoneNumber, message);

        return {
            message: response,
            status: 'active',
            orderData: getClientData ? getClientData(phoneNumber) : {}
        };
    } catch (error) {
        console.error(`[Conversation Handler] Erro ao processar mensagem:`, error.message);
        return {
            message: 'Desculpe, ocorreu um erro. Tente novamente.',
            status: 'error',
            orderData: {}
        };
    }
}

function getConversationState(phoneNumber) {
    return sessions.get(phoneNumber) || null;
}

function resetConversation(phoneNumber) {
    sessions.delete(phoneNumber);
    console.log(`[Conversation Handler] Conversa resetada para ${phoneNumber}`);
}

module.exports = {
    processCustomerMessage,
    getConversationState,
    resetConversation
};
