const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const sheets = require('../config/sheets');
const { authRequired } = require('../middleware/auth');

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

async function getUserMinisterio(userId) {
  const rows = await sheets.readSheet('Usuarios');
  const [h, ...data] = rows;
  const u = data.find(r => r[0] === userId);
  return u ? u[5] : null;
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const minId = await getUserMinisterio(req.user.id);
    if (!minId) return res.json([]);
    const rows = await sheets.readSheet('Devocionais');
    const all = rowsToObjects(rows).filter(d => d.ministerio_id === minId);
    res.json(all.sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || '')));
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Devocionais');
    const all = rowsToObjects(rows);
    const dev = all.find(d => d.id === req.params.id);
    if (!dev) return res.status(404).json({ error: 'Devocional nao encontrado' });
    res.json(dev);
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { titulo, conteudo, versiculo, referencia, musica_id } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ error: 'titulo e conteudo sao obrigatorios' });
    const minId = await getUserMinisterio(req.user.id);
    if (!minId) return res.status(400).json({ error: 'Voce precisa estar em um ministerio' });

    const id = newId();
    await sheets.appendRow('Devocionais', [
      id, minId, titulo, conteudo, versiculo || '', referencia || '',
      musica_id || '', req.user.id, new Date().toISOString()
    ]);
    res.json({ id });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Devocionais');
    const objs = rowsToObjects(rows);
    const idx = objs.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Devocional nao encontrado' });
    const updated = { ...objs[idx] };
    if (req.body.titulo !== undefined) updated.titulo = req.body.titulo;
    if (req.body.conteudo !== undefined) updated.conteudo = req.body.conteudo;
    if (req.body.versiculo !== undefined) updated.versiculo = req.body.versiculo;
    if (req.body.referencia !== undefined) updated.referencia = req.body.referencia;
    if (req.body.musica_id !== undefined) updated.musica_id = req.body.musica_id;
    const header = ['id', 'ministerio_id', 'titulo', 'conteudo', 'versiculo', 'referencia', 'musica_id', 'autor_id', 'criado_em'];
    const newRow = header.map(h => updated[h] || '');
    await sheets.updateRow('Devocionais', objs[idx]._rowIndex, newRow);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Devocionais');
    const objs = rowsToObjects(rows);
    const idx = objs.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Devocional nao encontrado' });
    await sheets.deleteRow('Devocionais', objs[idx]._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
