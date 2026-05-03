const express = require('express');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const githubRoutes = require('./github-context-routes');

// Fix SSH issue without allowUnsafeSshCommand
process.env.GIT_SSH_COMMAND = 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.use('/agents', express.static(path.join(__dirname, 'agents')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// List agents
app.get('/api/v2/agents', (req, res) => {
  try {
    const agentsDir = './agents';
    if (!fs.existsSync(agentsDir)) {
      return res.json([]);
    }
    const dirs = fs.readdirSync(agentsDir).filter((d) => {
      const stat = fs.statSync(path.join(agentsDir, d));
      return stat.isDirectory();
    });
    res.json(dirs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Context routes
app.get('/api/v2/context/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const repoPath = path.join('./agents', agentId);
  const contextPath = path.join(repoPath, 'context.json');
  try {
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    if (!fs.existsSync(contextPath)) {
      return res.json({});
    }
    const context = await fs.promises.readFile(contextPath, 'utf8');
    res.json(JSON.parse(context));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v2/context/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const repoPath = path.join('./agents', agentId);
  const contextPath = path.join(repoPath, 'context.json');
  try {
    await fs.promises.mkdir(repoPath, { recursive: true });
    await fs.promises.writeFile(contextPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/v2/context/:agentId', async (req, res) => {
  const agentId = req.params.agentId;
  const repoPath = path.join('./agents', agentId);
  const contextPath = path.join(repoPath, 'context.json');
  try {
    if (fs.existsSync(contextPath)) {
      await fs.promises.unlink(contextPath);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Git routes
app.post('/api/v2/git/read-file', async (req, res) => {
  const { repoPath, filePath } = req.body;
  if (!repoPath || !filePath) {
    return res.status(400).json({ error: 'Missing repoPath or filePath' });
  }
  try {
    const git = simpleGit({ baseDir: repoPath });
    const content = await git.show([`HEAD:${filePath}`]);
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v2/git/modify-file', async (req, res) => {
  const { repoPath, filePath, content, message = 'Updated file' } = req.body;
  if (!repoPath || !filePath || content === undefined) {
    return res.status(400).json({ error: 'Missing repoPath, filePath, or content' });
  }
  try {
    const fullPath = path.join(repoPath, filePath);
    await fs.promises.writeFile(fullPath, content);
    const git = simpleGit({ baseDir: repoPath });
    await git.add(filePath);
    await git.commit(message);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v2/git/push', async (req, res) => {
  const { repoPath, remote = 'origin', branch = 'main' } = req.body;
  if (!repoPath) {
    return res.status(400).json({ error: 'Missing repoPath' });
  }
  try {
    const git = simpleGit({ baseDir: repoPath });
    await git.push(remote, branch);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v2/git/status', async (req, res) => {
  const { repoPath } = req.body;
  if (!repoPath) {
    return res.status(400).json({ error: 'Missing repoPath' });
  }
  try {
    const git = simpleGit({ baseDir: repoPath });
    const status = await git.status();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/v2/git/log', async (req, res) => {
  const { repoPath } = req.body;
  if (!repoPath) {
    return res.status(400).json({ error: 'Missing repoPath' });
  }
  try {
    const git = simpleGit({ baseDir: repoPath });
    const log = await git.log();
    res.json(log);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GitHub routes (ANTES do 404 handler)
app.use(githubRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});