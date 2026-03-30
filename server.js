const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ servir arquivos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// ✅ rota principal (abre o formulário)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

// ✅ endpoint do formulário
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
  } catch (error) {
    console.error('Erro ao enviar:', error);
    res.status(500).json({ error: 'erro ao enviar lead' });
  }
});

// ✅ fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
