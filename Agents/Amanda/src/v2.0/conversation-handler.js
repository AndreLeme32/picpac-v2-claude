// ============================================
// CONVERSATION HANDLER V3
// Engine: Amanda-fixed.js (prompt completo PicPac)
// ============================================

const amandaFixed = require('./Amanda-fixed');

// Log para debugar o que Amanda-fixed exporta
console.log('[Conversation Handler] Amanda-fixed exports:', Object.keys(amandaFixed));

const sessions = new Map();

async function processCustomerMessage(phoneNumber, message, profileName = null) {
    try {
        // Tentar diferentes nomes de função que podem existir no Amanda-fixed
        let response;
        
        if (typeof amandaFixed.processarMensagem === 'function') {
            response = await amandaFixed.processarMensagem(phoneNumber, message);
        } else if (typeof amandaFixed.handleMessage === 'function') {
            response = await amandaFixed.handleMessage(phoneNumber, message);
        } else if (typeof amandaFixed.process === 'function') {
            response = await amandaFixed.process(phoneNumber, message);
        } else if (typeof amandaFixed.responder === 'function') {
            response = await amandaFixed.responder(phoneNumber, message);
        } else {
            // Log todas as funções disponíveis para debug
            console.error('[Conversation Handler] Funções disponíveis:', Object.keys(amandaFixed));
            throw new Error('Nenhuma função de processamento encontrada no Amanda-fixed');
        }

        return {
            message: response,
            status: 'active',
            orderData: {}
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
