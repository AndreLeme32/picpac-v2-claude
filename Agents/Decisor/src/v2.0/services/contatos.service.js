const axios = require('axios');
const BASE_URL = 'http://localhost:3003';

async function buscarContatoPorDocumento(documento) {
  try {
    console.log(`[DEBUG] Buscando contato pelo documento: ${documento}`);
    const response = await axios.get(`${BASE_URL}/contatos`, { params: { documento } });
    if (response.data && response.data.length > 0) {
      console.log(`[DEBUG] Contato encontrado: ${JSON.stringify(response.data[0])}`);
      return response.data[0];
    } else {
      console.log(`[DEBUG] Nenhum contato encontrado para o documento: ${documento}`);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Erro ao buscar contato pelo documento ${documento}:`, error.message);
    throw new Error(`Falha ao buscar contato: ${error.message}`);
  }
}

async function criarContato(dados) {
  try {
    console.log(`[DEBUG] Criando novo contato com dados: ${JSON.stringify(dados)}`);
    const response = await axios.post(`${BASE_URL}/contatos`, dados);
    console.log(`[DEBUG] Contato criado com sucesso: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    console.error(`[ERROR] Erro ao criar contato:`, error.message);
    throw new Error(`Falha ao criar contato: ${error.message}`);
  }
}

async function obterOuCriarContato(dados) {
  try {
    console.log(`[DEBUG] Tentando obter ou criar contato com dados: ${JSON.stringify(dados)}`);
    const contatoExistente = await buscarContatoPorDocumento(dados.documento);
    if (contatoExistente) {
      console.log(`[DEBUG] Contato existente retornado.`);
      return contatoExistente;
    } else {
      console.log(`[DEBUG] Contato não encontrado, criando novo.`);
      return await criarContato(dados);
    }
  } catch (error) {
    console.error(`[ERROR] Erro ao obter ou criar contato:`, error.message);
    throw new Error(`Falha ao obter ou criar contato: ${error.message}`);
  }
}

module.exports = {
  buscarContatoPorDocumento,
  criarContato,
  obterOuCriarContato
};