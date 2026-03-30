const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('<h1>Sistema de Leads Luxury Ativo ✅</h1><p>Conectado a apply.joseoliveirafilms.com</p>');
});

app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('NOVO LEAD RECEBIDO:', leadData);

  const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/6n477rbaq6fqqw30myrbtw0w57v3ktxv';

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    if (response.ok) {
      res.json({ status: 'sucesso', message: 'Lead enviado para a planilha!' });
    } else {
      res.status(500).json({ status: 'erro', message: 'Erro ao enviar para o Make' });
    }
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ status: 'erro', message: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
