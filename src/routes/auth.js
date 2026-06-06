const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();

const sheets = require('../config/sheets');
const { signToken, authRequired } = require('../middleware/auth');

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'nome, email e senha sao obrigatorios' });
    }

    await sheets.ensureTabs();
    const rows = await sheets.readSheet('Usuarios');
    const users = rowsToObjects(rows);

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Email ja cadastrado' });

    const isFirst = users.length === 0;
    const senhaHash = await bcrypt.hash(senha, 10);
    const id = newId();
    const criadoEm = new Date().toISOString();

    await sheets.appendRow('Usuarios', [
      id, nome, email.toLowerCase(), senhaHash, isFirst ? 'admin' : (perfil || 'membro'), criadoEm
    ]);

    const token = signToken({ id, nome, email: email.toLowerCase(), perfil: isFirst ? 'admin' : (perfil || 'membro') });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.status(201).json({ token, user: { id, nome, email, perfil: isFirst ? 'admin' : (perfil || 'membro') } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'email e senha sao obrigatorios' });
    }

    const rows = await sheets.readSheet('Usuarios');
    const users = rowsToObjects(rows);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return res.status(401).json({ error: 'Credenciais invalidas' });

    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais invalidas' });

    const payload = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
    const token = signToken(payload);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ token, user: payload });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', authRequired, async (req, res, next) => {
  try {
    if (req.user.perfil !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
    const rows = await sheets.readSheet('Usuarios');
    const users = rowsToObjects(rows).map(u => {
      const { senha_hash, _rowIndex, ...safe } = u;
      return safe;
    });
    res.json(users);
  } catch (e) { next(e); }
});

router.put('/users/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.perfil !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
    const { id } = req.params;
    const { perfil, nome } = req.body;
    const rows = await sheets.readSheet('Usuarios');
    const users = rowsToObjects(rows);
    const u = users.find(x => x.id === id);
    if (!u) return res.status(404).json({ error: 'Usuario nao encontrado' });

    const novoPerfil = ['admin', 'lider', 'membro'].includes(perfil) ? perfil : u.perfil;
    const novoNome = nome && nome.trim() ? nome.trim() : u.nome;
    await sheets.updateRow('Usuarios', u._rowIndex, [
      u.id, novoNome, u.email, u.senha_hash, novoPerfil, u.criado_em
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/me/refresh', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Usuarios');
    const users = rowsToObjects(rows);
    const u = users.find(x => x.id === req.user.id);
    if (!u) return res.status(404).json({ error: 'Usuario nao encontrado' });
    const payload = { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
    const token = signToken(payload);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ token, user: payload });
  } catch (e) { next(e); }
});

router.delete('/users/:id', authRequired, async (req, res, next) => {
  try {
    if (req.user.perfil !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Voce nao pode excluir seu proprio usuario' });
    const rows = await sheets.readSheet('Usuarios');
    const users = rowsToObjects(rows);
    const u = users.find(x => x.id === id);
    if (!u) return res.status(404).json({ error: 'Usuario nao encontrado' });
    await sheets.deleteRow('Usuarios', u._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
