const express = require('express');
const crypto = require('crypto');
const sheets = require('../config/sheets');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const INSTRUMENTOS_VALIDOS = [
  'click', 'voz', 'violao', 'guitarra', 'baixo', 'teclado', 'bateria', 'metronomo', 'outro'
];

function rowToTrack(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  obj.volume_padrao = parseInt(obj.volume_padrao) || 80;
  obj.mutado_padrao = obj.mutado_padrao === 'true' || obj.mutado_padrao === true;
  obj.ordem = parseInt(obj.ordem) || 0;
  return obj;
}

router.get('/', async (req, res, next) => {
  try {
    const { vs_id } = req.query;
    const rows = await sheets.readSheet('MultitrackTracks', 'A1:Z1000');
    if (rows.length < 2) return res.json([]);
    const headers = rows[0];
    let tracks = rows.slice(1).map(r => rowToTrack(headers, r));
    if (vs_id) tracks = tracks.filter(t => t.vs_id === vs_id);
    tracks.sort((a, b) => parseInt(a.ordem) - parseInt(b.ordem));
    res.json(tracks);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('MultitrackTracks', 'A1:Z1000');
    if (rows.length < 2) return res.status(404).json({ error: 'Track nao encontrada' });
    const headers = rows[0];
    const track = rows.slice(1).map(r => rowToTrack(headers, r)).find(t => t.id === req.params.id);
    if (!track) return res.status(404).json({ error: 'Track nao encontrada' });
    res.json(track);
  } catch (e) { next(e); }
});

router.post('/', adminRequired, async (req, res, next) => {
  try {
    const { vs_id, instrumento, label, url, ordem, volume_padrao, mutado_padrao } = req.body;
    if (!vs_id || !url) return res.status(400).json({ error: 'vs_id e url sao obrigatorios' });
    const instr = (instrumento || 'outro').toLowerCase();
    if (!INSTRUMENTOS_VALIDOS.includes(instr)) {
      return res.status(400).json({ error: `Instrumento invalido. Use um de: ${INSTRUMENTOS_VALIDOS.join(', ')}` });
    }
    const id = crypto.randomBytes(8).toString('hex');
    const row = [
      id, vs_id, String(ordem || 0), instr,
      label || instr.charAt(0).toUpperCase() + instr.slice(1),
      url, String(volume_padrao ?? 80), String(mutado_padrao ?? false),
      new Date().toISOString()
    ];
    await sheets.appendRow('MultitrackTracks', row);
    res.status(201).json({ id, vs_id, instrumento: instr, label: row[4], url, ordem: parseInt(row[2]), volume_padrao: row[6], mutado_padrao: row[7] === 'true' });
  } catch (e) { next(e); }
});

router.put('/:id', adminRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('MultitrackTracks', 'A1:Z1000');
    if (rows.length < 2) return res.status(404).json({ error: 'Track nao encontrada' });
    const headers = rows[0];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === req.params.id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Track nao encontrada' });
    const current = rowToTrack(headers, rows[rowIndex]);
    const updated = {
      ...current,
      ...req.body,
      instrumento: (req.body.instrumento || current.instrumento).toLowerCase()
    };
    if (!INSTRUMENTOS_VALIDOS.includes(updated.instrumento)) {
      return res.status(400).json({ error: `Instrumento invalido` });
    }
    const newRow = [
      updated.id, updated.vs_id, String(updated.ordem), updated.instrumento,
      updated.label || updated.instrumento, updated.url,
      String(updated.volume_padrao), String(updated.mutado_padrao),
      current.criado_em || new Date().toISOString()
    ];
    await sheets.updateRow('MultitrackTracks', rowIndex + 1, newRow);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', adminRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('MultitrackTracks', 'A1:Z1000');
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === req.params.id);
    if (rowIndex === -1) return res.status(404).json({ error: 'Track nao encontrada' });
    await sheets.deleteRow('MultitrackTracks', rowIndex + 1);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/instruments/list', (req, res) => {
  res.json(INSTRUMENTOS_VALIDOS.map(i => ({
    value: i,
    label: i.charAt(0).toUpperCase() + i.slice(1),
    icon: { click: '🥁', voz: '🎤', violao: '🎸', guitarra: '🎸', baixo: '🎸', teclado: '🎹', bateria: '🥁', metronomo: '⏱️', outro: '🎵' }[i]
  })));
});

module.exports = router;
