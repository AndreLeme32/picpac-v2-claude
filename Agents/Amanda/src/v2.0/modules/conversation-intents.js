// ============================================
// MÓDULO DE ANÁLISE DE INTENÇÕES
// ============================================

function analyzeIntent(message) {
    const lower = message.toLowerCase().trim();
    
    // Saudações
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|e ai|ei|hello|hi)/.test(lower)) {
        return 'greeting';
    }
    
    // Catálogo
    if (/catalogo|catálogo|pronta entrega|tabela|lista|produtos/.test(lower)) {
        return 'catalog';
    }
    
    // Pedido repetido
    if (/repet|mesmo|igual|anterior|ultimo|último/.test(lower)) {
        return 'repeat_order';
    }
    
    // Confirmações
    if (/^(sim|s|confirma|confirmar|fechado|ok|correto|certo|isso)$/.test(lower)) {
        return 'confirm';
    }
    
    // Cancelamento
    if (/cancela|desist|sair|parar|não quero/.test(lower)) {
        return 'cancel';
    }
    
    // Ajuda
    if (/ajuda|help|duvida|dúvida|como|explicar/.test(lower)) {
        return 'help';
    }
    
    // Pedido sob medida
    if (/sob medida|personaliz|especial|custom/.test(lower)) {
        return 'custom_order';
    }
    
    // Detecção de dados
    if (/\d{11}/.test(message.replace(/\D/g, ''))) {
        return 'has_cpf';
    }
    
    if (/@/.test(message) && /\.[a-z]{2,}/i.test(message)) {
        return 'has_email';
    }
    
    if (/\d+\s*x\s*\d+\s*x\s*\d+/i.test(message)) {
        return 'has_dimensions';
    }
    
    if (/\d{3,}/.test(message.replace(/\D/g, '')) && !lower.includes('x')) {
        return 'has_quantity';
    }
    
    // Tipos de caixa
    if (/maleta/.test(lower)) {
        return 'box_maleta';
    }
    
    if (/automontavel|automontável|auto montavel/.test(lower)) {
        return 'box_auto';
    }
    
    return 'general';
}

module.exports = { analyzeIntent };
