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

const TIPOS_VALIDOS = ['playback', 'stem', 'metronomo', 'click', 'ensaio', 'guia', 'multitrack', 'outro'];

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { musica_id } = req.query;
    const rows = await sheets.readSheet('VS');
    let items = rowsToObjects(rows);
    if (musica_id) items = items.filter(v => v.musica_id === musica_id);
    res.json(items);
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('VS');
    const items = rowsToObjects(rows);
    const item = items.find(v => v.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'VS nao encontrado' });
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { musica_id, nome, tipo, url, tom, bpm, descricao } = req.body;
    if (!musica_id) return res.status(400).json({ error: 'musica_id eh obrigatorio' });
    if (!nome) return res.status(400).json({ error: 'nome eh obrigatorio' });
    if (!url) return res.status(400).json({ error: 'url eh obrigatorio' });
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'tipo invalido. Use: ' + TIPOS_VALIDOS.join(', ') });
    }

    const id = newId();
    const criadoEm = new Date().toISOString();
    await sheets.appendRow('VS', [
      id, musica_id, nome, tipo || 'playback', url, tom || '', bpm || '', descricao || '', criadoEm
    ]);
    res.status(201).json({ id, musica_id, nome, tipo: tipo || 'playback', url, tom, bpm, descricao, criado_em: criadoEm });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('VS');
    const items = rowsToObjects(rows);
    const item = items.find(v => v.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'VS nao encontrado' });

    const { musica_id, nome, tipo, url, tom, bpm, descricao } = req.body;
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'tipo invalido' });
    }

    const updated = [
      item.id,
      musica_id ?? item.musica_id,
      nome ?? item.nome,
      tipo ?? item.tipo,
      url ?? item.url,
      tom ?? item.tom,
      bpm ?? item.bpm,
      descricao ?? item.descricao,
      item.criado_em
    ];
    await sheets.updateRow('VS', item._rowIndex, updated);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('VS');
    const items = rowsToObjects(rows);
    const item = items.find(v => v.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'VS nao encontrado' });
    await sheets.deleteRow('VS', item._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.TIPOS_VALIDOS = TIPOS_VALIDOS;
