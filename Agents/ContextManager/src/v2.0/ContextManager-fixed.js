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

  const parts = pathname.split('/').filter(p => p);

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

require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const BASE_PATH = 'C:\\Users\\André\\Desktop\\picpac-v2-claude\\Agents';
const PROMPT_PATH = path.join(__dirname, 'context-manager-training-prompt.md');
let trainingPrompt;

try {
  trainingPrompt = fs.readFileSync(PROMPT_PATH, 'utf8');
} catch (err) {
  console.error('Failed to load prompt:', err);
  process.exit(1);
}

function getAgentCode(agent) {
  const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
  if (!fs.existsSync(agentDir)) {
    throw new Error(`Agent directory not found: ${agentDir}`);
  }
  const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.js'));
  if (files.length === 0) {
    throw new Error(`No .js files found in ${agentDir}`);
  }
  let code = '';
  files.forEach(file => {
    const filePath = path.join(agentDir, file);
    code += `\n\n// File: ${file}\n${fs.readFileSync(filePath, 'utf8')}\n`;
  });
  return code;
}

async function analyzeCode(code, userMessage, agentName = '') {
  try {
    const fullPrompt = `${trainingPrompt}\n\nAgent: ${agentName}\nCode:\n${code}\n\nUser: ${userMessage}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful code analysis assistant." },
        { role: "user", content: fullPrompt }
      ],
      max_tokens: 2000,
    });
    return completion.choices[0].message.content;
  } catch (err) {
    throw new Error(`OpenAI error: ${err.message}`);
  }
}

app.get('/code/:agent', (req, res) => {
  try {
    const code = getAgentCode(req.params.agent);
    res.set('Content-Type', 'text/plain');
    res.send(code);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/analyze/:agent', async (req, res) => {
  try {
    const agent = req.params.agent;
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing "message" in body' });
    }
    const code = getAgentCode(agent);
    const analysis = await analyzeCode(code, message, agent);
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/:agent', async (req, res) => {
  try {
    const agent = req.params.agent;
    const code = getAgentCode(agent);
    const reportPrompt = "Generate a comprehensive report on this agent's code: structure, strengths, improvements.";
    const report = await analyzeCode(code, reportPrompt, agent);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/project-health', (req, res) => {
  try {
    const agentsDir = BASE_PATH;
    const agents = fs.readdirSync(agentsDir).filter(dir => 
      fs.existsSync(path.join(agentsDir, dir, 'src', 'v2.0'))
    );
    const health = {};
    agents.forEach(agent => {
      const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
      const jsFiles = fs.readdirSync(agentDir).filter(f => f.endsWith('.js'));
      health[agent] = {
        jsFiles: jsFiles.length,
        dirExists: true
      };
    });
    res.json({ agents: health });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/analyze-integration', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing "message" in body' });
    }
    const agentsDir = BASE_PATH;
    const agents = fs.readdirSync(agentsDir).filter(dir => 
      fs.existsSync(path.join(agentsDir, dir, 'src', 'v2.0'))
    );
    let allCode = '';
    for (let agent of agents) {
      try {
        const code = getAgentCode(agent);
        allCode += `\n\n=== ${agent} ===\n${code}`;
      } catch (e) {
        // Skip invalid agents
      }
    }
    const analysis = await analyzeCode(allCode, message, 'All Agents');
    res.json({ analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auto-fix/:agent', async (req, res) => {
  try {
    const agent = req.params.agent;
    const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
    
    const code = getAgentCode(agent);
    
    const prompt = `Você é um desenvolvedor JavaScript especialista. Analise o código do agente "${agent}" e gere uma versão COMPLETAMENTE CORRIGIDA, funcional e otimizada. Retorne APENAS o código JavaScript corrigido, sem explicações ou markdown. Código original:\n\n${code}`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um expert em correção de código JavaScript. Retorne APENAS o código corrigido, pronto para uso." },
        { role: "user", content: prompt }
      ],
      max_tokens: 4000,
    });
    
    let fixedCode = completion.choices[0].message.content.trim();

    const fixedPath = path.join(agentDir, `${agent}-fixed.js`);
    fs.writeFileSync(fixedPath, fixedCode, 'utf8');
    
    res.json({
      agent,
      status: 'FIXED',
      file_path: fixedPath,
      code_fixed: fixedCode,
      message: `Código corrigido salvo em ${fixedPath}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auto-fix-all', async (req, res) => {
  try {
    const agentsDir = BASE_PATH;
    const agents = fs.readdirSync(agentsDir).filter(dir => 
      fs.existsSync(path.join(agentsDir, dir, 'src', 'v2.0'))
    );

    const results = [];
    for (const agent of agents) {
      try {
        const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
        const code = getAgentCode(agent);
        
        const prompt = `Você é um desenvolvedor JavaScript especialista. Analise o código do agente "${agent}" e gere uma versão COMPLETAMENTE CORRIGIDA, funcional e otimizada. Retorne APENAS o código JavaScript corrigido, sem explicações ou markdown. Código original:\n\n${code}`;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Você é um expert em correção de código JavaScript. Retorne APENAS o código corrigido, pronto para uso." },
            { role: "user", content: prompt }
          ],
          max_tokens: 4000,
        });
        
        let fixedCode = completion.choices[0].message.content.trim();
        
        const fixedPath = path.join(agentDir, `${agent}-fixed.js`);
        fs.writeFileSync(fixedPath, fixedCode, 'utf8');
        
        results.push({
          agent,
          status: 'FIXED',
          file_path: fixedPath
        });
      } catch (err) {
        results.push({
          agent,
          status: 'ERROR',
          error: err.message
        });
      }
    }
    
    res.json({
      total: agents.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/fixed-files/:agent', (req, res) => {
  try {
    const agent = req.params.agent;
    const agentDir = path.join(BASE_PATH, agent, 'src', 'v2.0');
    const fixedPath = path.join(agentDir, `${agent}-fixed.js`);
    
    if (!fs.existsSync(fixedPath)) {
      return res.status(404).json({ error: `Fixed file not found: ${fixedPath}` });
    }
    
    const code = fs.readFileSync(fixedPath, 'utf8');
    res.json({ agent, code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Context Manager v2 running on port ${PORT}`);
});

class ContextManager {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
    this.rootPath = null;
    this.logFile = path.join(process.cwd(), 'context-manager.log');
    this.knowledge = {
      files: {},
      dependencies: {},
      summary: '',
      validation: {}
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMsg = `${timestamp}: ${message}`;
    console.log(logMsg);
    fs.appendFileSync(this.logFile, logMsg + '\n');
  }

  async _callOpenAI(fileName, content) {
    const systemPrompt = `Você é Engenheiro de Projeto do PicPac. Analise o arquivo \"${fileName}\" extraindo:\n- proposito: propósito principal do arquivo.\n- dependencias: array de arquivos ou módulos importados/requeridos (use caminhos relativos como aparecem).\n- entrada: entradas principais (params, req.body, etc).\n- saida: saídas principais (res.send, return, etc).\n- portas: array de números de portas usadas (ex: 3001).\n- problemas: array de problemas encontrados (segurança, naming, etc).\n- linhasChave: array de 5-10 linhas mais importantes.\nResponda APENAS com JSON válido, sem texto extra.`;
    const userPrompt = `Conteúdo do arquivo:\n${content}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let analysisText = data.choices[0].message.content.trim();
      analysisText = analysisText.replace(/^```json\s*|\s*```$/g, '').trim();
      const analysis = JSON.parse(analysisText);
      return analysis;
    } catch (e) {
      this.log(`OpenAI error for ${fileName}: ${e.message}`);
      return { proposito: 'Analysis failed', problemas: [e.message] };
    }
  }

  async analisarArquivo(nomeArquivo, caminhoCompleto) {
    this.log(`Analisando ${caminhoCompleto}`);
    let content;
    try {
      content = fs.readFileSync(caminhoCompleto, 'utf8');
    } catch (e) {
      this.log(`Error reading ${caminhoCompleto}: ${e.message}`);
      return;
    }

    const truncatedContent = content.length > 16000 ? content.slice(0, 16000) + '\n... (truncated)' : content;
    const analysis = await this._callOpenAI(nomeArquivo, truncatedContent);

    const relPath = path.relative(this.rootPath, caminhoCompleto);
    this.knowledge.files[relPath] = analysis;
    this.log(`Analysis completed for ${relPath}`);
  }

  async scanFolder(folderPath) {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error(`${folderPath} is not a valid directory`);
    }

    this.rootPath = folderPath;
    this.knowledge.files = {};
    const filesToAnalyze = [];

    const scanRecursive = (dir) => {
      let items;
      try {
        items = fs.readdirSync(dir);
      } catch (e) {
        return;
      }
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (['node_modules', '.git'].includes(item)) continue;
          scanRecursive(fullPath);
        } else {
          filesToAnalyze.push({ name: item, fullPath });
        }
      }
    };

    scanRecursive(folderPath);
    this.log(`Found ${filesToAnalyze.length} files to analyze.`);

    const analyzePromises = filesToAnalyze.map(({ name, fullPath }) =>
      this.analisarArquivo(name, fullPath)
    );
    await Promise.all(analyzePromises);

    this.log(`Scan completed: ${Object.keys(this.knowledge.files).length} files analyzed.`);
  }

  buildDependenciesMap() {
    this.knowledge.dependencies = {};
    for (const [file, anal] of Object.entries(this.knowledge.files)) {
      if (anal.dependencias && Array.isArray(anal.dependencias)) {
        this.knowledge.dependencies[file] = anal.dependencias.map(d => d.replace(/^\.\//, ''));
      }
    }
    this.log(`Dependencies map built with ${Object.keys(this.knowledge.dependencies).length} entries.`);
  }

  hasDependencyCycle() {
    const graph = this.knowledge.dependencies || {};
    const visited = new Set();
    const recStack = new Set();

    const detectCycle = (node) => {
      visited.add(node);
      recStack.add(node);
      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detectCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
      recStack.delete(node);
      return false;
    };

    for (const node of Object.keys(graph)) {
      if (!visited.has(node)) {
        if (detectCycle(node)) return true;
      }
    }
    return false;
  }

  validarArquitetura() {
    const issues = [];
    const allPorts = new Map();
    const allowedPorts = new Set([3001, 3002, 3004, 3005, 3006]);

    for (const [file, anal] of Object.entries(this.