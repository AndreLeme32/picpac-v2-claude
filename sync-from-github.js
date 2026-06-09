const { execSync } = require('child_process');
const path = require('path');

const REPOS = [
  { name: 'picpac-amanda', path: './picpac-amanda', port: 3000, startCmd: 'npm start' },
  { name: 'picpac-atlas', path: './picpac-atlas', port: 3001, startCmd: 'npm start' },
  { name: 'picpac-decisor', path: './picpac-decisor', port: 3002, startCmd: 'npm start' },
  { name: 'picpac-blingbot', path: './picpac-blingbot', port: 3003, startCmd: 'npm start' }
];

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

function syncRepo(repo) {
  try {
    log(`Sincronizando ${repo.name}...`);
    const output = execSync('git pull', { cwd: path.resolve(repo.path), encoding: 'utf8' });
    
    if (!output.includes('Already up to date')) {
      log(`Mudanças detectadas em ${repo.name}. Reiniciando serviço...`);
      execSync(`fuser -k ${repo.port}/tcp || true`, { stdio: 'ignore' });
      execSync(`nohup ${repo.startCmd} &`, { cwd: path.resolve(repo.path), stdio: 'ignore', detached: true });
      log(`Serviço ${repo.name} reiniciado com sucesso.`);
    } else {
      log(`Status: ${repo.name} está atualizado.`);
    }
  } catch (err) {
    log(`Erro ao processar ${repo.name}: ${err.message}`);
  }
}

function runSync() {
  log('Iniciando ciclo de sincronização...');
  REPOS.forEach(syncRepo);
  log('Ciclo concluído. Aguardando 5 minutos.');
}

setInterval(runSync, 5 * 60 * 1000);
runSync();

process.on('SIGINT', () => {
  log('Script encerrado pelo usuário.');
  process.exit();
});