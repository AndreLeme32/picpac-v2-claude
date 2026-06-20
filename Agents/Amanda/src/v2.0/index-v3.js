// ============================================
// AMANDA V3 - SISTEMA INTEGRADO 
// ============================================
// Agente de atendimento ao cliente via WhatsApp
// Integrado com Atlas, Decisor e BlingBot
// ============================================

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { routes } = require('./amanda-routes');
// const venom = require('venom-bot');

const PORT = process.env.PORT || 3001;

// Configurar CORS
fastify.register(cors, {
    origin: true,
    credentials: true
});

// ============================================
// REGISTRAR ROTAS SEM PREFIXO
// ============================================
// Removido o prefix '/api/amanda' para evitar duplicação
// As rotas agora são registradas diretamente
fastify.register(routes);

// ============================================
// INTEGRAÇÃO WHATSAPP (Comentada para testes)
// ============================================
/*
let client = null;

async function initWhatsApp() {
    try {
        client = await venom.create(
            'whatsapp-session',
            (base64Qrimg, asciiQR, attempts, urlCode) => {
                console.log('QR Code String:', asciiQR);
            },
            (statusSession, session) => {
                console.log(`[${new Date().toISOString()}] Status da sessão: ${statusSession}`);
            },
            {
                multidevice: true,
                folderNameToken: 'sessions',
                mkdirFolderToken: '',
                headless: true,
                devtools: false,
                useChrome: true,
                debug: false,
                logQR: true,
                browserWS: '',
                browserArgs: ['--no-sandbox'],
                puppeteerOptions: {},
                disableSpins: true,
                disableWelcome: true,
                updates: false,
                autoClose: 60000,
                createPathFileToken: false,
                waitForLogin: false
            }
        );

        console.log(`[${new Date().toISOString()}] Sessão iniciada com sucesso.`);

        // Configurar listeners
        await client.onStateChange((state) => {
            console.log(`[${new Date().toISOString()}] Estado do cliente mudou para: ${state}`);
            if (state === 'CONNECTED') {
                console.log(`[${new Date().toISOString()}] Cliente conectado com sucesso.`);
            }
        });

        await client.onMessage(async (message) => {
            try {
                if (!message.isGroupMsg && message.body && message.body.trim() !== '') {
                    console.log(`[${new Date().toISOString()}] Mensagem recebida de ${message.from}: ${message.body}`);
                    
                    // Enviar para processamento via API interna
                    const response = await fetch(`http://localhost:${PORT}/api/amanda`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message.body,
                            from: message.from,
                            sender: message.sender,
                            isGroupMsg: message.isGroupMsg,
                            chatId: message.chatId,
                            type: message.type,
                            timestamp: message.timestamp
                        })
                    });

                    const result = await response.json();
                    
                    // Enviar resposta de volta para o usuário
                    if (result.success && result.response) {
                        await client.sendText(message.from, result.response);
                    }
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Erro ao processar mensagem:`, error.message);
            }
        });

        await client.onIncomingCall(async (call) => {
            console.log(`[${new Date().toISOString()}] Chamada recebida de ${call.peerJid}`);
            await client.sendText(call.peerJid, 'Desculpe, não posso atender chamadas. Por favor, envie uma mensagem.');
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao iniciar WhatsApp:`, error);
    }
}
*/

// ============================================
// FUNÇÃO GLOBAL PARA ENVIAR MENSAGENS
// ============================================
global.sendWhatsAppMessage = async (to, message) => {
    try {
        if (!client) {
            console.error('[Amanda] Cliente WhatsApp não inicializado');
            return false;
        }
        
        await client.sendText(to, message);
        console.log(`[Amanda] Mensagem enviada para ${to}`);
        return true;
    } catch (error) {
        console.error(`[Amanda] Erro ao enviar mensagem:`, error.message);
        return false;
    }
};

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Amanda rodando na porta ${PORT}`);
        
        // Descomentar para ativar WhatsApp
        // await initWhatsApp();
        
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
