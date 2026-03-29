const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor funcionando ✅');
});

app.post('/lead', (req, res) => {
  console.log('NOVO LEAD RECEBIDO:', req.body);
  res.json({ status: 'sucesso', message: 'Lead recebido pelo servidor!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
