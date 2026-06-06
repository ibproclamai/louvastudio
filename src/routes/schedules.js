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

async function buildScheduleWithRelations(escala) {
  const [emRows, songsRows, esRows, membersRows, vsRows] = await Promise.all([
    sheets.readSheet('EscalaMembros'),
    sheets.readSheet('Musicas'),
    sheets.readSheet('EscalaMusicas'),
    sheets.readSheet('Membros'),
    sheets.readSheet('VS')
  ]);
  const em = rowsToObjects(emRows);
  const songs = rowsToObjects(songsRows);
  const esm = rowsToObjects(esRows);
  const members = rowsToObjects(membersRows);
  const vs = rowsToObjects(vsRows);

  return {
    ...escala,
    status: escala.status || 'rascunho',
    membros: em.filter(x => x.escala_id === escala.id).map(x => {
      const m = members.find(mm => mm.id === x.membro_id) || {};
      return { ...x, membro_nome: m.nome, membro_funcao: m.funcao };
    }),
    musicas: esm.filter(x => x.escala_id === escala.id)
      .sort((a, b) => Number(a.ordem) - Number(b.ordem))
      .map(x => {
        const s = songs.find(ss => ss.id === x.musica_id) || {};
        const v = x.vs_id ? vs.find(vv => vv.id === x.vs_id) : null;
        return {
          ...x,
          titulo: s.titulo,
          artista: s.artista,
          tom: s.tom,
          vs: v ? { id: v.id, nome: v.nome, tipo: v.tipo, url: v.url, tom: v.tom, bpm: v.bpm } : null
        };
      })
  };
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const { status, publicas } = req.query;
    const [scRows, emRows, songsRows, esRows, membersRows, vsRows] = await Promise.all([
      sheets.readSheet('Escalas'),
      sheets.readSheet('EscalaMembros'),
      sheets.readSheet('Musicas'),
      sheets.readSheet('EscalaMusicas'),
      sheets.readSheet('Membros'),
      sheets.readSheet('VS')
    ]);
    const escalas = rowsToObjects(scRows);
    const em = rowsToObjects(emRows);
    const songs = rowsToObjects(songsRows);
    const esm = rowsToObjects(esRows);
    const members = rowsToObjects(membersRows);
    const vs = rowsToObjects(vsRows);

    let result = escalas.map(e => ({
      ...e,
      status: e.status || 'rascunho',
      membros: em.filter(x => x.escala_id === e.id).map(x => {
        const m = members.find(mm => mm.id === x.membro_id) || {};
        return { ...x, membro_nome: m.nome, membro_funcao: m.funcao };
      }),
      musicas: esm.filter(x => x.escala_id === e.id).sort((a, b) => Number(a.ordem) - Number(b.ordem)).map(x => {
        const s = songs.find(ss => ss.id === x.musica_id) || {};
        const v = x.vs_id ? vs.find(vv => vv.id === x.vs_id) : null;
        return {
          ...x,
          titulo: s.titulo,
          artista: s.artista,
          tom: s.tom,
          vs: v ? { id: v.id, nome: v.nome, tipo: v.tipo, url: v.url, tom: v.tom, bpm: v.bpm } : null
        };
      })
    }));

    if (status) result = result.filter(s => (s.status || 'rascunho') === status);
    if (publicas === '1' || publicas === 'true') result = result.filter(s => (s.status || 'rascunho') === 'publicada');

    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Escalas');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Escala nao encontrada' });
    res.json(await buildScheduleWithRelations(e));
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { data_culto, tipo_culto, local, observacoes, status, membros, musicas } = req.body;
    if (!data_culto) return res.status(400).json({ error: 'data_culto eh obrigatorio' });

    const id = newId();
    const criadoEm = new Date().toISOString();
    const finalStatus = status === 'publicada' ? 'publicada' : 'rascunho';

    await sheets.appendRow('Escalas', [
      id, data_culto, tipo_culto || '', local || '', observacoes || '', finalStatus, req.user.id, criadoEm
    ]);

    if (Array.isArray(membros)) {
      for (const m of membros) {
        await sheets.appendRow('EscalaMembros', [newId(), id, m.membro_id, m.funcao_na_escala || '', '']);
      }
    }
    if (Array.isArray(musicas)) {
      let i = 1;
      for (const mu of musicas) {
        await sheets.appendRow('EscalaMusicas', [newId(), id, mu.musica_id, String(i++), mu.vs_id || '']);
      }
    }

    res.status(201).json({ id });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Escalas');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === id);
    if (!e) return res.status(404).json({ error: 'Escala nao encontrada' });

    const { data_culto, tipo_culto, local, observacoes, status } = req.body;
    const updated = [
      e.id,
      data_culto ?? e.data_culto,
      tipo_culto ?? e.tipo_culto,
      local ?? e.local,
      observacoes ?? e.observacoes,
      status === 'publicada' ? 'publicada' : (status === 'rascunho' ? 'rascunho' : (e.status || 'rascunho')),
      e.criado_por,
      e.criado_em
    ];
    await sheets.updateRow('Escalas', e._rowIndex, updated);

    const { membros, musicas } = req.body;
    if (Array.isArray(membros)) {
      const emRows = await sheets.readSheet('EscalaMembros');
      const emItems = rowsToObjects(emRows);
      const atuais = emItems.filter(x => x.escala_id === id);
      for (const existing of atuais) {
        if (!membros.find(m => m.membro_id === existing.membro_id)) {
          await sheets.deleteRow('EscalaMembros', existing._rowIndex);
        }
      }
      for (const m of membros) {
        const ex = atuais.find(x => x.membro_id === m.membro_id);
        if (ex) {
          await sheets.updateRow('EscalaMembros', ex._rowIndex, [
            ex.id, ex.escala_id, ex.membro_id, m.funcao_na_escala ?? ex.funcao_na_escala, ex.confirmado
          ]);
        } else {
          await sheets.appendRow('EscalaMembros', [newId(), id, m.membro_id, m.funcao_na_escala || '', '']);
        }
      }
    }

    if (Array.isArray(musicas)) {
      const esRows = await sheets.readSheet('EscalaMusicas');
      const esItems = rowsToObjects(esRows);
      const atuais = esItems.filter(x => x.escala_id === id);
      for (const existing of atuais) {
        if (!musicas.find(mu => mu.musica_id === existing.musica_id)) {
          await sheets.deleteRow('EscalaMusicas', existing._rowIndex);
        }
      }
      for (let idx = 0; idx < musicas.length; idx++) {
        const mu = musicas[idx];
        const ordem = idx + 1;
        const ex = atuais.find(x => x.musica_id === mu.musica_id);
        if (ex) {
          await sheets.updateRow('EscalaMusicas', ex._rowIndex, [
            ex.id, ex.escala_id, ex.musica_id, String(ordem), mu.vs_id ?? ex.vs_id ?? ''
          ]);
        } else {
          await sheets.appendRow('EscalaMusicas', [newId(), id, mu.musica_id, String(ordem), mu.vs_id || '']);
        }
      }
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await sheets.readSheet('Escalas');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === id);
    if (!e) return res.status(404).json({ error: 'Escala nao encontrada' });

    for (const tab of ['EscalaMembros', 'EscalaMusicas']) {
      const r = await sheets.readSheet(tab);
      const its = rowsToObjects(r);
      for (const it of its.filter(x => x.escala_id === id)) {
        await sheets.deleteRow(tab, it._rowIndex);
      }
    }
    await sheets.deleteRow('Escalas', e._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/membros', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { membro_id, funcao_na_escala } = req.body;
    if (!membro_id) return res.status(400).json({ error: 'membro_id obrigatorio' });
    const newRowId = newId();
    await sheets.appendRow('EscalaMembros', [newRowId, id, membro_id, funcao_na_escala || '', '']);
    res.status(201).json({ id: newRowId });
  } catch (e) { next(e); }
});

router.delete('/:id/membros/:escalaMembroId', authRequired, async (req, res, next) => {
  try {
    const { id, escalaMembroId } = req.params;
    const rows = await sheets.readSheet('EscalaMembros');
    const items = rowsToObjects(rows);
    const entry = items.find(x => x.id === escalaMembroId && x.escala_id === id);
    if (!entry) return res.status(404).json({ error: 'Membro da escala nao encontrado' });
    await sheets.deleteRow('EscalaMembros', entry._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/musicas', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { musica_id, ordem, vs_id } = req.body;
    if (!musica_id) return res.status(400).json({ error: 'musica_id obrigatorio' });
    const newRowId = newId();
    await sheets.appendRow('EscalaMusicas', [newRowId, id, musica_id, String(ordem || 1), vs_id || '']);
    res.status(201).json({ id: newRowId });
  } catch (e) { next(e); }
});

router.delete('/:id/musicas/:escalaMusicaId', authRequired, async (req, res, next) => {
  try {
    const { id, escalaMusicaId } = req.params;
    const rows = await sheets.readSheet('EscalaMusicas');
    const items = rowsToObjects(rows);
    const entry = items.find(x => x.id === escalaMusicaId && x.escala_id === id);
    if (!entry) return res.status(404).json({ error: 'Musica da escala nao encontrada' });
    await sheets.deleteRow('EscalaMusicas', entry._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/publicar', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, enviar_email } = req.body;
    const novoStatus = status === 'rascunho' ? 'rascunho' : 'publicada';

    const rows = await sheets.readSheet('Escalas');
    const items = rowsToObjects(rows);
    const e = items.find(x => x.id === id);
    if (!e) return res.status(404).json({ error: 'Escala nao encontrada' });

    await sheets.updateRow('Escalas', e._rowIndex, [
      e.id, e.data_culto, e.tipo_culto, e.local, e.observacoes, novoStatus, e.criado_por, e.criado_em
    ]);

    let emailResult = null;
    if (novoStatus === 'publicada' && enviar_email !== false) {
      try {
        const notifications = require('./notifications');
        const baseUrl = (req.get('origin') || req.get('host') ? `${req.protocol}://${req.get('host')}` : '');
        emailResult = await notifications.sendScheduleEmails(id, baseUrl);
      } catch (e) {
        emailResult = { sent: 0, errors: [e.message] };
      }
    }

    res.json({ ok: true, status: novoStatus, email: emailResult });
  } catch (e) { next(e); }
});

router.put('/:id/musicas/:escalaMusicaId/vs', authRequired, async (req, res, next) => {
  try {
    const { id, escalaMusicaId } = req.params;
    const { vs_id } = req.body;
    const rows = await sheets.readSheet('EscalaMusicas');
    const items = rowsToObjects(rows);
    const entry = items.find(x => x.id === escalaMusicaId && x.escala_id === id);
    if (!entry) return res.status(404).json({ error: 'Musica da escala nao encontrada' });
    await sheets.updateRow('EscalaMusicas', entry._rowIndex, [
      entry.id, entry.escala_id, entry.musica_id, entry.ordem, vs_id || ''
    ]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
