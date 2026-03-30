const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Sistema de Leads Ativo ✅'));

app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('NOVO LEAD:', leadData);

  // URL do Webhook do Make.com (que envia para o Google Sheets)
  const MAKE_WEBHOOK_URL = 'SUA_URL_DO_MAKE_AQUI'; 

  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
    res.json({ status: 'sucesso' });
  } catch (error) {
    res.status(500).json({ status: 'erro' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
