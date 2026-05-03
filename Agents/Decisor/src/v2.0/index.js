require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const axios = require('axios');

function transformToBling(proposta) {
  const itensBling = proposta.itens.map(item => ({
    nome: item.nome || item.produto || 'Item sem nome',
    qtd: item.quantidade || 0,
    valorUnitario: item.preco || item.valorUnitario || 0,
    vlrItem: (item.quantidade || 0) * (item.preco || item.valorUnitario || 0)
  }));

  const valorTotal = itensBling.reduce((sum, item) => sum + item.vlrItem, 0);

  return {
    cliente: proposta.cliente,
    itens: itensBling,
    valorTotal
  };
}

fastify.get('/status', async (request, reply) => {
  try {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/transformar', async (request, reply) => {
  try {
    const proposta = request.body;

    if (!proposta || !proposta.cliente || !Array.isArray(proposta.itens)) {
      return reply.code(400).send({ success: false, error: 'Proposta inválida: cliente e itens obrigatórios' });
    }

    const blingData = transformToBling(proposta);

    const blingBotResponse = await axios.post(
      'http://localhost:3004/criar',
      blingData,
      { timeout: 10000 }
    );

    return {
      success: true,
      blingData,
      blingBotResponse: blingBotResponse.data
    };
  } catch (error) {
    fastify.log.error(error);
    if (error.code === 'ECONNABORTED') {
      return reply.code(408).send({ success: false, error: 'Timeout na requisição para BlingBot' });
    }
    if (error.response) {
      return reply.code(error.response.status).send({
        success: false,
        error: error.response.data || error.message
      });
    }
    return reply.code(500).send({ success: false, error: error.message });
  }
});

fastify.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Decisor server listening on ${address}`);
});
