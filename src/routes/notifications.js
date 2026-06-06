const nodemailer = require('nodemailer');
const sheets = require('../config/sheets');
const express = require('express');
const router = express.Router();
const { authRequired, adminRequired } = require('../middleware/auth');

let transporter = null;
let lastConfigHash = '';

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

async function getEmailConfig() {
  const rows = await sheets.readSheet('Config');
  const items = rowsToObjects(rows);
  const cfg = {};
  for (const it of items) {
    if (it.chave && it.chave.startsWith('email_')) cfg[it.chave] = it.valor;
  }
  return cfg;
}

async function getTransporter() {
  const cfg = await getEmailConfig();
  if (!cfg.email_host || !cfg.email_user || !cfg.email_pass) return null;
  const hash = `${cfg.email_host}:${cfg.email_port || '587'}:${cfg.email_user}:${cfg.email_pass}`;
  if (hash === lastConfigHash && transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: cfg.email_host,
    port: parseInt(cfg.email_port) || 587,
    secure: parseInt(cfg.email_port) === 465,
    auth: { user: cfg.email_user, pass: cfg.email_pass }
  });
  lastConfigHash = hash;
  return transporter;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildScheduleEmail({ schedule, membros, musicas, config, baseUrl }) {
  const d = new Date(schedule.data_culto + 'T00:00:00');
  const dataFmt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const subject = `[${escapeHtml(config.nome_igreja || 'Louva.Studio')}] Nova escala: ${escapeHtml(schedule.tipo_culto || 'Culto')} - ${dataFmt}`;

  const musicasHtml = musicas.length > 0 ? `
    <h3 style="color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:0.3rem;margin-top:1.5rem">Repertorio</h3>
    <ol style="padding-left:1.5rem;line-height:1.8">
      ${musicas.map(mu => `<li><strong>${escapeHtml(mu.titulo)}</strong>${mu.artista ? ` - <em>${escapeHtml(mu.artista)}</em>` : ''}${mu.tom ? ` <span style="background:#e0d4f5;color:#6c5ce7;padding:0.1rem 0.5rem;border-radius:12px;font-size:0.8rem;margin-left:0.4rem">Tom: ${escapeHtml(mu.tom)}</span>` : ''}</li>`).join('')}
    </ol>
  ` : '';

  const membrosHtml = membros.length > 0 ? `
    <h3 style="color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:0.3rem;margin-top:1.5rem">Equipe</h3>
    <ul style="list-style:none;padding-left:0;line-height:1.8">
      ${membros.map(m => `<li>&#9836; <strong>${escapeHtml(m.membro_nome)}</strong>${m.membro_funcao ? ` (${escapeHtml(m.membro_funcao)})` : ''}${m.funcao_na_escala ? ` - <em>${escapeHtml(m.funcao_na_escala)}</em>` : ''}</li>`).join('')}
    </ul>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"></head>
    <body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f5f6fa;padding:1.5rem;color:#2d3436">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#6366f1,#ec4899);padding:1.5rem;color:white">
          <h1 style="margin:0;font-size:1.4rem">${escapeHtml(config.nome_igreja || 'Ministerio de Louvor')}</h1>
          <p style="margin:0.3rem 0 0;opacity:0.9">Nova escala publicada</p>
        </div>
        <div style="padding:1.5rem">
          <h2 style="color:#6c5ce7;margin:0 0 0.5rem">${escapeHtml(schedule.tipo_culto || 'Culto')}</h2>
          <p style="margin:0.5rem 0"><strong>Data:</strong> ${dataFmt}</p>
          ${schedule.local ? `<p style="margin:0.5rem 0"><strong>Local:</strong> ${escapeHtml(schedule.local)}</p>` : ''}
          ${schedule.observacoes ? `<p style="margin:0.5rem 0;padding:0.5rem;background:#f5f6fa;border-radius:4px"><strong>Observacoes:</strong> ${escapeHtml(schedule.observacoes)}</p>` : ''}
          ${membrosHtml}
          ${musicasHtml}
          <div style="text-align:center;margin:2rem 0 1rem">
            <a href="${baseUrl}/my-schedule.html" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600">Confirmar Participacao</a>
          </div>
          <p style="font-size:0.85rem;color:#636e72;text-align:center;margin:1.5rem 0 0;border-top:1px solid #dfe6e9;padding-top:1rem">
            ${escapeHtml(config.mensagem_rodape || 'Que o louvor seja para a gloria de Deus!')}
          </p>
        </div>
      </div>
    </body></html>
  `;
  const text = `
${config.nome_igreja || 'Ministerio de Louvor'}
Nova escala: ${schedule.tipo_culto || 'Culto'}
Data: ${dataFmt}
${schedule.local ? 'Local: ' + schedule.local : ''}

${schedule.observacoes ? 'Observacoes: ' + schedule.observacoes + '\n' : ''}
${membros.length > 0 ? '\nEQUIPE:\n' + membros.map(m => `- ${m.membro_nome}${m.funcao_na_escala ? ' (' + m.funcao_na_escala + ')' : ''}`).join('\n') : ''}
${musicas.length > 0 ? '\nREPERTORIO:\n' + musicas.map((mu, i) => `${i+1}. ${mu.titulo}${mu.tom ? ' (Tom: ' + mu.tom + ')' : ''}`).join('\n') : ''}

Confirme em: ${baseUrl}/my-schedule.html
  `.trim();
  return { subject, html, text };
}

async function sendScheduleEmails(scheduleId, baseUrl) {
  const [scRows, pRows, esRows, sRows, mRows, uRows, cRows] = await Promise.all([
    sheets.readSheet('Escalas'),
    sheets.readSheet('EscalaMembros'),
    sheets.readSheet('EscalaMusicas'),
    sheets.readSheet('Musicas'),
    sheets.readSheet('Membros'),
    sheets.readSheet('Usuarios'),
    sheets.readSheet('Config')
  ]);
  const escalas = rowsToObjects(scRows);
  const schedule = escalas.find(e => e.id === scheduleId);
  if (!schedule) return { sent: 0, errors: ['Escala nao encontrada'] };
  if (schedule.status !== 'publicada') return { sent: 0, errors: ['Escala nao esta publicada'] };

  const partEscala = rowsToObjects(pRows).filter(p => p.escala_id === scheduleId);
  const musicasEscala = rowsToObjects(esRows).filter(m => m.escala_id === scheduleId).sort((a, b) => Number(a.ordem) - Number(b.ordem));
  const members = rowsToObjects(mRows);
  const songs = rowsToObjects(sRows);
  const users = rowsToObjects(uRows);
  const configItems = rowsToObjects(cRows);
  const config = {};
  for (const it of configItems) config[it.chave] = it.valor;

  const membros = partEscala.map(p => {
    const m = members.find(mm => mm.id === p.membro_id) || {};
    return { ...p, membro_nome: m.nome, membro_funcao: m.funcao, membro_email: m.email };
  });
  const musicas = musicasEscala.map(mu => {
    const s = songs.find(ss => ss.id === mu.musica_id) || {};
    return { ...mu, titulo: s.titulo, artista: s.artista, tom: s.tom };
  });

  const tr = await getTransporter();
  if (!tr) return { sent: 0, errors: ['Email nao configurado. Configure em Estúdio > Configuracoes da Igreja > aba Email.'] };

  const from = `${config.email_from_name || 'Louva.Studio'} <${config.email_user}>`;
  const { subject, html, text } = buildScheduleEmail({ schedule, membros, musicas, config, baseUrl });

  const sent = [];
  const errors = [];
  for (const m of membros) {
    if (!m.membro_email) continue;
    try {
      await tr.sendMail({ from, to: m.membro_email, subject, html, text });
      sent.push(m.membro_email);
    } catch (e) {
      errors.push(`${m.membro_email}: ${e.message}`);
    }
  }
  return { sent: sent.length, errors, recipients: sent };
}

router.post('/test', authRequired, adminRequired, async (req, res, next) => {
  try {
    const tr = await getTransporter();
    if (!tr) return res.status(400).json({ ok: false, error: 'Email nao configurado. Va em Estúdio > Configuracoes da Igreja.' });
    const { email } = req.body;
    const to = email || req.user.email || req.body.to;
    if (!to) return res.status(400).json({ ok: false, error: 'Informe um email de destino' });
    await tr.sendMail({
      from: `"${(await getEmailConfig()).email_from_name || 'Louva.Studio'}" <${(await getEmailConfig()).email_user}>`,
      to,
      subject: 'Louva.Studio - Teste de email',
      html: '<h1>Funcionou!</h1><p>Este e um email de teste do Louva.Studio. Seu servidor de email esta configurado corretamente.</p>',
      text: 'Funcionou! Email de teste do Louva.Studio.'
    });
    res.json({ ok: true, sentTo: to });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/config', authRequired, async (req, res, next) => {
  try {
    const cfg = await getEmailConfig();
    const safe = { ...cfg };
    if (safe.email_pass) safe.email_pass = '********';
    const tr = await getTransporter();
    res.json({ config: safe, configured: !!tr });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.sendScheduleEmails = sendScheduleEmails;
