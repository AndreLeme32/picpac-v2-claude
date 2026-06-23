// ============================================
// MÓDULO DE DADOS PESSOAIS E VALIDAÇÃO
// ============================================

function extractPersonalData(mensagem) {
    const data = {};
    
    const nomeMatch = mensagem.match(/(?:nome|chamo-me|sou)[:\s]*([A-Za-zÀ-ú\s]{2,})/i);
    if (nomeMatch) data.nome = nomeMatch[1].trim();
    
    const cpfDigits = mensagem.replace(/\D/g, '');
    const cpfMatch = cpfDigits.match(/(\d{11})/);
    if (cpfMatch) data.documento = cpfMatch[1];
    
    const emailMatch = mensagem.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) data.email = emailMatch[1].toLowerCase();
    
    return data;
}

function validatePersonalData(clientData) {
    const errors = [];
    if (!clientData.nome?.trim()) errors.push('nome');
    if (!clientData.documento || !/\d{11}/.test(clientData.documento)) errors.push('CPF (11 dígitos)');
    if (!clientData.email?.includes('@')) errors.push('email válido');
    return errors;
}

function formatMissingData(errors) {
    return `Não detectei: ${errors.join(', ')}.\nExemplo: nome: João Silva CPF: 12345678901 email: joao@email.com`;
}

module.exports = { extractPersonalData, validatePersonalData, formatMissingData };
