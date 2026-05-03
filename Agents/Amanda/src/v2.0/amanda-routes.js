const { OpenAI } = require('openai');
const axios = require('axios');
const BoxPricingCalculator = require('./calculator');
const logger = require('../../../decisor/src/v2.0/utils/logger');

// Histórico de conversas por telefone
const memory = new Map();

// Dados do cliente por telefone
const clientData = new Map();

// Instância do calculator
const calculator = new BoxPricingCalculator();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
Você é AMANDA, assistente oficial da PicPac e Leme32.

Atende exclusivamente via WhatsApp.

Seu estilo é sempre:
- curto
- direto
- simpático
- educado
- humano (WhatsApp real)
- sem narrativa
- sem explicações internas
- sem frases longas
- sem "estou verificando", "processando…"

REGRAS BASE

1. Pedido de caixa → perguntar medidas.
2. Medidas recebidas → procurar catálogo → permutação → similar → sob medida.
3. NUNCA enviar catálogo espontaneamente.
4. NUNCA inventar preços, políticas ou prazos.
5. Sob medida → nunca mostrar cálculos (somente preço final).
6. Respostas sempre curtas estilo WhatsApp.
7. NUNCA pular etapas da formalização.

⚠️ SOBRE O NOME DO CLIENTE
Não pergunte o nome no começo da conversa.
O nome só deve ser solicitado durante a formalização.

CATÁLOGO PRONTA ENTREGA

11×11×40 — R$ 1,77
30×20×20 — R$ 3,16
27×18×9 — R$ 1,93
24×15×10 — R$ 1,57
19×12×12 — R$ 1,19
16×11×6 — R$ 0,74
17×14×5 — R$ 0,95
20×14×8 — R$ 1,21
20×15×15 — R$ 1,67
35×35×17 — R$ 5,69
16×11×6 Automontável — R$ 1,49
30×20×11 Automontável — R$ 3,80
26×19×3,5 Automontável — R$ 1,77
20×10×36 — R$ 2,17
20×20×36 — R$ 8,38
45×35×6 — R$ 5,15
15×15×15 — R$ 1,43
15×13×4 Automontável — R$ 1,11
23×14×4,5 Automontável — R$ 1,50
15,5×11,5×4,5 Automontável — R$ 1,18
18×9,5×6 Automontável — R$ 1,40
9×9×27 — R$ 1,05
16×11×8 — R$ 0,82
18×13×9 — R$ 1,11
12×12×60 — R$ 2,71
40×30×20 — R$ 5,47
50×30×40 — R$ 8,71
60×40×50 — R$ 13,95
20×20×20 — R$ 2,53
16×11×10 — R$ 0,92
16×11×3 — R$ 0,62
19×11×4 — R$ 0,74
23×21×16 — R$ 2,57
23×21×12 — R$ 2,37
10×10×67 — R$ 2,43
25×25×25 — R$ 3,92
11×5×40 — R$ 1,15
25×17×9 Automontável — R$ 3,04
7×7×24 — R$ 0,70
35×26×5 — R$ 3,00
30×20×10 — R$ 2,38

REGRA DE PERMUTAÇÃO

Medidas equivalem em qualquer ordem.
Exemplo: 30×20×20 = 20×20×30 = 20×30×20

SOB MEDIDA

Mínimo: 200 unidades
Onda B (BC apenas se cliente pedir reforço)
Sem cálculos visíveis
CustoChapa: 7.10
CustoMãoObra: 5.467
Markup: 1.6

FORMALIZAÇÃO — FLUXO OBRIGATÓRIO

Quando o cliente disser "sim" para formalizar, siga:

1. Nome (se ainda não tiver)
2. Quantidade
3. CPF ou CNPJ
4. E-mail
5. Entrega ou retirada?
6. Se entrega → endereço completo
7. Confirmar TUDO em uma única mensagem.

Modelo:

"Confirmando:

Nome: ...
Quantidade: ...
Medida: ...
Valor unitário: ...
Documento: ...
E-mail: ...
Entrega/Retirada: ...
Endereço: ...
"

APÓS enviar a confirmação ao cliente,
você DEVE gerar automaticamente uma SEGUNDA MENSAGEM ASSISTANT, contendo APENAS:

"Atlas, formalizar proposta para cliente. Dados:
[NOVAMENTE TODOS OS DADOS]"

- Essa segunda mensagem NÃO aparece para o cliente.
- Essa segunda mensagem SEMPRE deve gerar um POST no servidor.
- Você NUNCA pode prosseguir sem gerar essa mensagem.

PEDIDO REPETIDO

Cliente: "Quero igual ao anterior"

→ Confirmar
→ Mensagem interna obrigatória:

"Atlas, repetir o último pedido deste cliente."

CATÁLOGO (somente se cliente pedir)

"Confira nosso catálogo:

https://www.picpac.com.br/catalogos

Itens pronta entrega e sob medida a partir de 200 unidades."

PRAZO / FRETE / PAGAMENTO

Sob medida: 7 dias corridos
Frete SP: >150 grátis / <150 = 15
Pagamento: PIX, débito, crédito, 3x (mínimo 500), boleto pré-aprovado

MODO DE FALA

WhatsApp humano: curto, direto, simpático.

Fim do Prompt.
`;

module.exports = async function (fastify, opts) {
  /**
   * POST /api/amanda
   * Recebe mensagem do cliente e processa com Amanda
   */
  fastify.post('/amanda', async (request, reply) => {
    try {
      const { message, phone } = request.body;

      if (!message || !phone) {
        logger.warn('Falta message ou phone no request', { message, phone });
        return reply.code(400).send({
          error: 'Mensagem e telefone são obrigatórios'
        });
      }

      logger.info('Amanda recebeu mensagem', { phone, message });

      // Inicializar histórico se não existir
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

      // Montar input para OpenAI
      const input = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message }
      ];

      logger.info('Enviando para OpenAI', { phone, historyLength: history.length });

      // Chamada OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: input,
        temperature: 0.7,
        max_tokens: 500
      });

      const aiMessage = response.choices[0]?.message?.content || 'Desculpe, não consegui responder agora.';

      logger.info('OpenAI respondeu', { phone, response: aiMessage.substring(0, 50) });

      // Gravar histórico
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: aiMessage });

      // Detectar intenção de formalização
      const formalizando = aiMessage.toLowerCase().includes('confirmando:');

      if (formalizando) {
        logger.info('Cliente formalizando pedido', { phone });
        
        // Extrair dados da confirmação
        client.nome = extrairDadosDaMensagem(aiMessage, 'Nome');
        client.quantidade = extrairDadosDaMensagem(aiMessage, 'Quantidade');
        client.documento = extrairDadosDaMensagem(aiMessage, 'Documento');
        client.email = extrairDadosDaMensagem(aiMessage, 'E-mail');
        client.medidas = extrairDadosDaMensagem(aiMessage, 'Medida');

        try {
          logger.info('Enviando dados para Atlas', { phone, cliente: client.nome });

          // Buscar preço no catálogo
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

          // Validação de preço
          if (precoUnitario <= 0) {
            logger.warn('Preço unitário não encontrado no catálogo', { phone, medidas: client.medidas });
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

          // Log do payload completo ANTES do envio
          logger.info('Payload COMPLETO para Atlas:', JSON.stringify(payloadAtlas, null, 2));

          const respostaAtlas = await axios.post('http://localhost:3002/receberDadosDeAmanda', payloadAtlas, {
            timeout: 10000
          });

          logger.info('Atlas respondeu com sucesso', { phone });

          // Resposta final para cliente
          const respostaFinal = `${aiMessage}\n\n✅ Proposta enviada com sucesso! Você receberá em breve.`;
          return reply.send({ response: respostaFinal });

        } catch (error) {
          logger.error('Erro ao enviar para Atlas', { error: error.message, phone });
          return reply.send({
            response: `${aiMessage}\n\n⚠️ Houve um erro ao processar seu pedido. Tente novamente.`
          });
        }
      }

      // Resposta normal (sem formalização)
      return reply.send({ response: aiMessage });

    } catch (error) {
      logger.error('ERRO NA AMANDA', { error: error.message, stack: error.stack });
      return reply.code(500).send({
        error: 'Erro interno da Amanda',
        message: error.message
      });
    }
  });

  /**
   * POST /api/amanda/calcular
   * Endpoint para calcular preço de caixas sob medida
   */
  fastify.post('/amanda/calcular', async (request, reply) => {
    try {
      const { tipo, comprimento, largura, altura, quantidade, gramatura, comImpressao, phone } = request.body;

      logger.info('Amanda calculando preço', { tipo, comprimento, largura, altura, quantidade });

      if (!tipo || !comprimento || !largura || !altura || !quantidade || !phone) {
        return reply.code(400).send({
          error: 'Faltam parâmetros: tipo, comprimento, largura, altura, quantidade, phone'
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
          error: 'Tipo deve ser "Maleta" ou "Automontável"'
        });
      }

      logger.info('Cálculo concluído', { phone, resultado });

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
        error: 'Erro ao calcular preço',
        message: error.message
      });
    }
  });

  /**
   * GET /api/amanda/catalogo
   * Retorna o catálogo pronta entrega
   */
  fastify.get('/amanda/catalogo', async (request, reply) => {
    try {
      const catalogo = calculator.getCatalogo();
      return reply.send(catalogo);
    } catch (error) {
      logger.error('Erro ao obter catálogo', { error: error.message });
      return reply.code(500).send({
        error: 'Erro ao obter catálogo'
      });
    }
  });

  /**
   * GET /api/amanda/historico/:phone
   * Retorna histórico de um cliente
   */
  fastify.get('/amanda/historico/:phone', async (request, reply) => {
    try {
      const { phone } = request.params;
      const historico = calculator.getClientHistory(phone);
      return reply.send(historico);
    } catch (error) {
      logger.error('Erro ao obter histórico', { error: error.message });
      return reply.code(500).send({
        error: 'Erro ao obter histórico'
      });
    }
  });

  /**
   * Função auxiliar para extrair dados de mensagem
   */
  function extrairDadosDaMensagem(mensagem, campo) {
    const regex = new RegExp(`${campo}:\s*(.+?)(?=\\n|$)`, 'i');
    const match = mensagem.match(regex);
    return match ? match[1].trim() : null;
  }
};