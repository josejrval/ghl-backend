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

let pool = null;
if (process.env.DATABASE_URL) {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  pool.query(`
    create table if not exists leads (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz default now(),
      status text default 'novo',
      data jsonb
    )
  `).then(() => console.log('💾 Tabela pronta')).catch(e => console.log('❌ Erro ao criar tabela:', e.message));
} else {
  console.log('⚠️ DATABASE_URL não encontrada — banco desligado, resto funciona');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers de email (Old Money, compatível com Gmail/Outlook) ----------

function esc(v) {
  if (v === undefined || v === null || v === '') return '—';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// extrai o número do investimento declarado (aceita "$5,000", "5000", "$10k", etc.)
function parseInvestment(raw) {
  if (!raw) return 0;
  let s = String(raw).toLowerCase().replace(/[, $]/g, '');
  const hasK = s.includes('k');
  s = s.replace(/[^0-9.]/g, '');
  let n = parseFloat(s) || 0;
  if (hasK && n < 1000) n = n * 1000;
  return n;
}

// decide a faixa de temperatura pelo investimento
function tier(investment) {
  const n = parseInvestment(investment);
  if (n >= 10000) {
    return { name: 'Hot lead', note: 'Priority · calendar shown', bg: '#EAF3DE', fg: '#3B6D11' };
  }
  if (n >= 5000) {
    return { name: 'Warm lead', note: 'For follow-up', bg: '#FAEEDA', fg: '#854F0B' };
  }
  return { name: 'Cool lead', note: 'Nurture', bg: '#F1EFE8', fg: '#5F5E5A' };
}

function row(label, value) {
  return `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#6E655A;font-family:Arial,sans-serif;">${esc(label)}</td>
      <td style="padding:6px 0;font-size:14px;color:#2B2622;font-weight:bold;text-align:right;font-family:Arial,sans-serif;">${esc(value)}</td>
    </tr>`;
}

function sectionLabel(text) {
  return `<div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#7C5730;font-family:Arial,sans-serif;border-bottom:1px solid #E0D9CC;padding-bottom:5px;margin:20px 0 8px;">${esc(text)}</div>`;
}

function emailShell(subtitle, innerHtml) {
  return `
  <div style="background:#F9F8F4;padding:24px 0;font-family:Arial,sans-serif;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #E0D9CC;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="background:#F9F8F4;border-bottom:1px solid #E0D9CC;padding:22px 26px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#2B2622;">Jose Oliveira Films</div>
          <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#7C5730;margin-top:3px;">${esc(subtitle)}</div>
        </td>
      </tr>
      <tr><td style="padding:24px 26px;">${innerHtml}</td></tr>
      <tr>
        <td style="background:#F9F8F4;border-top:1px solid #E0D9CC;padding:14px 26px;font-size:12px;color:#6E655A;text-align:center;">
          Jose Oliveira Films
        </td>
      </tr>
    </table>
  </div>`;
}

// Email 1 — Novo lead
function newLeadEmail(d) {
  const t = tier(d.intended_investment);
  const fullName = `${esc(d.first_name)} ${esc(d.last_name)}`.trim();
  const badge = `
    <div style="display:inline-block;background:${t.bg};color:${t.fg};font-size:12px;font-weight:bold;padding:6px 14px;border-radius:20px;margin-bottom:18px;font-family:Arial,sans-serif;">
      ${esc(t.name)} · ${esc(d.intended_investment)} · ${esc(t.note)}
    </div>`;

  const story = d.your_story
    ? `${sectionLabel('Their story')}
       <div style="background:#F9F8F4;border-radius:10px;padding:13px 15px;font-family:Georgia,serif;font-size:16px;color:#2B2622;line-height:1.5;font-style:italic;">${esc(d.your_story)}</div>`
    : '';

  const inner = `
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#2B2622;margin:0 0 6px;">${fullName}</div>
    ${badge}
    ${sectionLabel('Contact')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Email', d.email)}
      ${row('Phone', d.phone)}
      ${row('Instagram or site', d.instagram_or_website)}
    </table>
    ${sectionLabel('Their market')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Property calibre', d.estimated_property_value)}
      ${row('Years in market', d.years_experience)}
    </table>
    ${sectionLabel('The project')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Film type', d.film_type)}
      ${row('Location', d.project_location)}
      ${row('Investment', d.intended_investment)}
      ${row('Timeline', d.timeline)}
      ${row('Results wanted', d.results_matter)}
      ${row('Extra context', d.additional_context)}
    </table>
    ${story}`;

  return emailShell('New application received', inner);
}

// Email 2 — Reunião agendada
function bookedEmail(d) {
  const fullName = `${esc(d.first_name)} ${esc(d.last_name)}`.trim();
  const when = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F8F4;border:1px solid #A0703F;border-radius:12px;margin-bottom:22px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-family:Georgia,serif;font-size:19px;color:#2B2622;">${esc(d.booking_date)}</div>
        <div style="font-size:13px;color:#6E655A;margin-top:3px;">${esc(d.booking_time)}</div>
      </td></tr>
    </table>`;

  const inner = `
    <div style="display:inline-block;background:#EAF3DE;color:#3B6D11;font-size:12px;font-weight:bold;padding:6px 14px;border-radius:20px;margin-bottom:16px;font-family:Arial,sans-serif;">
      Meeting booked
    </div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:23px;color:#2B2622;margin:0 0 18px;">${fullName} booked a call</div>
    ${when}
    ${sectionLabel('Contact')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Email', d.email)}
      ${row('Phone', d.phone)}
      ${row('Instagram or site', d.instagram_or_website)}
    </table>
    ${sectionLabel('Context for the call')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Property calibre', d.estimated_property_value)}
      ${row('Investment', d.intended_investment)}
      ${row('Film type', d.film_type)}
    </table>`;

  return emailShell('Discovery call booked', inner);
}

async function sendEmail(subject, html) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Leads <onboarding@resend.dev>',
      to: 'chloe@joseoliveirafilms.com',
      subject,
      html
    });
    console.log('📩 Email enviado via Resend:', subject);
  } catch (err) {
    console.log('❌ Erro Resend:', err.message);
  }
}

// ---------- rotas ----------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

// Email 1: novo lead
app.post('/lead', async (req, res) => {
  const leadData = req.body;
  console.log('🔥 NOVO LEAD:', JSON.stringify(leadData, null, 2));
  res.json({ status: 'ok' });

  if (pool) {
    try {
      await pool.query('insert into leads (data) values ($1)', [leadData]);
      console.log('💾 Lead salvo no banco');
    } catch (err) {
      console.log('❌ Erro banco:', err.message);
    }
  }

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

  const t = tier(leadData.intended_investment);
  await sendEmail(`${t.name} — ${leadData.first_name || 'novo lead'} (${leadData.intended_investment || '—'})`, newLeadEmail(leadData));
});

// Email 2: reunião agendada (o front envia aqui quando o Cal.com confirma o booking)
app.post('/booked', async (req, res) => {
  const d = req.body;
  console.log('📅 REUNIÃO AGENDADA:', JSON.stringify(d, null, 2));
  res.json({ status: 'ok' });

  await sendEmail(`Call marcada — ${d.first_name || 'lead'} (${d.booking_date || ''})`, bookedEmail(d));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brand_film_luxury_v5_updated.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
