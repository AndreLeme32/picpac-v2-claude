const criar_proposta = (payload) => {
  try {
    console.log('Iniciando criação de proposta para cliente:', payload.nome);

    const cliente = {
      nome: payload.nome || '',
      documento: payload.documento || '',
      email: payload.email || ''
    };

    let itens = [];

    if (payload.itens && Array.isArray(payload.itens) && payload.itens.length > 0) {
      itens = payload.itens.map((item) => ({
        descricao: item.descricao || payload.medidas || 'Item sem descrição',
        quantidade: item.quantidade || payload.quantidade || 1,
        preco_unitario: item.precoUnitario || payload.precoUnitario || 0,
        valor: (item.quantidade || payload.quantidade || 1) * (item.precoUnitario || payload.precoUnitario || 0)
      }));
    } else {
      // Fallback para item único
      const qtd = payload.quantidade || 1;
      const pUnit = payload.precoUnitario || 0;
      itens = [{
        descricao: payload.medidas || 'Item sem descrição',
        quantidade: qtd,
        preco_unitario: pUnit,
        valor: qtd * pUnit
      }];
    }

    const total = payload.precoTotal || itens.reduce((sum, item) => sum + item.valor, 0);

    const formattedData = {
      cliente,
      itens,
      total
    };

    console.log('Proposta formatada com sucesso. Total:', total);
    return { success: true, proposta: formattedData };
  } catch (error) {
    console.error('Erro ao criar proposta:', error.message);
    return { success: false, error: error.message };
  }
};

const decidir = (acao, payload) => {
  console.log('Decisor chamado com ação:', acao);
  try {
    if (acao === 'criar_proposta') {
      console.log('Executando criação de proposta...');
      return criar_proposta(payload);
    } else {
      console.log('Ação não reconhecida:', acao);
      return { success: false, error: `Ação não suportada: ${acao}` };
    }
  } catch (error) {
    console.error('Erro no decisor:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  criar_proposta,
  decidir
};