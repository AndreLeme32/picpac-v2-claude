const axios = require('axios');
const BoxPricingCalculator = require('BoxPricingCalculator');
const logger = require('logger');

class Amanda {
  constructor(calculator, conversationHistory, clientData) {
    this.calculator = calculator;
    this.conversationHistory = conversationHistory || [];
    this.clientData = clientData || {};
    this.catalog = [
      { id: 1, descricao: 'Caixa Pequena', preco_unitario: 10.00 },
      { id: 2, descricao: 'Caixa Média', preco_unitario: 20.00 },
      { id: 3, descricao: 'Caixa Grande', preco_unitario: 30.00 }
    ];
  }

  iniciarConversa() {
    this.limparConversa();
    return 'Conversa iniciada! Olá! Bem-vindo à Amanda - especialista em caixas. Digite \"catalogo\" para ver opções de pronta entrega, descreva seu pedido sob medida, forneça seus dados e confirme.';
  }

  async processarMensagem(mensagem) {
    this.conversationHistory.push({ role: 'user', content: mensagem });
    const intencao = this.analisarIntencao(mensagem);
    let resposta;
    switch (intencao) {
      case 'saudacao':
        resposta = this.responderSaudacao();
        break;
      case 'catalogo':
        resposta = this.responderCatalogo();
        break;
      case 'duvida':
        resposta = this.responderDuvida();
        break;
      case 'pedido_pronta':
        resposta = this.processarPedidoProntaEntrega(mensagem);
        break;
      case 'pedido_sob_medida':
        resposta = this.processarPedidoSobMedida(mensagem);
        break;
      case 'dados':
        resposta = this.processarDadosPessoais(mensagem);
        break;
      case 'formalizar':
        resposta = await this.formalizarPedido();
        break;
      case 'repetido':
        resposta = this.processarPedidoRepetido();
        break;
      default:
        resposta = this.responderPadrao();
    }
    this.conversationHistory.push({ role: 'assistant', content: resposta });
    return resposta;
  }

  analisarIntencao(mensagem) {
    const lower = mensagem.toLowerCase();
    if (/oi|olá|bom dia|boa tarde|boa noite|e aí|ei/.test(lower)) return 'saudacao';
    if (/catalogo|lista|produtos|pronta|entrega/.test(lower)) return 'catalogo';
    if (lower.includes('?') || /duvida|pergunta|como|o que/.test(lower)) return 'duvida';
    if (/pronta.*entrega|pronta-entrega/.test(lower)) return 'pedido_pronta';
    if (/sob.*medida|sob-medida|personalizada|custom/.test(lower)) return 'pedido_sob_medida';
    if (/nome|cpf|documento|email/.test(lower)) return 'dados';
    if (/confirmar|formalizar|enviar|fechar|ok/.test(lower)) return 'formalizar';
    if (/repetido|mesmo|igual|novamente/.test(lower)) return 'repetido';
    return 'padrao';
  }

  responderSaudacao() {
    return 'Olá! Bem-vindo! Posso ajudar com caixas de pronta entrega (digite \"catalogo\") ou sob medida (ex: \"caixa 30x20x10 qtd 2\"). Forneça nome, CPF, email e confirme o pedido.';
  }

  responderCatalogo() {
    const lista = this.catalog.map(p => `${p.descricao}: R$ ${p.preco_unitario.toFixed(2)}`).join('\n');
    return `Catálogo Pronta Entrega:\n${lista}\n\nExemplo de pedido: \"3 caixas pequenas\" ou \"pronta entrega 2 caixas grandes\"`;
  }

  responderDuvida() {
    return 'Ajudo com pedidos de caixas! Pronta entrega: veja catálogo. Sob medida: informe dimensões em cm (LxAxC). Depois, seus dados (nome, CPF 11 dígitos, email) e \"confirmar\".';
  }

  responderPadrao() {
    return 'Desculpe, não entendi completamente. Experimente: \"oi\", \"catalogo\", \"2 caixas médias\", \"caixa sob medida 40x30x20\", \"nome: João CPF:12345678901 email:joao@ex.com\", \"confirmar\".';
  }

  processarPedidoProntaEntrega(mensagem) {
    const nums = mensagem.match(/\\d+/g);
    let q = 1;
    if (nums && nums.length > 0) {
      q = parseInt(nums[0]);
    }
    const descLower = mensagem.replace(/\\d+/g, '').toLowerCase().replace(/pronta|entrega/gi, '').trim();
    const produto = this.catalog.find(p => 
      p.descricao.toLowerCase().includes(descLower) || 
      descLower.includes(p.descricao.toLowerCase())
    );
    if (!produto) {
      const cats = this.catalog.map(p => p.descricao.toLowerCase()).join(', ');
      return `Produto não encontrado. Disponíveis: ${cats}. Digite \"catalogo\" para ver.`;
    }
    const valor = q * produto.preco_unitario;
    if (!this.clientData.itens) this.clientData.itens = [];
    this.clientData.itens.push({
      descricao: produto.descricao,
      quantidade: q,
      preco_unitario: produto.preco_unitario,
      valor
    });
    logger.info(`Pronta entrega adicionada:`, this.clientData.itens[this.clientData.itens.length - 1]);
    return `✅ Adicionado ${q} x ${produto.descricao} (R$${produto.preco_unitario.toFixed(2)}/und) = R$ ${valor.toFixed(2)}\nTotal itens: ${this.clientData.itens.length}\nPróximo: forneça dados pessoais e \"confirmar\".`;
  }

  processarPedidoSobMedida(mensagem) {
    const dimMatch = mensagem.match(/(\\d+)x(\\d+)x(\\d+)/i);
    if (!dimMatch) {
      return 'Informe dimensões ex: \"caixa 30x20x10\" ou \"sob medida 40x30x25 qtd 2\".';
    }
    const l = parseInt(dimMatch[1]);
    const a = parseInt(dimMatch[2]);
    const c = parseInt(dimMatch[3]);
    const qMatch = mensagem.match(/qtd|quantidade[i:]*(\\d+)/i);
    const q = qMatch ? parseInt(qMatch[1]) : 1;
    try {
      const preco_unit = this.calculator.calcularPreco(l, a, c);
      if (typeof preco_unit !== 'number' || isNaN(preco_unit) || preco_unit <= 0) {
        return 'Erro no cálculo do preço sob medida. Verifique dimensões.';
      }
      const valor = q * preco_unit;
      if (!this.clientData.itens) this.clientData.itens = [];
      this.clientData.itens.push({
        descricao: `Caixa sob medida ${l}x${a}x${c}cm`,
        quantidade: q,
        preco_unitario: preco_unit,
        valor
      });
      logger.info(`Sob medida adicionada:`, this.clientData.itens[this.clientData.itens.length - 1]);
      return `✅ Adicionado ${q} x Caixa sob medida ${l}x${a}x${c}cm (R$${preco_unit.toFixed(2)}/und) = R$ ${valor.toFixed(2)}\nTotal itens: ${this.clientData.itens.length}\nPróximo: dados pessoais e \"confirmar\".`;
    } catch (err) {
      logger.error('Erro calculadora sob medida:', err);
      return 'Erro ao calcular preço sob medida.';
    }
  }

  processarDadosPessoais(mensagem) {
    let updated = [];
    const nomeMatch = mensagem.match(/(?:nome|chamo-me|sou)[:\s]*([A-Za-z\s]{2,})/i);
    if (nomeMatch) {
      this.clientData.nome = nomeMatch[1].trim();
      updated.push('nome');
    }
    const docMatch = mensagem.match(/(?:cpf|documento)[:\s]*(\\d{11})/i);
    if (docMatch) {
      this.clientData.documento = docMatch[1];
      updated.push('documento');
    }
    const emailMatch = mensagem.match(/email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      this.clientData.email = emailMatch[1].toLowerCase();
      updated.push('email');
    }
    if (updated.length === 0) {
      return 'Não detectei dados. Exemplo: \"nome: João Silva CPF: 12345678901 email: joao@email.com\"';
    }
    const status = `Nome: ${this.clientData.nome || 'n/i'}, Doc: ${this.clientData.documento || 'n/i'}, Email: ${this.clientData.email || 'n/i'}`;
    return `✅ Dados atualizados (${updated.join(', ')}). Status: ${status}\nDigite \"confirmar\" se ok.`;
  }

  async formalizarPedido() {
    if (!this.clientData.nome?.trim()) return 'Falta nome.';
    if (!this.clientData.documento || !/\\d{11}/.test(this.clientData.documento)) return 'Falta documento válido (11 dígitos).';
    if (!this.clientData.email?.includes('@')) return 'Falta email válido.';
    if (!this.clientData.itens || this.clientData.itens.length === 0) return 'Nenhum item no pedido. Adicione itens primeiro.';

    this.clientData.total = this.clientData.itens.reduce((acc, item) => acc + item.valor, 0);

    const confirmacao = this.montarConfirmacao();

    try {
      await this.enviarParaAtlas();
      this.limparConversa();
      return `${confirmacao}\n\n✅ Pedido formalizado e enviado para Atlas com sucesso! Nova conversa pode começar.`;
    } catch (err) {
      logger.error('Falha no envio após validação:', err);
      return `${confirmacao}\n\n❌ Validação OK, mas erro ao enviar para Atlas: ${err.message}`;
    }
  }

  processarPedidoRepetido() {
    if (!this.clientData.itens || this.clientData.itens.length === 0) {
      return 'Nenhum item anterior para repetir. Adicione um primeiro.';
    }
    const lastItem = this.clientData.itens[this.clientData.itens.length - 1];
    this.clientData.itens.push({ ...lastItem });
    const valorAdic = lastItem.valor;
    logger.info('Pedido repetido adicionado:', lastItem);
    return `✅ Repetido último item: +${lastItem.quantidade} x ${lastItem.descricao} = +R$ ${valorAdic.toFixed(2)}\nTotal itens agora: ${this.clientData.itens.length}`;
  }

  montarConfirmacao() {
    const itensStr = this.clientData.itens.map(i => 
      `  - ${i.descricao} | Qtd: ${i.quantidade} | Unit: R$${i.preco_unitario.toFixed(2)} | Total: R$${i.valor.toFixed(2)}`
    ).join('\n');
    return `CONFIRMAÇÃO DE PEDIDO:\n\n` +
      `Cliente:\n` +
      `  Nome: ${this.clientData.nome}\n` +
      `  Documento: ${this.clientData.documento}\n` +
      `  Email: ${this.clientData.email}\n\n` +
      `Itens:\n${itensStr}\n\n` +
      `TOTAL: R$ ${this.clientData.total.toFixed(2)}`;
  }

  async enviarParaAtlas() {
    const payload = {
      nome: this.clientData.nome,
      documento: this.clientData.documento,
      email: this.clientData.email,
      itens: this.clientData.itens.map(i => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        valor: i.valor
      })),
      total: this.clientData.total
    };
    const payloadStr = JSON.stringify(payload, null, 2);
    logger.info(`Enviando payload COMPLETO para Atlas:\n${payloadStr}`);

    const url = `https://api.atlas.example.com/pedidos`;  // Substitua pela URL real
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    logger.info('Resposta Atlas:', response.data);
    return response.data;
  }

  obterHistorico() {
    return [...this.conversationHistory];
  }

  limparConversa() {
    this.conversationHistory = [];
    this.clientData = {};
    logger.info('Conversa limpa');
  }
}

module.exports = Amanda;