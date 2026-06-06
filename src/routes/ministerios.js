const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const sheets = require('../config/sheets');
const { authRequired, adminRequired } = require('../middleware/auth');

function newId() { return crypto.randomBytes(8).toString('hex'); }

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

async function userIsMemberOf(userId, ministerioId) {
  const userRows = await sheets.readSheet('Usuarios');
  const [uh, ...ud] = userRows;
  const user = ud.find((r, i) => r[0] === userId);
  if (!user) return false;
  if (user[5] === ministerioId) return true;
  const mmRows = await sheets.readSheet('MinisterioMembros');
  const [mh, ...md] = mmRows;
  return md.some(r => r[1] === ministerioId && r[2] === userId && r[5] === 'true');
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Ministerios');
    res.json(rowsToObjects(rows));
  } catch (e) { next(e); }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const userRows = await sheets.readSheet('Usuarios');
    const [uh, ...ud] = userRows;
    const user = ud.find(r => r[0] === req.user.id);
    if (!user || !user[5]) return res.json(null);

    const minRows = await sheets.readSheet('Ministerios');
    const [mh, ...md] = minRows;
    const min = md.find(r => r[0] === user[5]);
    if (!min) return res.json(null);
    res.json({
      id: min[0], nome: min[1], codigo_convite: min[2], admin_id: min[3],
      descricao: min[4], criado_em: min[5]
    });
  } catch (e) { next(e); }
});

router.get('/join/:code', authRequired, async (req, res, next) => {
  try {
    const code = (req.params.code || '').toUpperCase();
    const rows = await sheets.readSheet('Ministerios');
    const [h, ...data] = rows;
    const min = data.find(r => r[2] && r[2].toUpperCase() === code);
    if (!min) return res.status(404).json({ error: 'Codigo de convite invalido' });

    const userRows = await sheets.readSheet('Usuarios');
    const [uh, ...ud] = userRows;
    const userIdx = ud.findIndex(r => r[0] === req.user.id);
    if (userIdx === -1) return res.status(404).json({ error: 'Usuario nao encontrado' });

    const newRow = [...ud[userIdx]];
    newRow[5] = min[0];
    const userRowIndex = userIdx + 2;
    await sheets.updateRow('Usuarios', userRowIndex, newRow);

    let mmRows = await sheets.readSheet('MinisterioMembros');
    if (mmRows.length === 0) {
      await sheets.appendRow('MinisterioMembros', ['id', 'ministerio_id', 'usuario_id', 'perfil', 'funcao', 'ativo', 'entrou_em']);
      mmRows = [['id', 'ministerio_id', 'usuario_id', 'perfil', 'funcao', 'ativo', 'entrou_em']];
    }
    const already = rowsToObjects(mmRows).some(r => r.ministerio_id === min[0] && r.usuario_id === req.user.id);
    if (!already) {
      await sheets.appendRow('MinisterioMembros', [
        newId(), min[0], req.user.id, 'membro', '', 'true', new Date().toISOString()
      ]);
    }

    res.json({
      ministerio: { id: min[0], nome: min[1], codigo_convite: min[2], descricao: min[4] }
    });
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome eh obrigatorio' });

    const id = newId();
    const codigo = generateInviteCode();
    await sheets.appendRow('Ministerios', [
      id, nome, codigo, req.user.id, descricao || '', new Date().toISOString()
    ]);

    const userRows = await sheets.readSheet('Usuarios');
    const [uh, ...ud] = userRows;
    const userIdx = ud.findIndex(r => r[0] === req.user.id);
    if (userIdx >= 0) {
      const newRow = [...ud[userIdx]];
      newRow[5] = id;
      await sheets.updateRow('Usuarios', userIdx + 2, newRow);
    }

    let mmRows = await sheets.readSheet('MinisterioMembros');
    if (mmRows.length === 0) {
      await sheets.appendRow('MinisterioMembros', ['id', 'ministerio_id', 'usuario_id', 'perfil', 'funcao', 'ativo', 'entrou_em']);
    }
    await sheets.appendRow('MinisterioMembros', [
      newId(), id, req.user.id, 'admin', '', 'true', new Date().toISOString()
    ]);

    res.json({ id, nome, codigo_convite: codigo, descricao: descricao || '' });
  } catch (e) { next(e); }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Ministerios');
    const [h, ...data] = rows;
    const idx = data.findIndex(r => r[0] === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ministerio nao encontrado' });
    const min = data[idx];
    if (min[3] !== req.user.id && req.userPerfil !== 'admin') {
      return res.status(403).json({ error: 'Apenas o admin pode editar' });
    }
    const updated = [...min];
    if (req.body.nome !== undefined) updated[1] = req.body.nome;
    if (req.body.descricao !== undefined) updated[4] = req.body.descricao;
    await sheets.updateRow('Ministerios', idx + 2, updated);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/regenerate-code', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Ministerios');
    const [h, ...data] = rows;
    const idx = data.findIndex(r => r[0] === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Ministerio nao encontrado' });
    const min = data[idx];
    if (min[3] !== req.user.id && req.userPerfil !== 'admin') {
      return res.status(403).json({ error: 'Apenas o admin pode gerar novo codigo' });
    }
    const updated = [...min];
    updated[2] = generateInviteCode();
    await sheets.updateRow('Ministerios', idx + 2, updated);
    res.json({ codigo_convite: updated[2] });
  } catch (e) { next(e); }
});

router.get('/:id/membros', authRequired, async (req, res, next) => {
  try {
    const isMember = await userIsMemberOf(req.user.id, req.params.id);
    if (!isMember) return res.status(403).json({ error: 'Acesso negado' });

    const mmRows = await sheets.readSheet('MinisterioMembros');
    const membros = rowsToObjects(mmRows).filter(m => m.ministerio_id === req.params.id);

    const userRows = await sheets.readSheet('Usuarios');
    const [uh, ...ud] = userRows;
    const result = membros.map(m => {
      const u = ud.find(r => r[0] === m.usuario_id);
      return {
        id: m.id,
        usuario_id: m.usuario_id,
        perfil: m.perfil,
        funcao: m.funcao,
        ativo: m.ativo,
        nome: u ? u[1] : '(removido)',
        email: u ? u[2] : ''
      };
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.delete('/:id/membros/:usuarioId', authRequired, adminRequired, async (req, res, next) => {
  try {
    const mmRows = await sheets.readSheet('MinisterioMembros');
    const objs = rowsToObjects(mmRows);
    const idx = objs.findIndex(m => m.ministerio_id === req.params.id && m.usuario_id === req.params.usuarioId);
    if (idx === -1) return res.status(404).json({ error: 'Membro nao encontrado' });
    await sheets.deleteRow('MinisterioMembros', objs[idx]._rowIndex);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
