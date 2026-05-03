const axios = require('axios');
const logger = require('../../../decisor/src/v2.0/utils/logger');

async function routes(fastify, options) {
  let store = [];

  const processarDados = async (dados) => {
    const requiredFields = ['phone', 'nome', 'documento', 'email', 'medidas', 'quantidade', 'precoUnitario', 'precoTotal', 'endereco', 'entrega', 'itens'];
    for (const field of requiredFields) {
      if (!dados[field]) {
        throw new Error(`Campo obrigatório ausente: ${field}`);
      }
    }

    dados.id = Date.now().toString();
    store.push({ ...dados });
    return { success: true, id: dados.id, message: 'Dados processados com sucesso' };
  };

  const recuperarPorId = async (id) => {
    return store.find(d => d.id === id) || null;
  };

  const listarTodos = async () => {
    return store;
  };

  fastify.post('/receberDadosDeAmanda', async (request, reply) => {
    const dados = request.body;

    fastify.log.info('Recebendo dados de Amanda');

    try {
      const resultado = await processarDados(dados);
      try {
        await axios.post('http://localhost:3004/receberDadosDeAtlas', dados);
        fastify.log.info('Dados enviados com sucesso para o Decisor');
      } catch (error) {
        fastify.log.error(`Falha ao enviar dados para o Decisor: ${error.message}`);
      }

      return resultado;
    } catch (error) {
      fastify.log.error(`Erro ao processar dados de Amanda: ${error.message}`);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  fastify.get('/recuperarDados/:id', async (request, reply) => {
    const { id } = request.params;
    const dados = await recuperarPorId(id);
    if (!dados) {
      reply.code(404);
      return { success: false, message: 'Dados não encontrados' };
    }
    return dados;
  });

  fastify.get('/listarTodos', async (request, reply) => {
    const todos = await listarTodos();
    return todos;
  });

  fastify.get('/status', async (request, reply) => {
    return {
      status: 'Atlas API rodando perfeitamente',
      timestamp: new Date().toISOString(),
      totalRegistros: store.length
    };
  });
}

module.exports = routes;

const fastify = require('fastify')({ logger: true });
const routes = require('./atlas-routes');

fastify.register(routes);

async function start() {
  try {
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🟢 Servidor Atlas rodando em http://localhost:3002');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando Atlas graciosamente');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando Atlas graciosamente');
  await fastify.close();
  process.exit(0);
});

start();

const axios = require('axios');

let bancoDados = {
  vendas: []
};

function validarDados(dados) {
  console.log('Validating payload:', JSON.stringify(dados, null, 2));

  if (!dados || typeof dados !== 'object') {
    console.log('Invalid: dados is not an object');
    return false;
  }

  if (!dados.cliente || typeof dados.cliente !== 'string' || dados.cliente.trim() === '') {
    console.log('Invalid: cliente must be a non-empty string');
    return false;
  }

  if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
    console.log('Invalid: itens must be a non-empty array');
    return false;
  }

  for (let item of dados.itens) {
    if (!item || typeof item.preco_unitario !== 'number' || item.preco_unitario <= 0) {
      console.log('Invalid: each item must have preco_unitario as positive number');
      return false;
    }
  }

  if (typeof dados.total !== 'number' || dados.total <= 0) {
    console.log('Invalid: total must be a positive number');
    return false;
  }

  console.log('Validation passed');
  return true;
}

function armazenarDados(dados) {
  console.log('Storing payload:', JSON.stringify(dados, null, 2));
  const venda = {
    id: Date.now(),
    ...dados,
    data: new Date().toISOString()
  };
  bancoDados.vendas.push(venda);
  console.log('Data stored successfully');
}

function recuperarDados() {
  console.log('Retrieving all data:', JSON.stringify(bancoDados.vendas, null, 2));
  return bancoDados.vendas;
}

async function enviarParaDecisor(dados) {
  console.log('Sending to Decisor payload:', JSON.stringify(dados, null, 2));
  try {
    const response = await axios.post('http://localhost:3004/receberDadosDeAtlas', dados);
    console.log('Decisor logger - Data received successfully:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Decisor logger - Error receiving data:', error.message);
  }
}

async function processarDados(dados) {
  console.log('Starting processarDados with payload:', JSON.stringify(dados, null, 2));

  if (!validarDados(dados)) {
    console.log('processarDados failed: validation error');
    return false;
  }

  armazenarDados(dados);

  await enviarParaDecisor(dados);

  console.log('processarDados completed successfully');
  return true;
}

module.exports = {
  validarDados,
  armazenarDados,
  recuperarDados,
  enviarParaDecisor,
  processarDados,
  bancoDados
};

const fastify = require('fastify')({ logger: true });
const routes = require('./atlas-routes');
const logger = require('../../../decisor/src/v2.0/utils/logger');

fastify.register(routes);

async function start() {
  try {
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🟢 Servidor Atlas rodando em http://localhost:3002');
    logger.info('Atlas iniciado com sucesso na porta 3002');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando Atlas graciosamente');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando Atlas graciosamente');
  await fastify.close();
  process.exit(0);
});

start();

module.exports = fastify;