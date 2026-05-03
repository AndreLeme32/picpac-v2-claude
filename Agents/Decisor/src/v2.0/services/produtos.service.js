const axios = require('axios');
const BASE_URL = 'http://localhost:3003';

async function buscarProdutoPorDescricao(descricao) {
  try {
    console.log(`[DEBUG] Buscando produto com descrição: ${descricao}`);
    const response = await axios.get(`${BASE_URL}/produtos`, { params: { descricao } });
    if (response.data && response.data.length > 0) {
      console.log(`[DEBUG] Produto encontrado: ${JSON.stringify(response.data[0])}`);
      return response.data[0];
    } else {
      console.log(`[DEBUG] Nenhum produto encontrado com descrição: ${descricao}`);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Erro ao buscar produto pela descrição: ${error.message}`);
    throw new Error(`Erro ao buscar produto: ${error.message}`);
  }
}

async function criarProduto(dados) {
  try {
    console.log(`[DEBUG] Criando produto com dados: ${JSON.stringify(dados)}`);
    const response = await axios.post(`${BASE_URL}/produtos`, dados);
    console.log(`[DEBUG] Produto criado: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    console.error(`[ERROR] Erro ao criar produto: ${error.message}`);
    throw new Error(`Erro ao criar produto: ${error.message}`);
  }
}

async function obterOuCriarProduto(dados) {
  try {
    console.log(`[DEBUG] Obtendo ou criando produto com dados: ${JSON.stringify(dados)}`);
    const produtoExistente = await buscarProdutoPorDescricao(dados.descricao);
    if (produtoExistente) {
      console.log(`[DEBUG] Produto já existe: ${JSON.stringify(produtoExistente)}`);
      return produtoExistente;
    } else {
      console.log(`[DEBUG] Produto não encontrado, criando novo.`);
      return await criarProduto(dados);
    }
  } catch (error) {
    console.error(`[ERROR] Erro ao obter ou criar produto: ${error.message}`);
    throw new Error(`Erro ao obter ou criar produto: ${error.message}`);
  }
}

module.exports = {
  buscarProdutoPorDescricao,
  criarProduto,
  obterOuCriarProduto
};