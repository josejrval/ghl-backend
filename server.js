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

const FORM_FILE = 'brand_film_luxury_v5_updated.html';

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
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// GATE — recalculado no servidor (nunca confiar no navegador)
// Mesma lógica robusta do form: trata "10k", "10,000", "10.000", "$10k".
// ============================================================
const GATE_THRESHOLD = 10000;

function extractBudget(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim();
  if (!s) return null;
  const mult = /([\d][\d.,\s]*?)\s*(k|mil)\b/.exec(s);
  if (mult) {
    const base = cleanNumber(mult[1]);
    if (base === null) return null;
    return Math.round(base * 1000);
  }
  return cleanNumber(s);
}

function cleanNumber(s) {
  const m = /(\d[\d.,]*)/.exec(String(s));
  if (!m) return null;
  let t = m[1].replace(/[.,]+$/, '');
  const hasComma = t.includes(',');
  const hasDot = t.includes('.');
  if (hasComma && hasDot) return safeFloat(t.replace(/,/g, ''));
  if (hasComma && !hasDot) {
    const parts = t.split(',');
    if (parts.length === 2 && parts[1].length === 2) return safeFloat(parts[0] + '.' + parts[1]);
    return safeFloat(t.replace(/,/g, ''));
  }
  if (hasDot && !hasComma) {
    const parts = t.split('.');
    const last = parts[parts.length - 1];
    if (last.length === 3) return safeFloat(parts.join(''));
    if (parts.length > 2) { const dec = parts.pop(); return safeFloat(parts.join('') + '.' + dec); }
    return safeFloat(t);
  }
  return safeFloat(t);
}
function safeFloat(t) { const n = parseFloat(t); return isNaN(n) ? null : n; }

// ---------- helpers de email (Old Money, compatível com Gmail/Outlook) ----------

function esc(v) {
  if (v === undefined || v === null || v === '') return '—';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// temperatura: 🔥 se qualifica (>= $10k), senão frio. Sem número → frio.
function tier(budgetNum) {
  if (budgetNum !== null && budgetNum >= GATE_THRESHOLD) {
    return { name: '🔥 Hot lead', note: 'Priority · calendar shown', bg: '#EAF3DE', fg: '#3B6D11' };
  }
  return { name: '❄️ Cool lead', note: 'For Chloe · follow-up', bg: '#F1EFE8', fg: '#5F5E5A' };
}

function money(budgetNum, raw) {
  if (budgetNum === null) return esc(raw);
  return '$' + budgetNum.toLocaleString('en-US');
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
function newLeadEmail(d, budgetNum) {
  const t = tier(budgetNum);
  const fullName = `${esc(d.first_name)} ${esc(d.last_name)}`.trim();
  const isFounder = (d.lead_type || '').toLowerCase().indexOf('founder') !== -1;

  const badge = `
    <div style="display:inline-block;background:${t.bg};color:${t.fg};font-size:12px;font-weight:bold;padding:6px 14px;border-radius:20px;margin-bottom:18px;font-family:Arial,sans-serif;">
      ${esc(t.name)} · ${money(budgetNum, d.budget)} · ${esc(t.note)}
    </div>`;

  const typePill = `<div style="display:inline-block;background:#F1ECE2;color:#7C5730;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin:0 0 12px;font-family:Arial,sans-serif;">${isFounder ? 'Founder / brand' : 'Real estate agent'}</div>`;

  const middleSection = isFounder
    ? `${sectionLabel('Their company')}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
         ${row('Industry', d.industry)}
         ${row('Company revenue', d.revenue)}
         ${row('Role', d.role)}
       </table>`
    : `${sectionLabel('Their market')}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
         ${row('Property calibre', d.calibre)}
         ${row('Years in market', d.years)}
       </table>`;

  const elseBlock = d.something_else_text
    ? `${sectionLabel('In their words')}
       <div style="background:#F9F8F4;border-radius:10px;padding:13px 15px;font-family:Georgia,serif;font-size:16px;color:#2B2622;line-height:1.5;font-style:italic;">${esc(d.something_else_text)}</div>`
    : '';

  const context = d.additional_context
    ? `${sectionLabel('Anything else')}
       <div style="background:#F9F8F4;border-radius:10px;padding:13px 15px;font-family:Georgia,serif;font-size:16px;color:#2B2622;line-height:1.5;font-style:italic;">${esc(d.additional_context)}</div>`
    : '';

  const inner = `
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#2B2622;margin:0 0 6px;">${fullName}</div>
    ${typePill}<br>
    ${badge}
    ${sectionLabel('Contact')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Email', d.email)}
      ${row('Phone', d.phone)}
      ${row('Location', d.location)}
      ${row('Instagram or site', d.instagram)}
    </table>
    ${middleSection}
    ${sectionLabel('What they want')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Objective', d.objective)}
      ${row('Film chosen', d.film_type)}
      ${row('Budget', money(budgetNum, d.budget))}
      ${row('Timeline', d.timeline)}
    </table>
    ${elseBlock}
    ${context}`;

  return emailShell('New application received', inner);
}

// Email 2 — Reunião agendada
function bookedEmail(d) {
  const fullName = `${esc(d.first_name)} ${esc(d.last_name)}`.trim();
  const isFounder = (d.lead_type || '').toLowerCase().indexOf('founder') !== -1;
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
      ${row('Location', d.location)}
      ${row('Instagram or site', d.instagram)}
    </table>
    ${sectionLabel('Context for the call')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${isFounder
        ? `${row('Industry', d.industry)}${row('Company revenue', d.revenue)}${row('Role', d.role)}`
        : `${row('Property calibre', d.calibre)}${row('Years in market', d.years)}`}
      ${row('Objective', d.objective)}
      ${row('Film chosen', d.film_type)}
      ${row('Budget', d.budget)}
    </table>`;

  return emailShell('Discovery call booked', inner);
}

async function sendEmail(subject, html) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const RECIPIENTS = ['chloe@joseoliveirafilms.com', 'contact@joseoliveirafilms.com'];
  try {
    const r = await resend.emails.send({
      from: 'Leads <onboarding@resend.dev>',
      to: RECIPIENTS,
      subject,
      html
    });
    if (r && r.error) throw new Error(r.error.message || JSON.stringify(r.error));
    console.log('📩 Email enviado via Resend (2 destinatários):', subject);
  } catch (err) {
    console.log('⚠️ Falhou com 2 destinatários (' + err.message + ') — tentando só Chloe');
    try {
      const r2 = await resend.emails.send({
        from: 'Leads <onboarding@resend.dev>',
        to: 'chloe@joseoliveirafilms.com',
        subject,
        html
      });
      if (r2 && r2.error) throw new Error(r2.error.message || JSON.stringify(r2.error));
      console.log('📩 Email enviado via Resend (só Chloe):', subject);
    } catch (err2) {
      console.log('❌ Erro Resend:', err2.message);
    }
  }
}

// monta o assunto: "Marcus, Miami — 🔥 Hot lead ($10,000) - 🏠 Agent"
function buildSubject(d, budgetNum) {
  const t = tier(budgetNum);
  const isFounder = (d.lead_type || '').toLowerCase().indexOf('founder') !== -1;
  const typeEmoji = isFounder ? '🎬' : '🏠';
  const typeWord = isFounder ? 'Founder' : 'Agent';
  const name = d.first_name || 'novo lead';
  const city = d.location ? `, ${d.location}` : '';
  return `${name}${city} — ${t.name} (${money(budgetNum, d.budget)}) - ${typeEmoji} ${typeWord}`;
}

// ---------- rotas ----------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', FORM_FILE));
});

// Email 1: novo lead
app.post('/lead', async (req, res) => {
  const d = req.body || {};
  res.json({ status: 'ok' });

  // Proteções contra bot: honeypot preenchido ou envio rápido demais.
  const elapsed = Number(d.elapsed_ms) || 0;
  if (d.company_website) { console.log('🕳️ Honeypot preenchido — lead ignorado'); return; }
  if (elapsed > 0 && elapsed < 3000) { console.log('⏱️ Envio rápido demais (' + elapsed + 'ms) — lead ignorado'); return; }

  // Gate recalculado no servidor (não confia no que veio do navegador).
  const budgetNum = extractBudget(d.budget);
  const qualifies = budgetNum !== null && budgetNum >= GATE_THRESHOLD;

  console.log('🔥 NOVO LEAD:', d.first_name, d.last_name, '·', d.location || '—', '·', d.budget || '—', '→', qualifies ? 'HOT (calendário)' : 'para Chloe');

  if (pool) {
    try {
      await pool.query("insert into leads (data, status) values (\$1, \$2)", [d, qualifies ? 'qualified' : 'nurture']);
      console.log('💾 Lead salvo no banco');
    } catch (err) {
      console.log('❌ Erro banco:', err.message);
    }
  }

  try {
    await fetch('https://hook.us2.make.com/6n477rbaq6fqqw30myrbtw0w57v3ktxv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, budget_value_server: budgetNum, qualifies_server: qualifies })
    });
    console.log('✅ Enviado para Make');
  } catch (err) {
    console.log('❌ Erro Make:', err.message);
  }

  await sendEmail(buildSubject(d, budgetNum), newLeadEmail(d, budgetNum));
});

// Email 2: reunião agendada
app.post('/booked', async (req, res) => {
  const d = req.body || {};
  console.log('📅 REUNIÃO AGENDADA:', d.first_name, d.last_name, '·', d.booking_date || '');
  res.json({ status: 'ok' });

  const city = d.location ? `, ${d.location}` : '';
  await sendEmail(`📅 Reunião marcada — ${d.first_name || 'lead'}${city} (${d.booking_date || ''})`, bookedEmail(d));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', FORM_FILE));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
