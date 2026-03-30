const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('NOVO LEAD:', leadData);

  try {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://hook.us2.make.com/vviwoc9nobfi8lkyt1fl6odvr9x1404t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    console.log('✅ Make respondeu:', response.status);
    res.json({ status: 'ok' });

  } catch (error) {
    console.error('❌ Erro ao enviar:', error);
    res.status(500).json({ error: 'erro ao enviar lead' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
