// server.js (Node 18+)
require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const GEN_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const KEY = process.env.GEMINI_API_KEY; // set this on your server

app.post('/api/gemini', async (req, res) => {
  try {
    const prompt = req.body.prompt || '';
    const r = await fetch(GEN_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY   // safer than putting ?key=... in URLs
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy listening on :${PORT}`));


