const fastify = require('fastify')({ logger: true });
const routes = require('./routes');

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

fastify.register(routes);

async function start() {
  try {
    await fastify.listen({ port: 3004, host: '0.0.0.0' });
    console.log('Servidor Decisor rodando em http://localhost:3004');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando graciosamente');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando graciosamente');
  await fastify.close();
  process.exit(0);
});

start();

const contatosDb = [];
const produtosDb = [];

fastify.get('/contatos', async (request, reply) => {
  const { documento } = request.query;
  if (documento) {
    const contato = contatosDb.find(c => c.documento === documento);
    return reply.send(contato ? [contato] : []);
  }
  return reply.send(contatosDb);
});

fastify.post('/contatos', async (request, reply) => {
  const novoContato = {
    id: Date.now(),
    ...request.body,
    criadoEm: new Date().toISOString()
  };
  contatosDb.push(novoContato);
  console.log('[MOCK-API] Contato criado:', novoContato);
  return reply.status(201).send(novoContato);
});

fastify.get('/produtos', async (request, reply) => {
  const { descricao } = request.query;
  if (descricao) {
    const produto = produtosDb.find(p => p.descricao === descricao);
    return reply.send(produto ? [produto] : []);
  }
  return reply.send(produtosDb);
});

fastify.post('/produtos', async (request, reply) => {
  const novoProduto = {
    id: Date.now(),
    ...request.body,
    criadoEm: new Date().toISOString()
  };
  produtosDb.push(novoProduto);
  console.log('[MOCK-API] Produto criado:', novoProduto);
  return reply.status(201).send(novoProduto);
});

fastify.get('/status', async (request, reply) => {
  return reply.send({ status: 'mock-api-ok' });
});

module.exports = {
  criar_proposta,
  decidir,
  fastify
};