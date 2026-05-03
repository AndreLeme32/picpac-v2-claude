{
  "arquivo": "nome_do_arquivo.js",
  "status": "OK | WARNING | ERROR",
  "resumo": "Uma linha descrevendo o arquivo",
  "estrutura": {
    "funcoes": ["func1", "func2"],
    "dependencias": ["dep1", "dep2"],
    "endpoints": ["GET /path", "POST /path"]
  },
  "erros_encontrados": [
    {
      "tipo": "ERRO | AVISO | INFO",
      "linha": 42,
      "problema": "Descrição do problema",
      "impacto": "Como afeta o sistema",
      "solucao": "Como resolver"
    }
  ],
  "sugestoes_melhoria": [
    "Sugestão 1",
    "Sugestão 2"
  ],
  "integracao": {
    "chama": ["Atlas", "Bling"],
    "recebe_de": ["Amanda"],
    "problemas_detectados": "Descrição de problemas de integração"
  }
}