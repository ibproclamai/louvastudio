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
    const [songRows, vsRows] = await Promise.all([
      sheets.readSheet('Musicas'),
      sheets.readSheet('VS')
    ]);
    const songs = rowsToObjects(songRows);
    const vs = rowsToObjects(vsRows);

    const result = songs.map(s => ({
      ...s,
      vs_list: vs.filter(v => v.musica_id === s.id)
    }));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const [songRows, vsRows] = await Promise.all([
      sheets.readSheet('Musicas'),
      sheets.readSheet('VS')
    ]);
    const items = rowsToObjects(songRows);
    const vs = rowsToObjects(vsRows);
    const s = items.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Musica nao encontrada' });
    res.json({ ...s, vs_list: vs.filter(v => v.musica_id === s.id) });
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { titulo, artista, tom, bpm, cifra_url, video_url, observacoes } = req.body;
    if (!titulo) return res.status(400).json({ error: 'titulo eh obrigatorio' });

    const id = newId();
    const criadoEm = new Date().toISOString();
    await sheets.appendRow('Musicas', [
      id, titulo, artista || '', tom || '', bpm || '', cifra_url || '', video_url || '', observacoes || '', criadoEm
    ]);
    res.status(201).json({ id, titulo, artista, tom, bpm, cifra_url, video_url, observacoes, criado_em: criadoEm });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Musicas');
    const items = rowsToObjects(rows);
    const song = items.find(s => s.id === id);
    if (!song) return res.status(404).json({ error: 'Musica nao encontrada' });

    const { titulo, artista, tom, bpm, cifra_url, video_url, observacoes } = req.body;
    const updated = [
      song.id,
      titulo ?? song.titulo,
      artista ?? song.artista,
      tom ?? song.tom,
      bpm ?? song.bpm,
      cifra_url ?? song.cifra_url,
      video_url ?? song.video_url,
      observacoes ?? song.observacoes,
      song.criado_em
    ];
    await sheets.updateRow('Musicas', song._rowIndex, updated);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Musicas');
    const items = rowsToObjects(rows);
    const song = items.find(s => s.id === id);
    if (!song) return res.status(404).json({ error: 'Musica nao encontrada' });

    const vsRows = await sheets.readSheet('VS');
    const vsItems = rowsToObjects(vsRows);
    for (const v of vsItems.filter(v => v.musica_id === id)) {
      await sheets.deleteRow('VS', v._rowIndex);
    }

    await sheets.deleteRow('Musicas', song._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
