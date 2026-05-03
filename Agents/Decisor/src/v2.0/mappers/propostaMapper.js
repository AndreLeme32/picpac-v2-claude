const logger = console;

function validarDados(dados) {
  const erros = [];

  // Validar dados do cliente
  if (!dados.nome || typeof dados.nome !== 'string' || dados.nome.trim() === '') {
    erros.push('Nome é obrigatório e deve ser uma string não vazia');
  }

  if (!dados.documento || typeof dados.documento !== 'string' || dados.documento.trim() === '') {
    erros.push('Documento é obrigatório e deve ser uma string não vazia');
  }

  if (!dados.email || typeof dados.email !== 'string' || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(dados.email)) {
    erros.push('Email é obrigatório e deve ser um email válido');
  }

  // Validar array de itens
  if (!dados.itens || !Array.isArray(dados.itens) || dados.itens.length === 0) {
    erros.push('Array de itens é obrigatório e não pode estar vazio');
  } else {
    // Validar cada item no array
    dados.itens.forEach((item, index) => {
      if (!item.descricao || typeof item.descricao !== 'string' || item.descricao.trim() === '') {
        erros.push(`Descrição do item ${index + 1} é obrigatória e deve ser uma string não vazia`);
      }

      if (item.quantidade === undefined || typeof item.quantidade !== 'number' || item.quantidade <= 0) {
        erros.push(`Quantidade do item ${index + 1} é obrigatória e deve ser um número positivo`);
      }

      if (item.valor === undefined || typeof item.valor !== 'number' || item.valor <= 0) {
        erros.push(`Valor do item ${index + 1} é obrigatório e deve ser um número positivo`);
      }
    });
  }

  logger.debug('Validação concluída:', { valid: erros.length === 0, erros });

  return { valid: erros.length === 0, erros };
}

async function montarPayloadProposta(dados) {
  try {
    const validacao = validarDados(dados);

    if (!validacao.valid) {
      throw new Error(`Dados inválidos: ${validacao.erros.join(', ')}`);
    }

    const payload = {
      cliente: {
        nome: dados.nome.trim(),
        documento: dados.documento.trim(),
        email: dados.email.trim()
      },
      itens: dados.itens.map(item => ({
        descricao: item.descricao.trim(),
        quantidade: item.quantidade,
        valor: item.valor,
        preco_unitario: item.preco_unitario || item.valor
      })),
      total: dados.itens.reduce((sum, item) => sum + (item.quantidade * item.valor), 0)
    };

    logger.debug('Payload montado com sucesso:', payload);

    return payload;
  } catch (error) {
    logger.error('Erro ao montar payload:', error.message);
    throw error;
  }
}

module.exports = { validarDados, montarPayloadProposta };