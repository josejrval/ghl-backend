const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Adicionamos isso para enviar dados
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor funcionando ✅');
});

app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('NOVO LEAD RECEBIDO:', leadData);

  // COLE A URL DO SEU WEBHOOK DO GHL ENTRE AS ASPAS ABAIXO
  const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/miVDl3ZCyFKR8jskk3jV/webhook-trigger/2f8e1738-fdc0-4970-994f-ab67e857245f'; 

  try {
    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    if (response.ok) {
      res.json({ status: 'sucesso', message: 'Lead enviado ao GHL!' });
    } else {
      res.status(500).json({ status: 'erro', message: 'Erro ao enviar para o GHL' });
    }
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ status: 'erro', message: 'Erro interno no servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
