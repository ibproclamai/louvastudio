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

const SONG_HEADERS = [
  'id', 'ministerio_id', 'titulo', 'artista', 'tom', 'bpm',
  'cifra_url', 'video_url', 'letra_url', 'tema', 'intensidade',
  'referencias_biblicas', 'versiculo_chave', 'observacoes', 'criado_em'
];

async function getUserMinisterio(userId) {
  const rows = await sheets.readSheet('Usuarios');
  const [h, ...data] = rows;
  const u = data.find(r => r[0] === userId);
  return u ? u[5] : null;
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const [songRows, vsRows, escMusRows, escRows] = await Promise.all([
      sheets.readSheet('Musicas'),
      sheets.readSheet('VS'),
      sheets.readSheet('EscalaMusicas'),
      sheets.readSheet('Escalas')
    ]);
    const minId = await getUserMinisterio(req.user.id);
    const allSongs = rowsToObjects(songRows);
    const songs = allSongs.filter(s => !s.ministerio_id || s.ministerio_id === minId);
    const vs = rowsToObjects(vsRows);
    const escMus = rowsToObjects(escMusRows);
    const escs = rowsToObjects(escRows);

    const result = songs.map(s => {
      const songEscalas = escMus.filter(em => em.musica_id === s.id);
      const lastPlayed = songEscalas
        .map(em => escs.find(e => e.id === em.escala_id))
        .filter(e => e && e.data_culto)
        .map(e => e.data_culto)
        .sort()
        .pop() || '';
      return {
        ...s,
        vs_list: vs.filter(v => v.musica_id === s.id),
        ultima_execucao: lastPlayed,
        total_execucoes: songEscalas.length
      };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const [songRows, vsRows, escMusRows, escRows, devRows] = await Promise.all([
      sheets.readSheet('Musicas'),
      sheets.readSheet('VS'),
      sheets.readSheet('EscalaMusicas'),
      sheets.readSheet('Escalas'),
      sheets.readSheet('Devocionais')
    ]);
    const items = rowsToObjects(songRows);
    const vs = rowsToObjects(vsRows);
    const escMus = rowsToObjects(escMusRows);
    const escs = rowsToObjects(escRows);
    const devs = rowsToObjects(devRows);
    const s = items.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Musica nao encontrada' });

    const songEscalas = escMus.filter(em => em.musica_id === s.id);
    const historico = songEscalas
      .map(em => escs.find(e => e.id === em.escala_id))
      .filter(e => e && e.data_culto)
      .sort((a, b) => (b.data_culto || '').localeCompare(a.data_culto || ''));

    res.json({
      ...s,
      vs_list: vs.filter(v => v.musica_id === s.id),
      devocionais: devs.filter(d => d.musica_id === s.id),
      historico,
      total_execucoes: songEscalas.length
    });
  } catch (e) { next(e); }
});

router.post('/', authRequired, adminRequired, async (req, res, next) => {
  try {
    const {
      titulo, artista, tom, bpm, cifra_url, video_url, letra_url,
      tema, intensidade, referencias_biblicas, versiculo_chave, observacoes
    } = req.body;
    if (!titulo) return res.status(400).json({ error: 'titulo eh obrigatorio' });
    const minId = await getUserMinisterio(req.user.id);

    const id = newId();
    const criadoEm = new Date().toISOString();
    await sheets.appendRow('Musicas', [
      id, minId || '', titulo, artista || '', tom || '', bpm || '',
      cifra_url || '', video_url || '', letra_url || '',
      tema || '', intensidade || '',
      Array.isArray(referencias_biblicas) ? referencias_biblicas.join('|') : (referencias_biblicas || ''),
      versiculo_chave || '',
      observacoes || '', criadoEm
    ]);
    res.status(201).json({ id, titulo });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Musicas');
    const items = rowsToObjects(rows);
    const song = items.find(s => s.id === id);
    if (!song) return res.status(404).json({ error: 'Musica nao encontrada' });

    const fields = ['titulo', 'artista', 'tom', 'bpm', 'cifra_url', 'video_url', 'letra_url',
                    'tema', 'intensidade', 'versiculo_chave', 'observacoes'];
    const updated = SONG_HEADERS.map(h => song[h] || '');
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const colIdx = SONG_HEADERS.indexOf(f);
        updated[colIdx] = req.body[f] || '';
      }
    }
    if (req.body.referencias_biblicas !== undefined) {
      const colIdx = SONG_HEADERS.indexOf('referencias_biblicas');
      updated[colIdx] = Array.isArray(req.body.referencias_biblicas)
        ? req.body.referencias_biblicas.join('|')
        : (req.body.referencias_biblicas || '');
    }
    await sheets.updateRow('Musicas', song._rowIndex, updated);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, adminRequired, async (req, res, next) => {
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
