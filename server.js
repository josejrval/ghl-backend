const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ servir arquivos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// ✅ abrir direto no domínio
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5.html'));
});

// ✅ receber leads e enviar pro Make
app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('NOVO LEAD:', leadData);

  try {
    await fetch('https://hook.us2.make.com/vviwoc9nobfi8lkyt1fl6odvr9x1404t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    res.json({ status: 'ok' });
  } catch (e) {
    console.error('Erro ao enviar:', e);
    res.status(500).json({ error: 'erro ao enviar lead' });
  }
});

// ✅ fallback (garante sempre abrir o form)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
