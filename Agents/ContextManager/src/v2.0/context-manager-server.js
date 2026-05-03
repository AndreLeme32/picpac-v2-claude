require('dotenv').config();

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const BASE_PATH = 'C:\\Users\\André\\Desktop\\picpac-v2-claude\\Agents';

function scanAgent(agent) {
  const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
  if (!fs.existsSync(agentDir)) {
    return [];
  }
  return fs.readdirSync(agentDir)
    .filter(file => {
      const fullPath = path.join(agentDir, file);
      const stat = fs.statSync(fullPath);
      return stat.isFile() && !file.startsWith('.');
    })
    .sort();
}

function analyzeAgent(agent) {
  const files = scanAgent(agent);
  let totalLines = 0;
  let totalSize = 0;
  const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
  files.forEach(file => {
    const fullPath = path.join(agentDir, file);
    const stat = fs.statSync(fullPath);
    totalSize += stat.size;
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      totalLines += content.split(/\r?\n/).length;
    } catch (err) {
      console.error(`Error reading ${fullPath}:`, err);
    }
  });
  return {
    count: files.length,
    files,
    totalLines,
    totalSize
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  const parts = pathname.split('/').filter(p => p);

  if (pathname === '/agents') {
    const agents = fs.readdirSync(BASE_PATH)
      .filter(dir => {
        try {
          const dirPath = path.join(BASE_PATH, dir);
          return fs.statSync(dirPath).isDirectory();
        } catch (e) {
          return false;
        }
      })
      .sort();
    res.end(JSON.stringify(agents));
    return;
  }

  if (parts[0] === 'scan' && parts[1]) {
    const agent = parts[1];
    const files = scanAgent(agent);
    res.end(JSON.stringify(files));
    return;
  }

  if (parts[0] === 'analyze' && parts[1]) {
    const agent = parts[1];
    const data = analyzeAgent(agent);
    res.end(JSON.stringify(data));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000, () => {
  console.log('Context Manager Server running on port 3000');
});