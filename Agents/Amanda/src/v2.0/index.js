const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// Configurar CORS
fastify.register(cors, {
    origin: true,
    credentials: true
});

// IMPORTAR E REGISTRAR ROTAS DA AMANDA
const { routes } = require('./amanda-routes');
fastify.register(routes);

// Rota básica de teste (mantida para compatibilidade)
fastify.get('/', async (request, reply) => {
    return { 
        status: 'ok', 
        agent: 'Amanda', 
        version: '1.0',
        timestamp: new Date().toISOString()
    };
});

// Inicialização do servidor
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Amanda rodando na porta ${PORT}`);
        console.log(`Rotas carregadas: /health, /api/amanda, /webhook, /corrections, /send-proposal`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
