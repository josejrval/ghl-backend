const express = require('express');
const cors = require('cors');
const app = express();

// Porta que o Railway espera (process.env.PORT) ou 3000 como padrão
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota principal para testar o domínio
app.get('/', (req, res) => {
  res.send('<h1>Servidor de Luxo Ativo ✅</h1><p>O domínio apply.joseoliveirafilms.com está conectado com sucesso.</p>');
});

// Rota para receber os leads
app.post('/lead', (req, res) => {
  console.log('NOVO LEAD RECEBIDO:', req.body);
  // Por enquanto, apenas confirmamos o recebimento
  res.json({ status: 'sucesso', message: 'Lead recebido pelo servidor!' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
