const fs = require('fs');
const path = require('path');

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

    for (const [file, anal] of Object.entries(this.knowledge.files)) {
      // Aggregate problems from analysis
      if (anal.problemas && Array.isArray(anal.problemas) && anal.problemas.length > 0) {
        anal.problemas.forEach(prob => issues.push(`${file}: ${prob}`));
      }

      // Ports
      if (anal.portas && Array.isArray(anal.portas)) {
        for (const p of anal.portas) {
          const portNum = parseInt(p, 10);
          if (isNaN(portNum)) continue;
          if (allPorts.has(portNum)) {
            issues.push(`Duplicate port ${portNum} in ${allPorts.get(portNum)} and ${file}`);
          } else {
            allPorts.set(portNum, file);
          }
        }
      }
    }

    // Invalid ports
    for (const [p, file] of allPorts) {
      if (!allowedPorts.has(p)) {
        issues.push(`Invalid port ${p} in ${file}`);
      }
    }

    // Cycles
    if (this.hasDependencyCycle()) {
      issues.push('Dependency cycles detected');
    }

    // Rough naming checks
    for (const [relFile] of Object.entries(this.knowledge.files)) {
      const fullFile = path.join(this.rootPath, relFile);
      if (!fs.existsSync(fullFile)) continue;
      const content = fs.readFileSync(fullFile, 'utf8');

      // Variables (rough)
      const varRegex = /(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*?)(?=\s*[,=;{])/g;
      let match;
      while ((match = varRegex.exec(content)) !== null) {
        const varName = match[1];
        if (/^[A-Z]/.test(varName) &&
            !/^(IF|IV|URL|HTML|Date|Object|Array|Function|Boolean|Number|String|Promise|Error|Node|Buffer)$/.test(varName)) {
          issues.push(`Suspect variable casing '${varName}' in ${relFile} (should be camelCase)`);
        }
      }

      // Classes
      const classRegex = /class\s+([A-Za-z_$][a-zA-Z0-9_$]*)/g;
      while ((match = classRegex.exec(content)) !== null) {
        const className = match[1];
        if (!/^[A-Z]/.test(className)) {
          issues.push(`Class not PascalCase: '${className}' in ${relFile}`);
        }
      }
    }

    this.knowledge.validation = {
      issues,
      valid: issues.length === 0,
      ports: Array.from(allPorts.entries())
    };

    this.log(`Architecture validation: ${issues.length} issues`);
    return this.knowledge.validation;
  }

  gerarResumoContextual() {
    const numFiles = Object.keys(this.knowledge.files).length;
    const numDeps = Object.keys(this.knowledge.dependencies).length;
    const validation = this.knowledge.validation;

    let resumo = `Resumo Contextual do Projeto:\n`;
    resumo += `- ${numFiles} arquivos analisados.\n`;
    resumo += `- ${numDeps} módulos com dependências mapeadas.\n`;
    resumo += `- Arquitetura: ${validation.valid ? 'Válida' : `${validation.issues.length} problemas identificados`}.\n`;

    if (!validation.valid && validation.issues) {
      resumo += `\nPrincipais problemas:\n`;
      validation.issues.slice(0, 5).forEach(issue => {
        resumo += `  - ${issue}\n`;
      });
    }

    resumo += `\nAmostra de dependências:\n`;
    Object.entries(this.knowledge.dependencies || {}).slice(0, 10).forEach(([file, deps]) => {
      resumo += `  ${file} → ${deps.slice(0, 3).join(', ')}${deps.length > 3 ? '...' : ''}\n`;
    });

    this.knowledge.summary = resumo;
    this.log('Contextual summary generated');
    return resumo;
  }

  saveKnowledge(filepath = 'knowledge.json') {
    fs.writeFileSync(filepath, JSON.stringify(this.knowledge, null, 2));
    this.log(`Knowledge saved to ${filepath}`);
  }

  loadKnowledge(filepath = 'knowledge.json') {
    if (fs.existsSync(filepath)) {
      this.knowledge = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      this.log(`Knowledge loaded from ${filepath}`);
    } else {
      this.log(`File ${filepath} not found`);
    }
  }
}

module.exports = ContextManager;