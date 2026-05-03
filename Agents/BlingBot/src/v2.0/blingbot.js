require('dotenv').config();

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const api = axios.create({
  baseURL: 'https://bling.com.br/Api/v3',
  headers: {
    'Authorization': `Bearer ${process.env.BLING_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

app.post('/receberDadosDeAmanda', (req, res) => {
  console.log('Recebendo dados de Amanda:', req.body);
  res.json({ success: true, mensagem: 'Dados recebidos!' });
});

app.post('/processar-proposta', async (req, res) => {
  const { cliente, itens, total } = req.body;
  console.log('Iniciando processamento da proposta:', { cliente: cliente.nome, total });
  console.log('Itens:', itens);

  let contatoId;
  try {
    // Buscar contato
    const nomePesquisa = encodeURIComponent(cliente.nome);
    console.log(`Buscando contato por nome: ${cliente.nome}`);
    const searchResponse = await api.get(`/contatos?pesquisa=${nomePesquisa}`);
    console.log('Resposta da busca:', searchResponse.data);

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      contatoId = searchResponse.data.data[0].id;
      console.log(`Contato encontrado com ID: ${contatoId}`);
    } else {
      // Criar contato
      let documentoLimpo = cliente.documento.replace(/[^0-9]/g, '');
      const tipoDocumento = documentoLimpo.length === 11 ? 'F' : (documentoLimpo.length === 14 ? 'J' : 'F');
      const contatoData = {
        nome: cliente.nome,
        numeroDocumento: documentoLimpo,
        tipoDocumento: tipoDocumento,
      };
      if (cliente.email) {
        contatoData.email = cliente.email;
      }
      console.log('Criando novo contato:', contatoData);
      const createResponse = await api.post('/contatos', contatoData);
      console.log('Resposta da criação:', createResponse.data);
      contatoId = createResponse.data.data.id;
      console.log(`Contato criado com ID: ${contatoId}`);
    }

    // Criar pedido
    const pedidoData = {

  contato: {

    id: contatoId

  },

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

    console.log('Dados do pedido a ser criado:', pedidoData);
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

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`BlingBot rodando na porta ${PORT}`);
});