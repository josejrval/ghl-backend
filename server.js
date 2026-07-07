import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// conexão com o Postgres do Railway
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// garante que a tabela existe ao subir
await pool.query(`
  create table if not exists leads (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    status text default 'novo',
    data jsonb
  )
`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('🔥 NOVO LEAD:', JSON.stringify(leadData, null, 2));

  res.json({ status: 'ok' });

  // 0. SALVA NO BANCO
  try {
    await pool.query('insert into leads (data) values ($1)', [leadData]);
    console.log('💾 Lead salvo no banco');
  } catch (err) {
    console.log('❌ Erro banco:', err.message);
  }

  // 1. MAKE WEBHOOK
  try {
    await fetch('https://hook.us2.make.com/6n477rbaq6fqqw30myrbtw0w57v3ktxv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
    console.log('✅ Enviado para Make');
  } catch (err) {
    console.log('❌ Erro Make:', err.message);
  }

  // 2. RESEND EMAIL
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Leads <onboarding@resend.dev>',
      to: 'teuemail@gmail.com', // troca pelo teu email de verdade
      subject: '🔥 Novo lead do site',
      html: `<h2>Novo Lead Recebido</h2><pre>${JSON.stringify(leadData, null, 2)}</pre>`
    });
    console.log('📩 Email enviado via Resend');
  } catch (err) {
    console.log('❌ Erro Resend:', err.message);
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
