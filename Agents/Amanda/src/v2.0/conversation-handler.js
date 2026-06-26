// ============================================
// CONVERSATION HANDLER V3
// Engine: Amanda-fixed.js (prompt completo PicPac)
// ============================================

const AmandaFixed = require('./Amanda-fixed');

const sessions = new Map();

async function processCustomerMessage(phoneNumber, message, profileName = null) {
    let session = sessions.get(phoneNumber);

    if (!session) {
        session = {
            phoneNumber,
            customerName: profileName,
            agent: new AmandaFixed(),
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        sessions.set(phoneNumber, session);
    }

    session.lastActivity = new Date().toISOString();

    const response = await session.agent.processarMensagem(message);

    sessions.set(phoneNumber, session);

    return {
        message: response,
        status: 'active',
        orderData: session.agent.clientData
    };
}

function getConversationState(phoneNumber) {
    const session = sessions.get(phoneNumber);
    if (!session) return null;
    return {
        phoneNumber,
        customerName: session.customerName,
        clientData: session.agent.clientData,
        history: session.agent.conversationHistory,
        status: 'active'
    };
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
