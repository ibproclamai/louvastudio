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

const TIPOS_VALIDOS = ['culto', 'ensaio', 'retiro', 'evento_especial', 'reuniao'];
const CORES = { culto: '#6366f1', ensaio: '#10b981', retiro: '#f59e0b', evento_especial: '#ec4899', reuniao: '#06b6d4' };

async function buildEventWithRelations(evento) {
  const [pRows, sRows, mRows] = await Promise.all([
    sheets.readSheet('EventoParticipantes'),
    sheets.readSheet('Musicas'),
    sheets.readSheet('Membros')
  ]);
  const parts = rowsToObjects(pRows);
  const songs = rowsToObjects(sRows);
  const members = rowsToObjects(mRows);
  return {
    ...evento,
    participantes: parts.filter(p => p.evento_id === evento.id).map(p => {
      const m = members.find(mm => mm.id === p.membro_id) || {};
      return { ...p, membro_nome: m.nome, membro_funcao: m.funcao };
    })
  };
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { tipo, de, ate } = req.query;
    const rows = await sheets.readSheet('Eventos');
    let items = rowsToObjects(rows);
    if (tipo) items = items.filter(e => e.tipo === tipo);
    if (de) items = items.filter(e => e.data >= de);
    if (ate) items = items.filter(e => e.data <= ate);
    items.sort((a, b) => (a.data + (a.hora_inicio || '')).localeCompare(b.data + (b.hora_inicio || '')));
    const enriched = await Promise.all(items.map(e => buildEventWithRelations(e)));
    res.json(enriched);
  } catch (e) { next(e); }
});

router.get('/calendar/:year/:month', authRequired, async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    const rows = await sheets.readSheet('Eventos');
    const items = rowsToObjects(rows).filter(e => e.data >= start && e.data < end);
    res.json(items);
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Eventos');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Evento nao encontrado' });
    res.json(await buildEventWithRelations(e));
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { data, hora_inicio, hora_fim, tipo, titulo, local, descricao, cor, participantes } = req.body;
    if (!data) return res.status(400).json({ error: 'data eh obrigatoria' });
    if (!titulo) return res.status(400).json({ error: 'titulo eh obrigatorio' });
    const t = (tipo || 'evento_especial').toLowerCase();
    if (!TIPOS_VALIDOS.includes(t)) return res.status(400).json({ error: 'tipo invalido' });

    const id = newId();
    const criadoEm = new Date().toISOString();
    const finalCor = cor || CORES[t];
    await sheets.appendRow('Eventos', [
      id, data, hora_inicio || '', hora_fim || '', t, titulo, local || '',
      descricao || '', finalCor, req.user.id, criadoEm
    ]);

    if (Array.isArray(participantes)) {
      for (const p of participantes) {
        await sheets.appendRow('EventoParticipantes', [newId(), id, p.membro_id, p.funcao || '', '']);
      }
    }

    res.status(201).json({ id });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Eventos');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Evento nao encontrado' });

    const { data, hora_inicio, hora_fim, tipo, titulo, local, descricao, cor } = req.body;
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ error: 'tipo invalido' });

    await sheets.updateRow('Eventos', e._rowIndex, [
      e.id,
      data ?? e.data,
      hora_inicio ?? e.hora_inicio,
      hora_fim ?? e.hora_fim,
      tipo ?? e.tipo,
      titulo ?? e.titulo,
      local ?? e.local,
      descricao ?? e.descricao,
      cor ?? e.cor,
      e.criado_por,
      e.criado_em
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Eventos');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Evento nao encontrado' });

    const pRows = await sheets.readSheet('EventoParticipantes');
    const parts = rowsToObjects(pRows);
    for (const p of parts.filter(x => x.evento_id === req.params.id)) {
      await sheets.deleteRow('EventoParticipantes', p._rowIndex);
    }
    await sheets.deleteRow('Eventos', e._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/participantes', authRequired, async (req, res, next) => {
  try {
    const { membro_id, funcao } = req.body;
    if (!membro_id) return res.status(400).json({ error: 'membro_id obrigatorio' });
    const newId2 = newId();
    await sheets.appendRow('EventoParticipantes', [newId2, req.params.id, membro_id, funcao || '', '']);
    res.status(201).json({ id: newId2 });
  } catch (e) { next(e); }
});

router.put('/:id/participantes/:partId/confirmar', authRequired, async (req, res, next) => {
  try {
    const { confirmado } = req.body;
    const rows = await sheets.readSheet('EventoParticipantes');
    const items = rowsToObjects(rows);
    const p = items.find(x => x.id === req.params.partId && x.evento_id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Participante nao encontrado' });
    await sheets.updateRow('EventoParticipantes', p._rowIndex, [
      p.id, p.evento_id, p.membro_id, p.funcao, confirmado ? 'confirmado' : 'pendente'
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id/participantes/:partId', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('EventoParticipantes');
    const items = rowsToObjects(rows);
    const p = items.find(x => x.id === req.params.partId && x.evento_id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Participante nao encontrado' });
    await sheets.deleteRow('EventoParticipantes', p._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/tipos/list', (req, res) => {
  res.json(TIPOS_VALIDOS.map(t => ({
    value: t, label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '), cor: CORES[t]
  })));
});

module.exports = router;
module.exports.TIPOS_VALIDOS = TIPOS_VALIDOS;
module.exports.CORES = CORES;
