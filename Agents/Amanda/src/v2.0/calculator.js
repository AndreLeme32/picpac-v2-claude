const logger = require('../../../decisor/src/v2.0/utils/logger');

class BoxPricingCalculator {
  constructor() {
    // Constantes de custo
    this.CUSTO_CHAPA = 7.10;
    this.CUSTO_MAO_OBRA = 5.467;
    this.MARKUP = 1.6;
    this.CLICHE = 150;
    this.PRINTING_MARKUP = 0.1;
    this.MIN_UNITS = 200;

    // Gramaturas (kg/m²)
    this.GRAMATURAS = {
      'Wave B': 0.380,
      'Wave BC': 0.650
    };

    // Histórico de clientes
    this.clientHistory = new Map(); // phone -> {hasOrdered: boolean, orders: array}
  }

  /**
   * Detecta o tipo de caixa (Maleta ou Automontável)
   */
  detectBoxType(description) {
    const desc = description.toLowerCase();
    if (desc.includes('automontável') || desc.includes('automontavel') || desc.includes('corte e vinco') || desc.includes('travas')) {
      return 'automontavel';
    }
    return 'maleta';
  }

  /**
   * Calcula a área da caixa Maleta
   * Fórmula: ((2 × (C + 2)) + (2 × (L + 2))) / 1000 × (((((L/2) + 2) × 2) + (A + 5))) / 1000
   */
  calculateMaletaArea(comprimento, largura, altura) {
    const c = comprimento;
    const l = largura;
    const a = altura;

    const dimensao1 = ((2 * (c + 2)) + (2 * (l + 2))) / 1000;
    const dimensao2 = (((((l / 2) + 2) * 2) + (a + 5))) / 1000;

    const area = dimensao1 * dimensao2;
    logger.debug('Cálculo área Maleta', { c, l, a, dimensao1, dimensao2, area });
    return area;
  }

  /**
   * Calcula a área da caixa Automontável
   * Fórmula: ((A + A + C + A + A)/1000) × ((A + L + A + L + A)/1000)
   */
  calculateAutomontavelArea(comprimento, largura, altura) {
    const c = comprimento;
    const l = largura;
    const a = altura;

    const dimensao1 = ((a + a + c + a + a) / 1000);
    const dimensao2 = ((a + l + a + l + a) / 1000);

    const area = dimensao1 * dimensao2;
    logger.debug('Cálculo área Automontável', { c, l, a, dimensao1, dimensao2, area });
    return area;
  }

  /**
   * Calcula o peso da caixa
   * Peso = Área × Gramatura
   */
  calculateWeight(area, gramaturaKey) {
    const gramatura = this.GRAMATURAS[gramaturaKey] || this.GRAMATURAS['Wave B'];
    const peso = area * gramatura;
    logger.debug('Cálculo peso', { area, gramatura, peso });
    return peso;
  }

  /**
   * Calcula o custo base da caixa POR UNIDADE
   * CustoUnitario = (MatériaPrima + MãoObra) × Markup
   * Onde: MatériaPrima = CustoChapa × Peso
   *       MãoObra = CustoMãoObra × Peso
   */
  calculateBaseCost(peso) {
    const materiaPrima = this.CUSTO_CHAPA * peso;
    const maoObra = this.CUSTO_MAO_OBRA * peso;
    const custoUnitario = (materiaPrima + maoObra) * this.MARKUP;
    
    logger.debug('Cálculo custo base', { peso, materiaPrima, maoObra, custoUnitario });
    return custoUnitario;
  }

  /**
   * Calcula o custo da faca (die) para automontável
   * Fórmula: ((A + L + A + L + A + A + A + C + A + A)/10) × 3.2 × 1.1
   */
  calculateDieCost(comprimento, largura, altura) {
    const c = comprimento;
    const l = largura;
    const a = altura;

    const dimensaoTotal = (a + l + a + l + a + a + a + c + a + a) / 10;
    const custoDie = dimensaoTotal * 3.2 * 1.1;
    
    logger.debug('Cálculo faca (die)', { c, l, a, dimensaoTotal, custoDie });
    return custoDie;
  }

  /**
   * Calcula o preço de uma caixa Maleta
   * CORRIGIDO: Não divide mais por quantidade
   */
  calculateMaletaPrice(comprimento, largura, altura, quantidade, gramaturaKey, comImpressao, phone) {
    try {
      logger.info('Iniciando cálculo Maleta', { comprimento, largura, altura, quantidade, gramaturaKey, comImpressao });

      // Validar quantidade mínima
      if (quantidade < this.MIN_UNITS) {
        return {
          sucesso: false,
          mensagem: `Quantidade mínima é ${this.MIN_UNITS} unidades.`
        };
      }

      // Calcular área, peso e custo base POR UNIDADE
      const area = this.calculateMaletaArea(comprimento, largura, altura);
      const peso = this.calculateWeight(area, gramaturaKey);
      let precoUnitario = this.calculateBaseCost(peso); // ✅ AGORA É O PREÇO POR UNIDADE

      // Aplicar impressão (se primeira encomenda)
      if (comImpressao) {
        precoUnitario *= (1 + this.PRINTING_MARKUP); // +10%

        // Verificar se é primeira encomenda
        const clientInfo = this.clientHistory.get(phone) || { hasOrdered: false, orders: [] };
        if (!clientInfo.hasOrdered) {
          // Clichê é adicionado ao custo total, não ao unitário
          const custoClicheTotal = this.CLICHE; // R$ 150 para o lote inteiro
          precoUnitario += (custoClicheTotal / quantidade); // Distribuir entre unidades
        }
      }

      // Preço total = preço por unidade × quantidade
      const precoTotal = precoUnitario * quantidade;

      // Registrar no histórico
      this.registerOrder(phone, {
        tipo: 'Maleta',
        comprimento,
        largura,
        altura,
        quantidade,
        gramatura: gramaturaKey,
        comImpressao,
        precoUnitario,
        precoTotal,
        data: new Date().toISOString()
      });

      logger.info('Cálculo Maleta concluído', { precoUnitario, precoTotal });

      return {
        sucesso: true,
        tipo: 'Maleta',
        precoUnitario: precoUnitario.toFixed(2),
        precoTotal: precoTotal.toFixed(2),
        mensagem: `Caixa Maleta ${comprimento}x${largura}x${altura}mm - R$ ${precoUnitario.toFixed(2)}/un (Total: R$ ${precoTotal.toFixed(2)})`
      };

    } catch (error) {
      logger.error('Erro ao calcular Maleta', { error: error.message });
      return {
        sucesso: false,
        mensagem: 'Erro ao calcular preço. Tente novamente.'
      };
    }
  }

  /**
   * Calcula o preço de uma caixa Automontável
   * CORRIGIDO: Não divide mais por quantidade
   */
  calculateAutomontavelPrice(comprimento, largura, altura, quantidade, gramaturaKey, comImpressao, phone) {
    try {
      logger.info('Iniciando cálculo Automontável', { comprimento, largura, altura, quantidade, gramaturaKey, comImpressao });

      // Validar quantidade mínima
      if (quantidade < this.MIN_UNITS) {
        return {
          sucesso: false,
          mensagem: `Quantidade mínima é ${this.MIN_UNITS} unidades.`
        };
      }

      // Calcular área, peso e custo base POR UNIDADE
      const area = this.calculateAutomontavelArea(comprimento, largura, altura);
      const peso = this.calculateWeight(area, gramaturaKey);
      let precoUnitario = this.calculateBaseCost(peso); // ✅ AGORA É O PREÇO POR UNIDADE

      // Verificar se é primeira encomenda
      const clientInfo = this.clientHistory.get(phone) || { hasOrdered: false, orders: [] };
      const isFirstOrder = !clientInfo.hasOrdered;

      // Adicionar custo da faca (apenas primeira encomenda) - DISTRIBUÍDO ENTRE UNIDADES
      if (isFirstOrder) {
        const custoDie = this.calculateDieCost(comprimento, largura, altura);
        precoUnitario += (custoDie / quantidade); // Distribuir custo da faca entre todas as unidades
      }

      // Aplicar impressão (se solicitada)
      if (comImpressao) {
        precoUnitario *= (1 + this.PRINTING_MARKUP); // +10%

        // Clichê apenas na primeira encomenda (distribuído entre unidades)
        if (isFirstOrder) {
          const custoClicheTotal = this.CLICHE; // R$ 150 para o lote inteiro
          precoUnitario += (custoClicheTotal / quantidade); // Distribuir entre unidades
        }
      }

      // Preço total = preço por unidade × quantidade
      const precoTotal = precoUnitario * quantidade;

      // Registrar no histórico
      this.registerOrder(phone, {
        tipo: 'Automontável',
        comprimento,
        largura,
        altura,
        quantidade,
        gramatura: gramaturaKey,
        comImpressao,
        temFaca: isFirstOrder,
        precoUnitario,
        precoTotal,
        data: new Date().toISOString()
      });

      logger.info('Cálculo Automontável concluído', { precoUnitario, precoTotal });

      return {
        sucesso: true,
        tipo: 'Automontável',
        precoUnitario: precoUnitario.toFixed(2),
        precoTotal: precoTotal.toFixed(2),
        temFaca: isFirstOrder,
        mensagem: `Caixa Automontável ${comprimento}x${largura}x${altura}mm - R$ ${precoUnitario.toFixed(2)}/un (Total: R$ ${precoTotal.toFixed(2)})`
      };

    } catch (error) {
      logger.error('Erro ao calcular Automontável', { error: error.message });
      return {
        sucesso: false,
        mensagem: 'Erro ao calcular preço. Tente novamente.'
      };
    }
  }

  /**
   * Registra uma encomenda no histórico do cliente
   */
  registerOrder(phone, orderData) {
    if (!this.clientHistory.has(phone)) {
      this.clientHistory.set(phone, {
        hasOrdered: false,
        orders: []
      });
    }

    const clientInfo = this.clientHistory.get(phone);
    clientInfo.hasOrdered = true;
    clientInfo.orders.push(orderData);

    logger.info('Encomenda registrada', { phone, totalOrders: clientInfo.orders.length });
  }

  /**
   * Obtém o histórico de um cliente
   */
  getClientHistory(phone) {
    return this.clientHistory.get(phone) || { hasOrdered: false, orders: [] };
  }

  /**
   * Retorna o catálogo pronta entrega
   */
  getCatalogo() {
    return {
      sucesso: true,
      catalogo: [
        { medidas: '11×11×40', preco: 1.77 },
        { medidas: '30×20×20', preco: 3.16 },
        { medidas: '27×18×9', preco: 1.93 },
        { medidas: '24×15×10', preco: 1.57 },
        { medidas: '19×12×12', preco: 1.19 },
        { medidas: '16×11×6', preco: 0.74 },
        { medidas: '17×14×5', preco: 0.95 },
        { medidas: '20×14×8', preco: 1.21 },
        { medidas: '20×15×15', preco: 1.67 },
        { medidas: '35×35×17', preco: 5.69 },
        { medidas: '16×11×6 Automontável', preco: 1.49 },
        { medidas: '30×20×11 Automontável', preco: 3.80 },
        { medidas: '26×19×3,5 Automontável', preco: 1.77 },
        { medidas: '20×10×36', preco: 2.17 },
        { medidas: '20×20×36', preco: 8.38 },
        { medidas: '45×35×6', preco: 5.15 },
        { medidas: '15×15×15', preco: 1.43 },
        { medidas: '15×13×4 Automontável', preco: 1.11 },
        { medidas: '23×14×4,5 Automontável', preco: 1.50 },
        { medidas: '15,5×11,5×4,5 Automontável', preco: 1.18 },
        { medidas: '18×9,5×6 Automontável', preco: 1.40 },
        { medidas: '9×9×27', preco: 1.05 },
        { medidas: '16×11×8', preco: 0.82 },
        { medidas: '18×13×9', preco: 1.11 },
        { medidas: '12×12×60', preco: 2.71 },
        { medidas: '40×30×20', preco: 5.47 },
        { medidas: '50×30×40', preco: 8.71 },
        { medidas: '60×40×50', preco: 13.95 },
        { medidas: '20×20×20', preco: 2.53 },
        { medidas: '16×11×10', preco: 0.92 },
        { medidas: '16×11×3', preco: 0.62 },
        { medidas: '19×11×4', preco: 0.74 },
        { medidas: '23×21×16', preco: 2.57 },
        { medidas: '23×21×12', preco: 2.37 },
        { medidas: '10×10×67', preco: 2.43 },
        { medidas: '25×25×25', preco: 3.92 },
        { medidas: '11×5×40', preco: 1.15 },
        { medidas: '25×17×9 Automontável', preco: 3.04 },
        { medidas: '7×7×24', preco: 0.70 },
        { medidas: '35×26×5', preco: 3.00 },
        { medidas: '30×20×10', preco: 2.38 }
      ],
      mensagem: 'Confira nosso catálogo completo. Para medidas especiais, informe as dimensões.'
    };
  }
}

module.exports = BoxPricingCalculator;