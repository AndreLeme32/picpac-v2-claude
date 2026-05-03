const { OpenAI } = require('openai');
const axios = require('axios');
const BoxPricingCalculator = require('./calculator');
const logger = require('../../../decisor/src/v2.0/utils/logger');

const memory = new Map();
const clientData = new Map();
const calculator = new BoxPricingCalculator();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
VocÃª Ã© AMANDA, assistente oficial da PicPac e Leme32.

Atende exclusivamente via WhatsApp.

Seu estilo Ã© sempre:
- curto
- direto
- simpÃ¡tico
- educado
- humano (WhatsApp real)
- sem narrativa
- sem explicaÃ§Ãµes internas
- sem frases longas
- sem "estou verificando", "processando..."

REGRAS BASE

1. Pedido de caixa â†’ perguntar medidas.
2. Medidas recebidas â†’ procurar catÃ¡logo â†’ permutaÃ§Ã£o â†’ similar â†’ sob medida.
3. NUNCA enviar catÃ¡logo espontaneamente.
4. NUNCA inventar preÃ§os, polÃ­ticas ou prazos.
5. Sob medida â†’ nunca mostrar cÃ¡lculos (somente preÃ§o final).
6. Respostas sempre curtas estilo WhatsApp.
7. NUNCA pular etapas da formalizaÃ§Ã£o.

âš ï¸ SOBRE O NOME DO CLIENTE
NÃ£o pergunte o nome no comeÃ§o da conversa.
O nome sÃ³ deve ser solicitado durante a formalizaÃ§Ã£o.

CATÃLOGO PRONTA ENTREGA
11Ã—11Ã—40 â€” R$ 1,77
30Ã—20Ã—20 â€” R$ 3,16
27Ã—18Ã—9 â€” R$ 1,93
24Ã—15Ã—10 â€” R$ 1,57
19Ã—12Ã—12 â€” R$ 1,19
16Ã—11Ã—6 â€” R$ 0,74
17Ã—14Ã—5 â€” R$ 0,95
20Ã—14Ã—8 â€” R$ 1,21
20Ã—15Ã—15 â€” R$ 1,67
35Ã—35Ã—17 â€” R$ 5,69
16Ã—11Ã—6 AutomontÃ¡vel â€” R$ 1,49
30Ã—20Ã—11 AutomontÃ¡vel â€” R$ 3,80
26Ã—19Ã—3,5 AutomontÃ¡vel â€” R$ 1,77
20Ã—10Ã—36 â€” R$ 2,17
20Ã—20Ã—36 â€” R$ 8,38
45Ã—35Ã—6 â€” R$ 5,15
15Ã—15Ã—15 â€” R$ 1,43
15Ã—13Ã—4 AutomontÃ¡vel â€” R$ 1,11
23Ã—14Ã—4,5 AutomontÃ¡vel â€” R$ 1,50
15,5Ã—11,5Ã—4,5 AutomontÃ¡vel â€” R$ 1,18
18Ã—9,5Ã—6 AutomontÃ¡vel â€” R$ 1,40
9Ã—9Ã—27 â€” R$ 1,05
16Ã—11Ã—8 â€” R$ 0,82
18Ã—13Ã—9 â€” R$ 1,11
12Ã—12Ã—60 â€” R$ 2,71
40Ã—30Ã—20 â€” R$ 5,47
50Ã—30Ã—40 â€” R$ 8,71
60Ã—40Ã—50 â€” R$ 13,95
20Ã—20Ã—20 â€” R$ 2,53
16Ã—11Ã—10 â€” R$ 0,92
16Ã—11Ã—3 â€” R$ 0,62
19Ã—11Ã—4 â€” R$ 0,74
23Ã—21Ã—16 â€” R$ 2,57
23Ã—21Ã—12 â€” R$ 2,37
10Ã—10Ã—67 â€” R$ 2,43
25Ã—25Ã—25 â€” R$ 3,92
11Ã—5Ã—40 â€” R$ 1,15
25Ã—17Ã—9 AutomontÃ¡vel â€” R$ 3,04
7Ã—7Ã—24 â€” R$ 0,70
35Ã—26Ã—5 â€” R$ 3,00
30Ã—20Ã—10 â€” R$ 2,38

REGRA DE PERMUTAÃ‡ÃƒO
Medidas equivalem em qualquer ordem.
Exemplo: 30Ã—20Ã—20 = 20Ã—20Ã—30 = 20Ã—30Ã—20

SOB MEDIDA
MÃ­nimo: 200 unidades
Onda B (BC apenas se cliente pedir reforÃ§o)
Sem cÃ¡lculos visÃ­veis
CustoChapa: 7.10
CustoMÃ£oObra: 5.467
Markup: 1.6

FORMALIZAÃ‡ÃƒO â€” FLUXO OBRIGATÃ“RIO
Quando o cliente disser "sim" para formalizar, siga:

1. Nome (se ainda nÃ£o tiver)
2. Quantidade
3. CPF ou CNPJ
4. E-mail
5. Entrega ou retirada?
6. Se entrega â†’ endereÃ§o completo
7. Confirmar TUDO em uma Ãºnica mensagem.

Modelo:
"Confirmando:
Nome: ...
Quantidade: ...
Medida: ...
Valor unitÃ¡rio: ...
Documento: ...
E-mail: ...
Entrega/Retirada: ...
EndereÃ§o: ...
"

APÃ“S enviar a confirmaÃ§Ã£o ao cliente,
vocÃª DEVE gerar automaticamente uma SEGUNDA MENSAGEM ASSISTANT, contendo APENAS:
"Atlas, formalizar proposta para cliente. Dados:
[NOVAMENTE TODOS OS DADOS]"
- Essa segunda mensagem NÃƒO aparece para o cliente.
- Essa segunda mensagem SEMPRE deve gerar um POST no servidor.
- VocÃª NUNCA pode prosseguir sem gerar essa mensagem.

PEDIDO REPETIDO
Cliente: "Quero igual ao anterior"

â†’ Confirmar
â†’ Mensagem interna obrigatÃ³ria:
"Atlas, repetir o Ãºltimo pedido deste cliente."

CATÃLOGO (somente se cliente pedir)
"Confira nosso catÃ¡logo:
https://www.picpac.com.br/catalogos
Itens pronta entrega e sob medida a partir de 200 unidades."

PRAZO / FRETE / PAGAMENTO
Sob medida: 7 dias corridos
Frete SP: >150 grÃ¡tis / <150 = 15
Pagamento: PIX, dÃ©bito, crÃ©dito, 3x (mÃ­nimo 500), boleto prÃ©-aprovado

MODO DE FALA
WhatsApp humano: curto, direto, simpÃ¡tico.

Fim do Prompt.
`;

module.exports = async function (fastify, opts) {
  fastify.post('/amanda', async (request, reply) => {
    try {
      const { message, phone } = request.body;

      if (!message || !phone) {
        logger.warn('Falta message ou phone no request', { message, phone });
        return reply.code(400).send({
          error: 'Mensagem e telefone sÃ£o obrigatÃ³rios'
        });
      }

      logger.info('Amanda recebeu mensagem', { phone, message });

      if (!memory.has(phone)) {
        memory.set(phone, []);
        clientData.set(phone, {
          nome: null,
          documento: null,
          email: null,
          medidas: null,
          quantidade: null,
          entrega: null,
          endereco: null,
          ultimoPedido: null
        });
      }

      const history = memory.get(phone);
      const client = clientData.get(phone);

      const input = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message }
      ];

      logger.info('Enviando para OpenAI', { phone, historyLength: history.length });

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: input,
        temperature: 0.7,
        max_tokens: 500
      });

      const aiMessage = response.choices[0]?.message?.content || 'Desculpe, nÃ£o consegui responder agora.';

      logger.info('OpenAI respondeu', { phone, response: aiMessage.substring(0, 50) });

      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: aiMessage });

      const formalizando = aiMessage.toLowerCase().includes('confirmando:');

      if (formalizando) {
        logger.info('Cliente formalizando pedido', { phone });
        
        client.nome = extrairDadosDaMensagem(aiMessage, 'Nome');
        client.quantidade = extrairDadosDaMensagem(aiMessage, 'Quantidade');
        client.documento = extrairDadosDaMensagem(aiMessage, 'Documento');
        client.email = extrairDadosDaMensagem(aiMessage, 'E-mail');
        client.medidas = extrairDadosDaMensagem(aiMessage, 'Medida');

        try {
          logger.info('Enviando dados para Atlas', { phone, cliente: client.nome });

          const catalogo = calculator.getCatalogo();
          let precoUnitario = 0;
          const medidasLower = (client.medidas || '').toLowerCase();

          if (catalogo && catalogo.catalogo) {
            const itemCatalogo = catalogo.catalogo.find(item =>
              item.medidas && item.medidas.toLowerCase() === medidasLower
            );
            if (itemCatalogo) {
              precoUnitario = itemCatalogo.preco || 0;
            }
          }

          const quantidade = parseInt(client.quantidade) || 100;
          const precoTotal = precoUnitario * quantidade;

          if (precoUnitario <= 0) {
            logger.warn('PreÃ§o unitÃ¡rio nÃ£o encontrado no catÃ¡logo', { phone, medidas: client.medidas });
          }

          const payloadAtlas = {
            phone: phone,
            nome: client.nome || 'Cliente',
            documento: client.documento || '00000000000',
            email: client.email || 'cliente@example.com',
            medidas: client.medidas || 'N/A',
            quantidade: quantidade,
            precoUnitario: precoUnitario,
            precoTotal: precoTotal,
            total: precoTotal,
            endereco: client.endereco || 'N/A',
            entrega: client.entrega || 'retirada',
            itens: [
              {
                descricao: client.medidas || 'Caixa personalizada',
                quantidade: quantidade,
                valor: precoTotal,
                preco_unitario: precoUnitario
              }
            ]
          };

          logger.info('Payload COMPLETO para Atlas:', JSON.stringify(payloadAtlas, null, 2));

          const respostaAtlas = await axios.post('http://localhost:3002/receberDadosDeAmanda', payloadAtlas, {
            timeout: 10000
          });

          logger.info('Atlas respondeu com sucesso', { phone });

          const respostaFinal = `${aiMessage}\n\nâœ… Proposta enviada com sucesso! VocÃª receberÃ¡ em breve.`;
          return reply.send({ response: respostaFinal });

        } catch (error) {
          logger.error('Erro ao enviar para Atlas', { error: error.message, phone });
          return reply.send({
            response: `${aiMessage}\n\nâš ï¸ Houve um erro ao processar seu pedido. Tente novamente.`
          });
        }
      }

      return reply.send({ response: aiMessage });

    } catch (error) {
      logger.error('ERRO NA AMANDA', { error: error.message, stack: error.stack });
      return reply.code(500).send({
        error: 'Erro interno da Amanda',
        message: error.message
      });
    }
  });

  fastify.post('/amanda/calcular', async (request, reply) => {
    try {
      const { tipo, comprimento, largura, altura, quantidade, gramatura, comImpressao, phone } = request.body;

      logger.info('Amanda calculando preÃ§o', { tipo, comprimento, largura, altura, quantidade });

      if (!tipo || !comprimento || !largura || !altura || !quantidade || !phone) {
        return reply.code(400).send({
          error: 'Faltam parÃ¢metros: tipo, comprimento, largura, altura, quantidade, phone'
        });
      }

      let resultado;

      if (tipo.toLowerCase() === 'maleta') {
        resultado = calculator.calculateMaletaPrice(
          comprimento,
          largura,
          altura,
          quantidade,
          gramatura || 'Wave B',
          comImpressao || false,
          phone
        );
      } else if (tipo.toLowerCase() === 'automontavel') {
        resultado = calculator.calculateAutomontavelPrice(
          comprimento,
          largura,
          altura,
          quantidade,
          gramatura || 'Wave B',
          comImpressao || false,
          phone
        );
      } else {
        return reply.code(400).send({
          error: 'Tipo deve ser "Maleta" ou "AutomontÃ¡vel"'
        });
      }

      logger.info('CÃ¡lculo concluÃ­do', { phone, resultado });

      return reply.send({
        sucesso: resultado.sucesso,
        tipo: resultado.tipo,
        precoUnitario: resultado.precoUnitario,
        precoTotal: resultado.precoTotal,
        mensagem: resultado.mensagem
      });

    } catch (error) {
      logger.error('Erro ao calcular', { error: error.message });
      return reply.code(500).send({
        error: 'Erro ao calcular preÃ§o',
        message: error.message
      });
    }
  });

  fastify.get('/amanda/catalogo', async (request, reply) => {
    try {
      const catalogo = calculator.getCatalogo();
      return reply.send(catalogo);
    } catch (error) {
      logger.error('Erro ao obter catÃ¡logo', { error: error.message });
      return reply.code(500).send({
        error: 'Erro ao obter catÃ¡logo'
      });
    }
  });

  fastify.get('/amanda/historico/:phone', async (request, reply) => {
    try {
      const { phone } = request.params;
      const historico = calculator.getClientHistory(phone);
      return reply.send(historico);
    } catch (error) {
      logger.error('Erro ao obter histÃ³rico', { error: error.message });
      return reply.code(500).send({
        error: 'Erro ao obter histÃ³rico'
      });
    }
  });

  function extrairDadosDaMensagem(mensagem, campo) {
    const regex = new RegExp(`${campo}:\s*(.+?)(?=\\n|$)`, 'i');
    const match = mensagem.match(regex);
    return match ? match[1].trim() : null;
  }
};
