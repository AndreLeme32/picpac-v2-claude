// ============================================
// CONVERSATION HANDLER - AMANDA V3 MELHORADO
// ============================================
// Gerenciador de conversas com inteligência de negócio
// ============================================

const conversations = new Map();

const CONVERSATION_STATES = {
    INITIAL: 'initial',
    MENU: 'menu',
    AWAITING_TYPE: 'awaiting_type',
    AWAITING_DIMENSIONS: 'awaiting_dimensions',
    AWAITING_QUANTITY: 'awaiting_quantity',
    AWAITING_GRAMATURA: 'awaiting_gramatura',
    AWAITING_PRINTING: 'awaiting_printing',
    AWAITING_PERSONAL_DATA: 'awaiting_personal_data',
    AWAITING_CONFIRMATION: 'awaiting_confirmation',
    COMPLETE: 'complete'
};

// Catálogo básico
const CATALOGO = [
    '11x11x40cm - R$ 1,77',
    '30x20x20cm - R$ 3,16',
    '27x18x9cm - R$ 1,93',
    '16x11x6cm - R$ 0,74'
];

async function processCustomerMessage(phoneNumber, message, profileName = null) {
    let conversation = conversations.get(phoneNumber);
    
    if (!conversation) {
        conversation = {
            conversationId: `conv_${Date.now()}`,
            phoneNumber,
            customerName: profileName,
            state: CONVERSATION_STATES.INITIAL,
            orderData: {},
            customerData: {},
            messages: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };
        conversations.set(phoneNumber, conversation);
    }
    
    conversation.lastActivity = new Date().toISOString();
    const response = await handleConversationState(conversation, message);
    conversations.set(phoneNumber, conversation);
    
    return {
        message: response,
        status: conversation.state,
        orderData: conversation.orderData
    };
}

async function handleConversationState(conversation, message) {
    const msgLower = message.toLowerCase().trim();
    conversation.messages.push({ from: 'customer', content: message, timestamp: new Date().toISOString() });
    
    let response = '';
    
    // Comando global de cancelar
    if (msgLower === 'cancelar' || msgLower === 'sair') {
        resetConversation(conversation.phoneNumber);
        return 'Conversa cancelada. Digite "oi" para começar novamente.';
    }
    
    // Comando de catálogo
    if (msgLower.includes('catalogo') || msgLower.includes('catálogo')) {
        response = '📦 CATÁLOGO PRONTA-ENTREGA:\n\n';
        CATALOGO.forEach((item, i) => {
            response += `${i+1}. ${item}\n`;
        });
        response += '\nPara orçamento personalizado, me informe as medidas desejadas.';
        return response;
    }
    
    switch (conversation.state) {
        case CONVERSATION_STATES.INITIAL:
            response = '🏭 Olá! Bem-vindo à PicPac Embalagens!\n';
            response += 'Sou a Amanda, sua assistente virtual.\n\n';
            response += 'Como posso ajudar?\n';
            response += '• Digite "catálogo" para ver pronta-entrega\n';
            response += '• Ou me diga o tipo de caixa que precisa\n\n';
            response += '📦 Qual tipo de caixa você precisa?\n';
            response += '1️⃣ Maleta (com abas)\n';
            response += '2️⃣ Automontável (com travas)';
            conversation.state = CONVERSATION_STATES.AWAITING_TYPE;
            break;
            
        case CONVERSATION_STATES.AWAITING_TYPE:
            if (msgLower.includes('1') || msgLower.includes('maleta')) {
                conversation.orderData.tipo = 'Maleta';
                response = '✅ Caixa Maleta selecionada!\n\n';
                response += '📏 Agora preciso das dimensões em milímetros.\n';
                response += 'Informe: Comprimento x Largura x Altura\n';
                response += 'Exemplo: 300x200x150';
                conversation.state = CONVERSATION_STATES.AWAITING_DIMENSIONS;
            } else if (msgLower.includes('2') || msgLower.includes('auto')) {
                conversation.orderData.tipo = 'Automontável';
                response = '✅ Caixa Automontável selecionada!\n\n';
                response += '📏 Agora preciso das dimensões em milímetros.\n';
                response += 'Informe: Comprimento x Largura x Altura\n';
                response += 'Exemplo: 300x200x150';
                conversation.state = CONVERSATION_STATES.AWAITING_DIMENSIONS;
            } else {
                response = 'Por favor, escolha:\n';
                response += '1 - Maleta\n';
                response += '2 - Automontável';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_DIMENSIONS:
            const dimensions = parseDimensions(message);
            if (dimensions) {
                conversation.orderData.comprimento = dimensions.comprimento;
                conversation.orderData.largura = dimensions.largura;
                conversation.orderData.altura = dimensions.altura;
                response = `✅ Medidas: ${dimensions.comprimento}x${dimensions.largura}x${dimensions.altura}mm\n\n`;
                response += '🔢 Quantas unidades você precisa?\n';
                response += '(Pedido mínimo: 200 unidades)';
                conversation.state = CONVERSATION_STATES.AWAITING_QUANTITY;
            } else {
                response = 'Não consegui entender as medidas.\n';
                response += 'Use o formato: 300x200x150';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_QUANTITY:
            const qty = parseInt(message.replace(/\D/g, ''));
            if (qty && qty >= 200) {
                conversation.orderData.quantidade = qty;
                response = `✅ Quantidade: ${qty} unidades\n\n`;
                response += '📋 Qual gramatura do papelão?\n';
                response += '1️⃣ Wave B (mais leve)\n';
                response += '2️⃣ Wave BC (mais resistente)';
                conversation.state = CONVERSATION_STATES.AWAITING_GRAMATURA;
            } else if (qty && qty < 200) {
                response = '⚠️ Pedido mínimo: 200 unidades\n';
                response += 'Por favor, informe uma quantidade maior.';
            } else {
                response = 'Por favor, informe apenas o número.\nExemplo: 500';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_GRAMATURA:
            if (msgLower.includes('1') || msgLower.includes('wave b')) {
                conversation.orderData.gramatura = 'Wave B';
                response = '✅ Gramatura Wave B selecionada!\n\n';
            } else if (msgLower.includes('2') || msgLower.includes('bc')) {
                conversation.orderData.gramatura = 'Wave BC';
                response = '✅ Gramatura Wave BC selecionada!\n\n';
            } else {
                response = 'Por favor, escolha 1 ou 2';
                break;
            }
            response += '🎨 Deseja impressão personalizada?\n';
            response += 'Digite: Sim ou Não';
            conversation.state = CONVERSATION_STATES.AWAITING_PRINTING;
            break;
            
        case CONVERSATION_STATES.AWAITING_PRINTING:
            if (msgLower.includes('sim')) {
                conversation.orderData.comImpressao = true;
                response = '✅ Com impressão!\n\n';
            } else {
                conversation.orderData.comImpressao = false;
                response = '✅ Sem impressão!\n\n';
            }
            
            response += '📝 Para finalizar, preciso dos seus dados:\n';
            response += 'Informe seu nome, CPF e email\n';
            response += 'Exemplo: João Silva, 12345678901, joao@email.com';
            conversation.state = CONVERSATION_STATES.AWAITING_PERSONAL_DATA;
            break;
            
        case CONVERSATION_STATES.AWAITING_PERSONAL_DATA:
            // Extrair dados pessoais
            const nomeMatch = message.match(/([A-Za-zÀ-ú\s]+)/);
            const cpfMatch = message.replace(/\D/g, '').match(/(\d{11})/);
            const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            
            if (nomeMatch) conversation.customerData.nome = nomeMatch[1].trim();
            if (cpfMatch) conversation.customerData.cpf = cpfMatch[1];
            if (emailMatch) conversation.customerData.email = emailMatch[1];
            
            if (conversation.customerData.nome && conversation.customerData.cpf && conversation.customerData.email) {
                response = '📋 RESUMO DO PEDIDO:\n';
                response += '━━━━━━━━━━━━━━━━━━━\n';
                response += `Cliente: ${conversation.customerData.nome}\n`;
                response += `CPF: ${conversation.customerData.cpf}\n`;
                response += `Email: ${conversation.customerData.email}\n\n`;
                response += `Tipo: ${conversation.orderData.tipo}\n`;
                response += `Medidas: ${conversation.orderData.comprimento}x${conversation.orderData.largura}x${conversation.orderData.altura}mm\n`;
                response += `Quantidade: ${conversation.orderData.quantidade}\n`;
                response += `Gramatura: ${conversation.orderData.gramatura}\n`;
                response += `Impressão: ${conversation.orderData.comImpressao ? 'Sim' : 'Não'}\n\n`;
                response += '✅ Digite "confirmar" para enviar o pedido';
                conversation.state = CONVERSATION_STATES.AWAITING_CONFIRMATION;
            } else {
                response = 'Por favor, informe todos os dados:\n';
                if (!conversation.customerData.nome) response += '❌ Nome\n';
                if (!conversation.customerData.cpf) response += '❌ CPF (11 dígitos)\n';
                if (!conversation.customerData.email) response += '❌ Email\n';
            }
            break;
            
        case CONVERSATION_STATES.AWAITING_CONFIRMATION:
            if (msgLower.includes('confirm')) {
                conversation.state = CONVERSATION_STATES.COMPLETE;
                response = '✅ Pedido enviado com sucesso!\n';
                response += '📧 Em breve você receberá o orçamento por email.\n\n';
                response += 'Obrigado por escolher PicPac Embalagens!\n';
                response += 'Para novo pedido, digite "oi"';
            } else {
                response = 'Digite "confirmar" para enviar o pedido ou "cancelar" para desistir.';
            }
            break;
            
        case CONVERSATION_STATES.COMPLETE:
            response = 'Seu pedido já foi enviado.\nDigite "oi" para fazer um novo pedido.';
            if (msgLower === 'oi') {
                resetConversation(conversation.phoneNumber);
                return processCustomerMessage(conversation.phoneNumber, 'oi', conversation.customerName);
            }
            break;
            
        default:
            response = 'Desculpe, não entendi. Digite "oi" para começar.';
    }
    
    conversation.messages.push({ from: 'assistant', content: response, timestamp: new Date().toISOString() });
    return response;
}

function parseDimensions(text) {
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

function getConversationState(phoneNumber) {
    return conversations.get(phoneNumber);
}

function resetConversation(phoneNumber) {
    conversations.delete(phoneNumber);
    console.log(`[Conversation Handler] Conversa resetada para ${phoneNumber}`);
}

module.exports = {
    processCustomerMessage,
    getConversationState,
    resetConversation,
    CONVERSATION_STATES
};
