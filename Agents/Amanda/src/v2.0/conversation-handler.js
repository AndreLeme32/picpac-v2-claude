// ============================================
// CONVERSATION HANDLER V3
// Usa Amanda.js como engine principal
// ============================================

const Amanda = require('./Amanda');
const BoxPricingCalculator = require('./calculator');

const conversations = new Map();
const calculator = new BoxPricingCalculator();

async function processCustomerMessage(phoneNumber, message, profileName = null) {
    let session = conversations.get(phoneNumber);

    if (!session) {
        session = {
            phoneNumber,
            customerName: profileName,
            agent: new Amanda(calculator),
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        conversations.set(phoneNumber, session);
    }

    session.lastActivity = new Date().toISOString();

    const response = await session.agent.processarMensagem(message);

    conversations.set(phoneNumber, session);

    return {
        message: response,
        status: 'active',
        orderData: session.agent.clientData
    };
}

function getConversationState(phoneNumber) {
    const session = conversations.get(phoneNumber);
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
    conversations.delete(phoneNumber);
    console.log(`[Conversation Handler] Conversa resetada para ${phoneNumber}`);
}

module.exports = {
    processCustomerMessage,
    getConversationState,
    resetConversation
};
