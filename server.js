import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// necessário para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

// FORM LEAD ENDPOINT
app.post('/lead', async (req, res) => {
  const leadData = req.body;

  console.log('🔥 NOVO LEAD:', JSON.stringify(leadData, null, 2));

  // responde rápido pro frontend (evita crash/timeouts)
  res.json({ status: 'ok' });

  // =========================
  // 1. ENVIAR PARA MAKE
  // =========================
  try {
    const fetch = (await import('node-fetch')).default;

    await fetch('https://hook.us2.make.com/6n477rbaq6fqqw30myrbtw0w57v3ktxv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });

    console.log('✅ Enviado para Make');

  } catch (err) {
    console.log('❌ Erro Make:', err.message);
  }

  // =========================
  // 2. ENVIAR EMAIL (RESEND)
  // =========================
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Leads <onboarding@resend.dev>',
      to: 'teuemail@gmail.com', // troca aqui
      subject: '🔥 Novo lead do site',
      html: `
        <h2>Novo Lead Recebido</h2>
        <pre>${JSON.stringify(leadData, null, 2)}</pre>
      `
    });

    console.log('📩 Email enviado via Resend');

  } catch (err) {
    console.log('❌ Erro Resend:', err.message);
  }
});

// fallback SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

// start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
