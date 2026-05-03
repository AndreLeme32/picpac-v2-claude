const { procesarProposta, consultarProposta } = require('./blingbot');
const logger = require('../../../decisor/src/v2.0/utils/logger');

async function routes(fastify, options) {
  /**
   * POST /receberPropostaDoDecisor
   * Recebe proposta do Decisor e processa no Bling
   */
  fastify.post('/receberPropostaDoDecisor', async (request, reply) => {
    try {
      const proposta = request.body;
      
      if (!proposta || !proposta.cliente || !proposta.itens) {
        fastify.log.warn('Proposta inválida recebida no BlingBot');
        return reply.status(400).send({ 
          error: 'Proposta inválida - faltam dados obrigatórios' 
        });
      }
      
      fastify.log.info('Proposta recebida do Decisor:', proposta);
      
      // Processar proposta no Bling
      const resultado = await procesarProposta(proposta);
      
      fastify.log.info('Proposta processada com sucesso:', resultado);
      
      return reply.status(200).send({ 
        success: true, 
        data: resultado 
      });
    } catch (error) {
      fastify.log.error('Erro ao processar proposta no BlingBot:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro ao processar proposta',
        details: error.message 
      });
    }
  });

  /**
   * GET /consultarProposta/:idBling
   * Consulta status de proposta no Bling
   */
  fastify.get('/consultarProposta/:idBling', async (request, reply) => {
    try {
      const { idBling } = request.params;
      
      if (!idBling) {
        return reply.status(400).send({ 
          error: 'ID Bling é obrigatório' 
        });
      }
      
      fastify.log.info('Consultando proposta no Bling:', { idBling });
      
      const proposta = await consultarProposta(idBling);
      
      return reply.status(200).send({ 
        success: true, 
        data: proposta 
      });
    } catch (error) {
      fastify.log.error('Erro ao consultar proposta:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Erro ao consultar proposta',
        details: error.message 
      });
    }
  });

  /**
   * GET /status
   * Health check do BlingBot
   */
  fastify.get('/status', async (request, reply) => {
    return reply.send({ 
      status: 'blingbot-ok',
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = routes;