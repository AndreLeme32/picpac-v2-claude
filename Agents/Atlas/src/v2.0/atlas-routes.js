const axios = require('axios');
const logger = require('../../../decisor/src/v2.0/utils/logger');

async function routes(fastify, options) {
  // Armazenamento em memória para completude funcional (substitua por DB real em produção)
  let store = [];

  // Função processarDados para validar e armazenar (substitua pela implementação real)
  const processarDados = async (dados) => {
    // Validação básica
    const requiredFields = ['phone', 'nome', 'documento', 'email', 'medidas', 'quantidade', 'precoUnitario', 'precoTotal', 'endereco', 'entrega', 'itens'];
    for (const field of requiredFields) {
      if (!dados[field]) {
        throw new Error(`Campo obrigatório ausente: ${field}`);
      }
    }

    // Gerar ID e armazenar
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

  // Rota POST /receberDadosDeAmanda - CORRIGIDA: envia dados ORIGINAIS para Decisor
  fastify.post('/receberDadosDeAmanda', async (request, reply) => {
    const dados = request.body;

    fastify.log.info('Recebendo dados de Amanda');

    try {
      // Valida e armazena usando processarDados
      const resultado = await processarDados(dados);

      // CRITICAL FIX: Envia o OBJETO ORIGINAL 'dados' para Decisor, NÃO o 'resultado'
      try {
        await axios.post('http://localhost:3004/receberDadosDeAtlas', dados);
        fastify.log.info('Dados enviados com sucesso para o Decisor');
      } catch (error) {
        fastify.log.error(`Falha ao enviar dados para o Decisor: ${error.message}`);
        // NÃO quebra o fluxo: continua e retorna 200 para Amanda
      }

      return resultado;
    } catch (error) {
      fastify.log.error(`Erro ao processar dados de Amanda: ${error.message}`);
      reply.code(400);
      return { success: false, error: error.message };
    }
  });

  // Rota GET /recuperarDados/:id - Mantida igual
  fastify.get('/recuperarDados/:id', async (request, reply) => {
    const { id } = request.params;
    const dados = await recuperarPorId(id);
    if (!dados) {
      reply.code(404);
      return { success: false, message: 'Dados não encontrados' };
    }
    return dados;
  });

  // Rota GET /listarTodos - Mantida igual
  fastify.get('/listarTodos', async (request, reply) => {
    const todos = await listarTodos();
    return todos;
  });

  // Rota GET /status - Mantida igual
  fastify.get('/status', async (request, reply) => {
    return {
      status: 'Atlas API rodando perfeitamente',
      timestamp: new Date().toISOString(),
      totalRegistros: store.length
    };
  });
}

module.exports = routes;