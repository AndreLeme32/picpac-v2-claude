const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const net = require('net');

const execPromise = promisify(exec);

const AGENTS_CONFIG = {
  amanda: {
    port: 3000,
    path: 'C:\\Users\\André\\Desktop\\picpac-v2-claude\\Agents\\Amanda\\src\\v2.0\\index.js',
    name: 'Amanda'
  },
  atlas: {
    port: 3001,
    path: 'C:\\Users\\André\\Desktop\\picpac-v2-claude\\Agents\\Atlas\\src\\v2.0\\index.js',
    name: 'Atlas'
  },
  decisor: {
    port: 3002,
    path: 'C:\\Users\\André\\Desktop\\picpac-v2-claude\\Agents\\Decisor\\src\\v2.0\\index.js',
    name: 'Decisor'
  },
  blingbot: {
    port: 3004,
    path: 'C:\\Users\\André\\Desktop\\picpac-v2-claude\\Agents\\BlingBot\\src\\v2.0\\index.js',
    name: 'BlingBot'
  }
};

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(2000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function killPort(port) {
  try {
    const { stdout } = await execPromise(`netstat -ano | findstr ":${port}"`);
    const lines = stdout.trim().split('\n');
    for (let line of lines) {
      const match = line.match(/\s*LISTENING\s+(\d+)\s*$/);
      if (match) {
        const pid = match[1];
        try {
          await execPromise(`taskkill /PID ${pid} /F`);
        } catch (e) {
          // PID may already be gone
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function validateSyntax(filePath) {
  try {
    await execPromise(`node --check "${filePath}"`);
    return { ok: true };
  } catch (e) {
    const error = e.stderr ? e.stderr.toString().trim() : e.message;
    return { ok: false, error };
  }
}

async function testRun(agentPath, port) {
  return new Promise((resolve) => {
    const child = spawn('node', [agentPath], { stdio: 'pipe' });
    let timeout;
    const startTime = Date.now();
    const checkInterval = setInterval(async () => {
      if (await isPortOpen(port)) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        child.kill();
        resolve({ ok: true });
        return;
      }
      if (Date.now() - startTime > 10000) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        child.kill();
        resolve({ ok: false, error: 'timeout' });
      }
    }, 500);
    timeout = setTimeout(() => {
      clearInterval(checkInterval);
      child.kill();
      resolve({ ok: false, error: 'timeout' });
    }, 11000);
    child.on('error', (err) => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      resolve({ ok: false, error: err.message });
    });
  });
}

function startService(agentPath) {
  const child = spawn('node', [agentPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        let input = {};
        try {
          if (body.trim()) {
            input = JSON.parse(body);
          }
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        if (pathname === '/deploy-agents') {
          const report = {};
          for (let [name, config] of Object.entries(AGENTS_CONFIG)) {
            const code = input[name];
            if (!code) {
              report[name] = { saved: false, syntaxOk: false, runsOk: false, started: false, error: 'No code provided' };
              continue;
            }
            const filePath = config.path;
            const bakPath = filePath + '.bak';
            let backupDone = false;
            try {
              await fs.copyFile(filePath, bakPath);
              backupDone = true;
            } catch (e) {
              // No existing file to backup
            }
            try {
              await fs.writeFile(filePath, code);
              report[name] = { saved: true, syntaxOk: false, runsOk: false, started: false };
            } catch (e) {
              report[name] = { saved: false, syntaxOk: false, runsOk: false, started: false, error: e.message };
              continue;
            }
            const syntaxRes = await validateSyntax(filePath);
            report[name].syntaxOk = syntaxRes.ok;
            if (!syntaxRes.ok) {
              report[name].runsOk = false;
              report[name].started = false;
              report[name].error = syntaxRes.error;
              if (backupDone) {
                await fs.copyFile(bakPath, filePath).catch(() => {});
                await fs.unlink(bakPath).catch(() => {});
              }
              continue;
            }
            // Kill existing before test
            await killPort(config.port);
            report[name].runsOk = false;
            report[name].started = false;
            const runRes = await testRun(filePath, config.port);
            report[name].runsOk = runRes.ok;
            if (!runRes.ok) {
              report[name].error = runRes.error;
              if (backupDone) {
                await fs.copyFile(bakPath, filePath).catch(() => {});
              }
            } else {
              startService(filePath);
              report[name].started = true;
            }
            if (backupDone) {
              await fs.unlink(bakPath).catch(() => {});
            }
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ report }));
        } else if (pathname === '/health-check') {
          const status = {};
          const problems = [];
          const ports = [3000, 3001, 3002, 3004];
          for (let p of ports) {
            const open = await isPortOpen(p);
            status[p] = open;
            if (!open) problems.push(p);
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ status, problems }));
        } else if (pathname === '/auto-restart-agents') {
          const results = {};
          const ports = [3000, 3001, 3002, 3004];
          for (let p of ports) {
            const config = Object.values(AGENTS_CONFIG).find(c => c.port === p);
            await killPort(p);
            results[p] = { name: config.name, restarted: true, startupOk: false };
          }
          await new Promise(r => setTimeout(r, 2000));
          for (let config of Object.values(AGENTS_CONFIG)) {
            startService(config.path);
          }
          await new Promise(r => setTimeout(r, 10000));
          for (let p of ports) {
            results[p].startupOk = await isPortOpen(p);
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ results }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.method === 'GET' && pathname === '/agentes-status') {
    (async () => {
      try {
        const status = {};
        for (let [name, config] of Object.entries(AGENTS_CONFIG)) {
          const running = await isPortOpen(config.port);
          status[name] = { port: config.port, status: running ? 'running' : 'stopped' };
        }
        res.statusCode = 200;
        res.end(JSON.stringify(status));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    })();
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(4000, () => {
  console.log('Agent manager server listening on port 4000');
});