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

router.get('/minhas', authRequired, async (req, res, next) => {
  try {
    const [emRows, scRows, membersRows] = await Promise.all([
      sheets.readSheet('EscalaMembros'),
      sheets.readSheet('Escalas'),
      sheets.readSheet('Membros')
    ]);
    const em = rowsToObjects(emRows);
    const escalas = rowsToObjects(scRows);
    const members = rowsToObjects(membersRows);

    const meEmail = (req.user.email || '').toLowerCase();
    const meMember = members.find(m => (m.email || '').toLowerCase() === meEmail);
    if (!meMember) return res.json([]);

    const isAdminOrLider = req.user.perfil === 'admin' || req.user.perfil === 'lider';
    const myEntries = em.filter(x => x.membro_id === meMember.id);
    res.json(myEntries.map(x => {
      const esc = escalas.find(e => e.id === x.escala_id) || {};
      const status = esc.status || 'rascunho';
      if (!isAdminOrLider && status !== 'publicada') return null;
      return {
        ...x,
        data_culto: esc.data_culto,
        tipo_culto: esc.tipo_culto,
        local: esc.local,
        status
      };
    }).filter(Boolean));
  } catch (e) { next(e); }
});

router.post('/:escalaMembroId/confirmar', authRequired, async (req, res, next) => {
  try {
    const { escalaMembroId } = req.params;
    const { status } = req.body;
    if (!['confirmado', 'recusado', 'talvez'].includes(status)) {
      return res.status(400).json({ error: 'status invalido' });
    }

    const rows = await sheets.readSheet('EscalaMembros');
    const items = rowsToObjects(rows);
    const entry = items.find(x => x.id === escalaMembroId);
    if (!entry) return res.status(404).json({ error: 'Entrada nao encontrada' });

    const updated = [
      entry.id, entry.escala_id, entry.membro_id, entry.funcao_na_escala, status
    ];
    await sheets.updateRow('EscalaMembros', entry._rowIndex, updated);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
