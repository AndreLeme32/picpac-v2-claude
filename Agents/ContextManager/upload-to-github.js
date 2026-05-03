    'agentes-contexto.json',
    'projeto-historia.json',
    'fluxo-comunicacao-debug.json'
  ];

  const fileContents = {};

  // Ler todos os arquivos JSON
  for (const file of files) {
    try {
      fileContents[file] = await fs.readFile(file, 'utf8');
      console.log(`✓ Arquivo ${file} lido com sucesso.`);
    } catch (err) {
      console.error(`✗ Erro ao ler ${file}:`, err.message);
      process.exit(1);
    }
  }

  const payload = {
    repository: 'git@github.com:AndreLeme32/picpac-context-manager.git',
    branch: 'main',
    path: 'context-manager/',
    files: fileContents,
    commit_message: 'Upload dos 4 arquivos JSON de contexto: projeto-contexto.json, agentes-contexto.json, projeto-historia.json, fluxo-comunicacao-debug.json'
  };

  console.log('📤 Enviando requisição para ContextManager...');

  try {
    const response = await axios.post(
      'http://localhost:8080/api/v2/github/upload',
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Upload realizado com sucesso!');
    console.log('Status:', response.status);
    console.log('Resposta detalhada:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('❌ Erro na requisição:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Dados do erro:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Mensagem:', err.message);
    }
    process.exit(1);
  }
}

// Executar o script
uploadContextFiles();