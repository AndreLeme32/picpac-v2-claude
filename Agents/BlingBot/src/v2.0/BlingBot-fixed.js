const { procesarProposta, consultarProposta } = require('./blingbot');
const logger = require('../../../decisor/src/v2.0/utils/logger');
const fastify = require('fastify')({ logger: true });
const axios = require('axios');
require('dotenv').config();

const api = axios.create({
  baseURL: 'https://bling.com.br/Api/v3',
  headers: {
    'Authorization': `Bearer ${process.env.BLING_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function routes(fastify, options) {
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

  fastify.get('/status', async (request, reply) => {
    return reply.send({
      status: 'blingbot-ok',
      timestamp: new Date().toISOString()
    });
  });
}

app.use(express.json());

app.post('/receberDadosDeAmanda', (req, res) => {
  console.log('Recebendo dados de Amanda:', req.body);
  res.json({ success: true, mensagem: 'Dados recebidos!' });
});

app.post('/processar-proposta', async (req, res) => {
  const { cliente, itens } = req.body;
  console.log('Iniciando processamento da proposta:', { cliente: cliente.nome });
  console.log('Itens:', itens);

  let contatoId;
  try {
    const nomePesquisa = encodeURIComponent(cliente.nome);
    console.log(`Buscando contato por nome: ${cliente.nome}`);
    const searchResponse = await api.get(`/contatos?pesquisa=${nomePesquisa}`);
    console.log('Resposta da busca:', searchResponse.data);

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      contatoId = searchResponse.data.data[0].id;
      console.log(`Contato encontrado com ID: ${contatoId}`);
    } else {
      let documentoLimpo = cliente.documento.replace(/[^0-9]/g, '');
      const tipoDocumento = documentoLimpo.length === 11 ? 'F' : 'J';
      const contatoData = {
        nome: cliente.nome,
        numeroDocumento: documentoLimpo,
        tipoDocumento: tipoDocumento,
        ...(cliente.email && { email: cliente.email }),
      };
      console.log('Criando novo contato:', contatoData);
      const createResponse = await api.post('/contatos', contatoData);
      console.log('Resposta da criação:', createResponse.data);
      contatoId = createResponse.data.data.id;
      console.log(`Contato criado com ID: ${contatoId}`);
    }

    const pedidoData = {
      contato: { id: contatoId },
      dataEmissao: new Date().toISOString().split('T')[0],
      tipo: 'P',
      status: 'aberto',
      desconto: 0,
      itens: itens.map(item => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario || (item.valor / item.quantidade),
        valor: item.valor
      }))
    };

    console.log('Pedido completo a ser enviado para Bling:', JSON.stringify(pedidoData, null, 2));
    const pedidoResponse = await api.post('/pedidos', pedidoData);
    console.log('Resposta da criação do pedido:', pedidoResponse.data);
    const pedidoId = pedidoResponse.data.id || pedidoResponse.data.data.id;
    console.log(`Pedido criado com ID: ${pedidoId}`);

    res.json({
      success: true,
      pedidoId: pedidoId
    });
  } catch (error) {
    console.error('Erro no processamento:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

fastify.register(routes);

async function start() {
  try {
    await fastify.listen({ port: 3005, host: '0.0.0.0' });
    console.log('🟢 Servidor BlingBot rodando em http://localhost:3005');
    logger.info('BlingBot iniciado com sucesso na porta 3005');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando BlingBot graciosamente');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando BlingBot graciosamente');
  await fastify.close();
  process.exit(0);
});

start();