const express = require('express');
const router = express.Router();

const sheets = require('../config/sheets');
const { authRequired, adminRequired } = require('../middleware/auth');

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const [header, ...data] = rows;
  return data.map((row, idx) => {
    const obj = { _rowIndex: idx + 2 };
    header.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

const DEFAULTS = {
  nome_igreja: 'Ministerio de Louvor',
  logo_url: '',
  cidade: '',
  endereco: '',
  pastor: '',
  louvor_responsavel: '',
  contato: '',
  whatsapp: '',
  site: '',
  versiculo: '',
  mensagem_rodape: 'Que o louvor seja para a gloria de Deus!',
  cloudinary_cloud_name: '',
  cloudinary_upload_preset: ''
};

router.get('/', authRequired, async (req, res, next) => {
  try {
    const rows = await sheets.readSheet('Config');
    const items = rowsToObjects(rows);
    const config = { ...DEFAULTS };
    for (const it of items) {
      if (it.chave) config[it.chave] = it.valor;
    }
    res.json(config);
  } catch (e) { next(e); }
});

router.put('/', authRequired, adminRequired, async (req, res, next) => {
  try {
    const body = req.body || {};
    const keys = Object.keys(body);
    if (keys.length === 0) return res.json({ ok: true });

    const rows = await sheets.readSheet('Config');
    const items = rowsToObjects(rows);
    const atualizadoEm = new Date().toISOString();

    for (const k of keys) {
      if (!(k in DEFAULTS) && k !== 'criado_em') continue;
      const existing = items.find(i => i.chave === k);
      if (existing) {
        await sheets.updateRow('Config', existing._rowIndex, [k, String(body[k] ?? ''), atualizadoEm]);
      } else {
        await sheets.appendRow('Config', [k, String(body[k] ?? ''), atualizadoEm]);
      }
    }

    if (keys.some(k => k.startsWith('cloudinary_'))) {
      const { sheets: sh } = require('../config/sheets');
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
