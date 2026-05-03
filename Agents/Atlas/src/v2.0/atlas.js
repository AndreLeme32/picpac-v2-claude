const axios = require('axios');

let bancoDados = {
  vendas: []
};

function validarDados(dados) {
  console.log('Validating payload:', JSON.stringify(dados, null, 2));

  if (!dados || typeof dados !== 'object') {
    console.log('Invalid: dados is not an object');
    return false;
  }

  if (!dados.cliente || typeof dados.cliente !== 'string' || dados.cliente.trim() === '') {
    console.log('Invalid: cliente must be a non-empty string');
    return false;
  }

  if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
    console.log('Invalid: itens must be a non-empty array');
    return false;
  }

  for (let item of dados.itens) {
    if (!item || typeof item.preco_unitario !== 'number' || item.preco_unitario <= 0) {
      console.log('Invalid: each item must have preco_unitario as positive number');
      return false;
    }
  }

  if (typeof dados.total !== 'number' || dados.total <= 0) {
    console.log('Invalid: total must be a positive number');
    return false;
  }

  console.log('Validation passed');
  return true;
}

function armazenarDados(dados) {
  console.log('Storing payload:', JSON.stringify(dados, null, 2));
  const venda = {
    id: Date.now(),
    ...dados,
    data: new Date().toISOString()
  };
  bancoDados.vendas.push(venda);
  console.log('Data stored successfully');
}

function recuperarDados() {
  console.log('Retrieving all data:', JSON.stringify(bancoDados.vendas, null, 2));
  return bancoDados.vendas;
}

async function enviarParaDecisor(dados) {
  console.log('Sending to Decisor payload:', JSON.stringify(dados, null, 2));
  try {
    const response = await axios.post('http://localhost:3004/receberDadosDeAtlas', dados);
    console.log('Decisor logger - Data received successfully:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Decisor logger - Error receiving data:', error.message);
  }
}

async function processarDados(dados) {
  console.log('Starting processarDados with payload:', JSON.stringify(dados, null, 2));

  if (!validarDados(dados)) {
    console.log('processarDados failed: validation error');
    return false;
  }

  armazenarDados(dados);

  await enviarParaDecisor(dados);

  console.log('processarDados completed successfully');
  return true;
}

module.exports = {
  validarDados,
  armazenarDados,
  recuperarDados,
  enviarParaDecisor,
  processarDados,
  bancoDados
};