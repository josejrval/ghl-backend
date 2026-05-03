import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// necessário em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.post('/lead', async (req, res) => {
  const leadData = req.body;

  console.log('NOVO LEAD:', JSON.stringify(leadData, null, 2));

  res.json({ status: 'ok' });

  try {
    const fetch = (await import('node-fetch')).default;

    await fetch('https://hook.us2.make.com/6n477rbaq6fqqw30myrbtw0w57v3ktxv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

  } catch (err) {
    console.log('Erro Make:', err.message);
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Leads <onboarding@resend.dev>',
      to: 'teuemail@gmail.com',
      subject: '🔥 Novo lead',
      html: `<pre>${JSON.stringify(leadData, null, 2)}</pre>`
    });

  } catch (err) {
    console.log('Erro Resend:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
