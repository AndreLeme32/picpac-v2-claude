const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const sessionsDir = path.join(__dirname, 'sessions');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
async function createSession(sessionName) {
  const sessionPath = path.join(sessionsDir, sessionName);

  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
  }

  const client = await wppconnect.create({
    session: sessionName,
    catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
      log(`QR Code gerado. Tentativas: ${attempts}`);
    },
    statusFind: (statusSession, session) => {
      log(`Status da sessão: ${statusSession}`);
    },
    headless: true,
    devtools: false,
    useChrome: true,
    debug: false,
    logQR: true,
    puppeteerOptions: {
      userDataDir: sessionPath,
    },
  });
  client.onMessage(async (message) => {
    try {
      log(`Mensagem recebida de ${message.from}: ${message.body}`);

      const response = await axios.post(`http://localhost:3001/api/amanda`, {
  message: message.body,
  phone: message.from,  // ✅ CORRETO - usar "phone" em vez de "from"
});

      if (response.data && response.data.response) {
        await client.sendText(message.from, response.data.response);
        log(`Resposta enviada para ${message.from}`);
      }
    } catch (error) {
      log(`Erro ao processar mensagem: ${error.message}`);
    }
  });
  client.onStateChange(async (state) => {
    log(`Estado do cliente mudou para: ${state}`);
    if (state === 'CONNECTED') {
      log(`Cliente conectado com sucesso.`);
    } else if (state === 'DISCONNECTED') {
      log(`Cliente desconectado.`);
    }
  });

  client.onIncomingCall(async (call) => {
    log(`Chamada recebida de ${call.peerJid}`);
    await client.rejectCall(call.id);
  });

  return client;
}
createSession('whatsapp-session')
  .then((client) => {
    log(`Sessão iniciada com sucesso.`);
  })
  .catch((error) => {
    log(`Erro ao iniciar sessão: ${error.message}`);
  });