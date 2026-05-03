const { decidir } = require('./decisor');

module.exports = async function (fastify, opts) {
  fastify.get('/status', async (request, reply) => ({
    status: 'OK'
  }));

  fastify.post('/receberDadosDeAtlas', async (request, reply) => {
    try {
      const data = request.body;
      const resultadoDecisor = await decidir('criar_proposta', data);
      if (!resultadoDecisor.success) {
        return reply.code(500).send({ error: 'Falha ao criar proposta' });
      }
      const proposta = resultadoDecisor.proposta;

      const fetchResponse = await fetch('http://localhost:3005/processar-proposta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposta)
      });

      if (!fetchResponse.ok) {
        throw new Error(`Falha no BlingBot: ${fetchResponse.status}`);
      }

      const pdfBuffer = await fetchResponse.arrayBuffer();
      return reply
        .code(200)
        .type('application/pdf')
        .header('Content-Disposition', 'attachment; filename="proposta.pdf"')
        .send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error('Erro na rota /receberDadosDeAtlas:', error);
      return reply.code(500).send({ error: error.message });
    }
  });
};