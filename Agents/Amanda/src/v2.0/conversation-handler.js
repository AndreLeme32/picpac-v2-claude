// ============================================
// CONVERSATION HANDLER - AMANDA V3
// ============================================
// Gerenciador de conversas e máquina de estados
// ============================================

// Armazenamento em memória das conversas
const conversations = new Map();

// Estados possíveis da conversa
const CONVERSATION_STATES = {
    INITIAL: 'initial',
    AWAITING_TYPE: 'awaiting_type',
    AWAITING_DIMENSIONS: 'awaiting_dimensions',
    AWAITING_QUANTITY: 'awaiting_quantity',
    AWAITING_GRAMATURA: 'awaiting_gramatura',
    AWAITING_PRINTING: 'awaiting_printing',
    AWAITING_CONFIRMATION: 'awaiting_confirmation',
    COMPLETE: 'complete'
};

// Função principal para processar mensagens do cliente
async function processCustomerMessage(phoneNumber, message, profileName = null) {
    // Obter ou criar conversa
    let conversation = conversations.get(phoneNumber);
    
    if (!conversation) {
        conversation = createNewConversation(phoneNumber, profileName);
        conversations.set(phoneNumber, conversation);
    }
    
    // Atualizar timestamp
    conversation.lastActivity = new Date().toISOString();
    
    // Processar mensagem baseado no estado atual
    const response = await handleConversationState(conversation, message);
    
    // Salvar conversa atualizada
    conversations.set(phoneNumber, conversation);
    
    return {
        message: response,
        status: conversation.status,
        orderData: conversation.orderData
    };
}

// Criar nova conversa
function createNewConversation(phoneNumber, profileName) {
    return {
        conversationId: `conv_${Date.now()}`,
        phoneNumber,
        customerName: profileName,
        status: CONVERSATION_STATES.INITIAL,
        orderData: {},
        messages: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };
}

// Gerenciar estados da conversa
async function handleConversationState(conversation, message) {
    const msgLower = message.toLowerCase().trim();
    
    // Adicionar mensagem ao histórico
    conversation.messages.push({
        from: 'customer',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    let response = '';
    
    // Verificar comandos especiais
    if (msgLower === 'cancelar' || msgLower === 'sair') {
        resetConversation(conversation.phoneNumber);
        return 'Conversa cancelada. Digite "oi" para começar novamente.';
    }
    
    // Máquina de estados
    switch (conversation.status) {
        case CONVERSATION_STATES.INITIAL:
            response = '🏭 Olá! Bem-vindo à PicPac Embalagens!\n\n';
            response += 'Vou ajudar você com seu orçamento de caixas de papelão.\n\n';
            response += '📦 Qual tipo de caixa você precisa?\n';
            response += '1️⃣ Maleta (com abas)\n';
            response += '2️⃣ Automontável (com travas)\n\n';
            response += 'Digite 1 ou 2, ou escreva o nome do tipo.';
            conversation.status = CONVERSATION_STATES.AWAITING_TYPE;
            break;
            
        case CONVERSATION_STATES.AWAITING_TYPE:
            if (msgLower.includes('1') || msgLower.includes('maleta')) {
                conversation.orderData.tipo = 'Maleta';
                response = '✅ Caixa *Maleta* selecionada!\n\n';
                response += '📏 Agora preciso das dimensões em milímetros.\n';
                response += 'Por favor, informe no formato:\n';
                response += '*Comprimento x Largura x Altura*\n\n';
                response += 'Exemplo: 300x200x150';
                conversation.status = CONVERSATION_STATES.AWAITING_DIMENSIONS;
            } else if (msgLower.includes('2') || msgLower.includes('auto')) {
                conversation.orderData.tipo = 'Automontável';
                response = '✅ Caixa *Automontável* selecionada!\n\n';
                response += '📏 Agora preciso das dimensões em milímetros.\n';
                response += 'Por favor, informe no formato:\n';
                response += '*Comprimento x Largura x Altura*\n\n';
                response += 'Exemplo: 300x200x150';
                conversation.status = CONVERSATION_STATES.AWAITING_DIMENSIONS;
            } else {
                response = '❌ Por favor, escolha:\n';
                response += '1️⃣ para Maleta\n';
                response += '2️⃣ para Automontável';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_DIMENSIONS:
            const dimensions = parseDimensions(message);
            if (dimensions) {
                conversation.orderData.comprimento = dimensions.comprimento;
                conversation.orderData.largura = dimensions.largura;
                conversation.orderData.altura = dimensions.altura;
                
                response = `✅ Dimensões registradas:\n`;
                response += `📦 ${dimensions.comprimento}x${dimensions.largura}x${dimensions.altura}mm\n\n`;
                response += '🔢 Qual a quantidade de caixas?\n';
                response += '(Mínimo: 200 unidades)';
                conversation.status = CONVERSATION_STATES.AWAITING_QUANTITY;
            } else {
                response = '❌ Formato inválido!\n';
                response += 'Use: Comprimento x Largura x Altura\n';
                response += 'Exemplo: 300x200x150';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_QUANTITY:
            const qty = parseInt(message.replace(/\D/g, ''));
            if (qty && qty >= 200) {
                conversation.orderData.quantidade = qty;
                response = `✅ Quantidade: *${qty} unidades*\n\n`;
                response += '📋 Qual gramatura do papelão?\n';
                response += '1️⃣ Wave B (mais leve)\n';
                response += '2️⃣ Wave BC (mais resistente)\n\n';
                response += 'Digite 1 ou 2';
                conversation.status = CONVERSATION_STATES.AWAITING_GRAMATURA;
            } else if (qty && qty < 200) {
                response = '❌ Quantidade mínima: 200 unidades\n';
                response += 'Por favor, informe uma quantidade maior ou igual a 200.';
            } else {
                response = '❌ Por favor, informe apenas o número.\n';
                response += 'Exemplo: 500';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_GRAMATURA:
            if (msgLower.includes('1') || (msgLower.includes('wave b') && !msgLower.includes('bc'))) {
                conversation.orderData.gramatura = 'Wave B';
                response = '✅ Gramatura *Wave B* selecionada!\n\n';
                response += '🎨 Deseja impressão personalizada?\n';
                response += '1️⃣ Sim\n';
                response += '2️⃣ Não';
                conversation.status = CONVERSATION_STATES.AWAITING_PRINTING;
            } else if (msgLower.includes('2') || msgLower.includes('bc')) {
                conversation.orderData.gramatura = 'Wave BC';
                response = '✅ Gramatura *Wave BC* selecionada!\n\n';
                response += '🎨 Deseja impressão personalizada?\n';
                response += '1️⃣ Sim\n';
                response += '2️⃣ Não';
                conversation.status = CONVERSATION_STATES.AWAITING_PRINTING;
            } else {
                response = '❌ Por favor, escolha:\n';
                response += '1️⃣ para Wave B\n';
                response += '2️⃣ para Wave BC';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_PRINTING:
            if (msgLower.includes('1') || msgLower.includes('sim')) {
                conversation.orderData.comImpressao = true;
                response = '✅ Com impressão personalizada!\n\n';
            } else if (msgLower.includes('2') || msgLower.includes('não') || msgLower.includes('nao')) {
                conversation.orderData.comImpressao = false;
                response = '✅ Sem impressão!\n\n';
            } else {
                response = '❌ Por favor, escolha:\n';
                response += '1️⃣ para Sim\n';
                response += '2️⃣ para Não';
                break;
            }
            
            // Pedido completo - preparar resumo
            response += '📋 *RESUMO DO PEDIDO:*\n';
            response += '━━━━━━━━━━━━━━━━━━━\n';
            response += `📦 Tipo: ${conversation.orderData.tipo}\n`;
            response += `📏 Medidas: ${conversation.orderData.comprimento}x${conversation.orderData.largura}x${conversation.orderData.altura}mm\n`;
            response += `🔢 Quantidade: ${conversation.orderData.quantidade} unidades\n`;
            response += `📋 Gramatura: ${conversation.orderData.gramatura}\n`;
            response += `🎨 Impressão: ${conversation.orderData.comImpressao ? 'Sim' : 'Não'}\n\n`;
            response += '⏳ Calculando seu orçamento...';
            
            conversation.status = CONVERSATION_STATES.COMPLETE;
            break;
            
        case CONVERSATION_STATES.COMPLETE:
            response = 'Seu pedido já foi enviado para processamento.\n';
            response += 'Em breve você receberá o orçamento.\n\n';
            response += 'Para fazer um novo pedido, digite "novo".';
            
            if (msgLower === 'novo') {
                resetConversation(conversation.phoneNumber);
                return await processCustomerMessage(conversation.phoneNumber, 'oi', conversation.customerName);
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_CONFIRMATION:
            if (msgLower === 'confirmar') {
                response = '✅ Pedido confirmado! Em breve entraremos em contato para finalizar.';
            } else if (msgLower === 'cancelar') {
                resetConversation(conversation.phoneNumber);
                response = '❌ Pedido cancelado. Digite "oi" para começar novamente.';
            } else {
                response = 'Por favor, digite CONFIRMAR para aprovar ou CANCELAR para desistir.';
            }
            break;
            
        default:
            response = 'Desculpe, não entendi. Digite "oi" para começar.';
            conversation.status = CONVERSATION_STATES.INITIAL;
    }
    
    // Adicionar resposta ao histórico
    conversation.messages.push({
        from: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
    });
    
    return response;
}

// Parser de dimensões
function parseDimensions(text) {
    // Aceitar formatos: 300x200x150, 300 x 200 x 150, 300 200 150
    const patterns = [
        /(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i,
        /(\d+)\s+(\d+)\s+(\d+)/,
        /(\d+)[,]\s*(\d+)[,]\s*(\d+)/
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return {
                comprimento: parseInt(match[1]),
                largura: parseInt(match[2]),
                altura: parseInt(match[3])
            };
        }
    }
    
    return null;
}

// Obter estado da conversa
function getConversationState(phoneNumber) {
    return conversations.get(phoneNumber);
}

// Resetar conversa
function resetConversation(phoneNumber) {
    conversations.delete(phoneNumber);
    console.log(`[Conversation Handler] Conversa resetada para ${phoneNumber}`);
}

// Limpar conversas antigas (mais de 24 horas)
function cleanOldConversations() {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    for (const [phoneNumber, conversation] of conversations.entries()) {
        const lastActivity = new Date(conversation.lastActivity).getTime();
        if (now - lastActivity > dayInMs) {
            conversations.delete(phoneNumber);
            console.log(`[Conversation Handler] Conversa antiga removida: ${phoneNumber}`);
        }
    }
}

// Executar limpeza a cada hora
setInterval(cleanOldConversations, 60 * 60 * 1000);

// Exportar funções
module.exports = {
    processCustomerMessage,
    getConversationState,
    resetConversation,
    CONVERSATION_STATES
};
