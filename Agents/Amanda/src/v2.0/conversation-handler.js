// ============================================
// CONVERSATION HANDLER V3
// Engine: Amanda-fixed.js (prompt completo PicPac)
// ============================================

const amandaFixed = require('./Amanda-fixed');

const sessions = new Map();

async function processCustomerMessage(phoneNumber, message, profileName = null) {
    try {
        const response = await amandaFixed.processarMensagem(phoneNumber, message);

        return {
            message: response,
            status: 'active',
            orderData: amandaFixed.getClientData ? amandaFixed.getClientData(phoneNumber) : {}
        };
    } catch (error) {
        console.error(`[Conversation Handler] Erro ao processar mensagem:`, error);
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
