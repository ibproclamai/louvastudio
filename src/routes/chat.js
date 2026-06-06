const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const sheets = require('../config/sheets');
const { authRequired } = require('../middleware/auth');

const CANAL_GERAL = 'geral';

function newId() { return crypto.randomBytes(8).toString('hex'); }
function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

const messageCache = new Map();
const CACHE_TTL_MS = 1500;

async function getMessages(canal, sinceId) {
  const cacheKey = `${canal}:${sinceId || 'all'}`;
  const now = Date.now();
  const cached = messageCache.get(cacheKey);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.data;

  const rows = await sheets.readSheet('ChatMessages');
  let items = rowsToObjects(rows);
  items = items.filter(m => (m.canal || CANAL_GERAL) === canal);
  if (sinceId) items = items.filter(m => m.id > sinceId);
  items.sort((a, b) => (a.criado_em || '').localeCompare(b.criado_em || ''));

  const [uRows, mRows] = await Promise.all([
    sheets.readSheet('Usuarios'),
    sheets.readSheet('Membros')
  ]);
  const users = rowsToObjects(uRows);
  const members = rowsToObjects(mRows);
  const result = items.map(m => {
    const u = users.find(uu => uu.id === m.remetente_id);
    const member = members.find(mm => mm.id === (u?.id || '')) || members.find(mm => mm.nome === u?.nome);
    return {
      id: m.id,
      remetente_id: m.remetente_id,
      remetente_nome: u?.nome || 'Usuario',
      remetente_perfil: u?.perfil || 'membro',
      mensagem: m.mensagem,
      criado_em: m.criado_em
    };
  });
  messageCache.set(cacheKey, { at: now, data: result });
  return result;
}

router.get('/messages', authRequired, async (req, res, next) => {
  try {
    const canal = req.query.canal || CANAL_GERAL;
    const since = req.query.since || '';
    const messages = await getMessages(canal, since);
    res.json(messages);
  } catch (e) { next(e); }
});

router.post('/messages', authRequired, async (req, res, next) => {
  try {
    const { mensagem, canal } = req.body;
    if (!mensagem || !mensagem.trim()) return res.status(400).json({ error: 'mensagem obrigatoria' });
    if (mensagem.length > 2000) return res.status(400).json({ error: 'mensagem muito longa (max 2000)' });
    const id = newId();
    const criadoEm = new Date().toISOString();
    await sheets.appendRow('ChatMessages', [id, req.user.id, canal || CANAL_GERAL, mensagem.trim(), criadoEm]);
    messageCache.clear();
    res.status(201).json({ id, criado_em: criadoEm });
  } catch (e) { next(e); }
});

router.get('/members', authRequired, async (req, res, next) => {
  try {
    const [uRows, mRows, msgRows] = await Promise.all([
      sheets.readSheet('Usuarios'),
      sheets.readSheet('Membros'),
      sheets.readSheet('ChatMessages')
    ]);
    const users = rowsToObjects(uRows);
    const members = rowsToObjects(mRows);
    const messages = rowsToObjects(msgRows);
    const result = users.map(u => {
      const m = members.find(mm => mm.nome === u.nome || mm.email === u.email);
      const lastMsg = messages.filter(msg => msg.remetente_id === u.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0];
      return {
        id: u.id,
        nome: u.nome,
        perfil: u.perfil,
        funcao: m?.funcao || '',
        ultima_atividade: lastMsg?.criado_em || u.criado_em || ''
      };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.delete('/messages/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('ChatMessages');
    const items = rowsToObjects(rows);
    const msg = items.find(x => x.id === id);
    if (!msg) return res.status(404).json({ error: 'Mensagem nao encontrada' });
    const isOwner = msg.remetente_id === req.user.id;
    const isAdmin = req.user.perfil === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Sem permissao para deletar esta mensagem' });
    await sheets.deleteRow('ChatMessages', msg._rowIndex);
    messageCache.clear();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/canais', (req, res) => {
  res.json([{ value: CANAL_GERAL, label: 'Geral do Ministerio', icon: '&#127757;' }]);
});

module.exports = router;
