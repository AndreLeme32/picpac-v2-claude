const fastify = require('fastify')({ logger: true });

// Simulação de banco de dados em memória
const contatosDb = [];
const produtosDb = [];

// ===== ROTAS DE CONTATOS =====
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

// ===== ROTAS DE PRODUTOS =====
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

// ===== HEALTH CHECK =====
fastify.get('/status', async (request, reply) => {
  return reply.send({ status: 'mock-api-ok' });
});

async function start() {
  try {
    await fastify.listen({ port: 3003, host: '0.0.0.0' });
    console.log('🟢 Mock API rodando em http://localhost:3003');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

module.exports = fastify;