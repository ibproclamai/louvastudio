const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const sheets = require('../config/sheets');
const { authRequired, adminRequired } = require('../middleware/auth');

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

router.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Membros');
    res.json(rowsToObjects(rows));
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { nome, funcao, telefone, email, disponibilidade, ativo } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome eh obrigatorio' });

    const id = newId();
    const criadoEm = new Date().toISOString();
    await sheets.appendRow('Membros', [
      id, nome, funcao || '', telefone || '', email || '', disponibilidade || '', ativo !== false ? 'true' : 'false', criadoEm
    ]);
    res.status(201).json({ id, nome, funcao, telefone, email, disponibilidade, ativo: true, criado_em: criadoEm });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Membros');
    const items = rowsToObjects(rows);
    const member = items.find(m => m.id === id);
    if (!member) return res.status(404).json({ error: 'Membro nao encontrado' });

    const { nome, funcao, telefone, email, disponibilidade, ativo } = req.body;
    const updated = [
      member.id,
      nome ?? member.nome,
      funcao ?? member.funcao,
      telefone ?? member.telefone,
      email ?? member.email,
      disponibilidade ?? member.disponibilidade,
      ativo !== undefined ? (ativo ? 'true' : 'false') : member.ativo,
      member.criado_em
    ];
    await sheets.updateRow('Membros', member._rowIndex, updated);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Membros');
    const items = rowsToObjects(rows);
    const member = items.find(m => m.id === id);
    if (!member) return res.status(404).json({ error: 'Membro nao encontrado' });
    await sheets.deleteRow('Membros', member._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
