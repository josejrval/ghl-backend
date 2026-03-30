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
  console.log('NOVO LEAD:', JSON.stringify(leadData, null, 2));

  // Responde ao frontend IMEDIATAMENTE (evita timeout/erro no form)
  res.json({ status: 'ok' });

  // Envia pro Make em background (sem bloquear a resposta)
  try {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://hook.us2.make.com/vviwoc9nobfi8lkyt1fl6odvr9x1404t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    console.log('✅ Make respondeu:', response.status);

  } catch (error) {
    console.error('❌ Erro ao enviar pro Make:', error.message);
    // Não afeta o usuário — já recebeu "ok"
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
