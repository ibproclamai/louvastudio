const express = require('express');
const sheets = require('../config/sheets');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

async function loadAll() {
  const [m, s, e, em, mu, conf, vs] = await Promise.all([
    sheets.readSheet('Membros'),
    sheets.readSheet('Musicas'),
    sheets.readSheet('Escalas'),
    sheets.readSheet('EscalaMembros'),
    sheets.readSheet('EscalaMusicas'),
    sheets.readSheet('EscalaMembros'),
    sheets.readSheet('VS')
  ]);
  return {
    membros: rowsToObjects(m),
    musicas: rowsToObjects(s),
    escalas: rowsToObjects(e),
    escalaMembros: rowsToObjects(em),
    escalaMusicas: rowsToObjects(mu),
    vs: rowsToObjects(vs)
  };
}

router.get('/overview', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const totalMembros = d.membros.filter(m => m.ativo !== 'false').length;
    const totalMusicas = d.musicas.length;
    const totalEscalas = d.escalas.length;
    const escalasPublicadas = d.escalas.filter(e => e.status === 'publicada').length;
    const totalVS = d.vs.length;

    const confs = { confirmado: 0, recusado: 0, talvez: 0, pendente: 0 };
    d.escalaMembros.forEach(em => {
      const c = em.confirmado || 'pendente';
      confs[c] = (confs[c] || 0) + 1;
    });
    const totalConfirmacoes = d.escalaMembros.length;
    const taxaConfirmacao = totalConfirmacoes > 0
      ? Math.round((confs.confirmado / totalConfirmacoes) * 100)
      : 0;

    res.json({
      membros: totalMembros,
      musicas: totalMusicas,
      escalas: totalEscalas,
      escalasPublicadas,
      vs: totalVS,
      confirmacoes: { ...confs, total: totalConfirmacoes, taxa: taxaConfirmacao }
    });
  } catch (e) { next(e); }
});

router.get('/top-songs', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const counts = {};
    d.escalaMusicas.forEach(em => {
      counts[em.musica_id] = (counts[em.musica_id] || 0) + 1;
    });
    const top = Object.entries(counts)
      .map(([id, count]) => {
        const song = d.musicas.find(s => s.id === id);
        return {
          id,
          titulo: song?.titulo || '(musica removida)',
          artista: song?.artista || '',
          tom: song?.tom || '',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    res.json(top);
  } catch (e) { next(e); }
});

router.get('/top-members', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const counts = {};
    const confs = {};
    d.escalaMembros.forEach(em => {
      counts[em.membro_id] = (counts[em.membro_id] || 0) + 1;
      if (em.confirmado === 'confirmado') confs[em.membro_id] = (confs[em.membro_id] || 0) + 1;
    });
    const top = Object.entries(counts)
      .map(([id, count]) => {
        const m = d.membros.find(mm => mm.id === id);
        return {
          id,
          nome: m?.nome || '(membro removido)',
          funcao: m?.funcao || '',
          count,
          confirmados: confs[id] || 0,
          taxa: count > 0 ? Math.round((confs[id] || 0) / count * 100) : 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    res.json(top);
  } catch (e) { next(e); }
});

router.get('/schedules-by-month', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const counts = {};
    d.escalas.forEach(e => {
      if (!e.data_culto) return;
      const mes = e.data_culto.substring(0, 7);
      counts[mes] = (counts[mes] || 0) + 1;
    });
    const result = Object.entries(counts)
      .map(([mes, count]) => ({ mes, count }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/members-by-function', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const counts = {};
    d.membros.forEach(m => {
      if (m.ativo === 'false') return;
      const f = m.funcao || 'Sem funcao';
      counts[f] = (counts[f] || 0) + 1;
    });
    const result = Object.entries(counts)
      .map(([funcao, count]) => ({ funcao, count }))
      .sort((a, b) => b.count - a.count);
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/songs-by-key', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const counts = {};
    d.musicas.forEach(s => {
      const t = s.tom || 'Sem tom';
      counts[t] = (counts[t] || 0) + 1;
    });
    const result = Object.entries(counts)
      .map(([tom, count]) => ({ tom, count }))
      .sort((a, b) => b.count - a.count);
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/pending-confirmations', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const pending = [];
    d.escalaMembros.forEach(em => {
      if (em.confirmado && em.confirmado !== 'pendente' && em.confirmado !== '') return;
      const escala = d.escalas.find(e => e.id === em.escala_id);
      if (!escala) return;
      const membro = d.membros.find(m => m.id === em.membro_id);
      if (!membro) return;
      pending.push({
        escala_id: em.escala_id,
        membro_id: em.membro_id,
        escala_data: escala.data_culto,
        escala_tipo: escala.tipo_culto,
        membro_nome: membro.nome,
        funcao: em.funcao_na_escala || membro.funcao || ''
      });
    });
    pending.sort((a, b) => a.escala_data.localeCompare(b.escala_data));
    res.json(pending);
  } catch (e) { next(e); }
});

router.get('/recent-activity', adminRequired, async (req, res, next) => {
  try {
    const d = await loadAll();
    const events = [];
    d.escalas.slice(-10).forEach(e => {
      events.push({
        tipo: 'escala',
        data: e.criado_em || '',
        titulo: e.tipo_culto || 'Culto',
        subtitulo: e.data_culto
      });
    });
    d.musicas.slice(-10).forEach(s => {
      events.push({
        tipo: 'musica',
        data: s.criado_em || '',
        titulo: s.titulo,
        subtitulo: s.artista || ''
      });
    });
    d.membros.slice(-10).forEach(m => {
      events.push({
        tipo: 'membro',
        data: m.criado_em || '',
        titulo: m.nome,
        subtitulo: m.funcao || ''
      });
    });
    events.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    res.json(events.slice(0, 15));
  } catch (e) { next(e); }
});

module.exports = router;
