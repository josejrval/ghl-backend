const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 👉 SERVE ARQUIVOS DA PASTA PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// 👉 ROTA PRINCIPAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5.html'));
});

// 👉 RECEBE LEAD
app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('NOVO LEAD:', leadData);

  try {
    await fetch('https://hook.us2.make.com/6n477rbaq6fqqw30myrbtw0w57v3ktxv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'erro' });
  }
});

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
