const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3005;
const PROXY_URL = 'http://localhost:3000';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function proxyRequest(path, req, res) {
  try {
    const url = `${PROXY_URL}${path}`;
    const response = await axios({
      method: req.method.toLowerCase(),
      url,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined,
        'content-length': undefined,
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Error proxying ${path}:`, error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data || { error: error.response.statusText });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

app.get('/bridge/agents', async (req, res) => {
  await proxyRequest('/agents', req, res);
});

app.post('/bridge/git/read', async (req, res) => {
  await proxyRequest('/git/read', req, res);
});

app.post('/bridge/git/modify', async (req, res) => {
  await proxyRequest('/git/modify', req, res);
});

app.post('/bridge/git/push', async (req, res) => {
  await proxyRequest('/git/push', req, res);
});

app.post('/bridge/git/status', async (req, res) => {
  await proxyRequest('/git/status', req, res);
});

app.post('/bridge/git/log', async (req, res) => {
  await proxyRequest('/git/log', req, res);
});

app.listen(PORT, () => {
  console.log(`Bridge server running on port ${PORT}`);
});

console.log('chat-context-manager-bridge.js loaded');