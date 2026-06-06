const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let authClient = null;
let sheetsClient = null;

function getAuth() {
  if (authClient) return authClient;

  let credentials;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
      throw new Error('GOOGLE_CREDENTIALS_JSON invalido: ' + e.message);
    }
  } else {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    const fullPath = path.resolve(credentialsPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `Arquivo de credenciais nao encontrado em: ${fullPath}. ` +
        `Siga as instrucoes do README para gerar o credentials.json da conta de servico do Google.`
      );
    }
    credentials = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }

  authClient = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES
  });

  return authClient;
}

async function getSheets() {
  if (sheetsClient) return sheetsClient;

  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID nao configurado no .env');
  }

  const auth = getAuth();
  const client = await auth.getClient();

  sheetsClient = google.sheets({ version: 'v4', auth: client });
  return sheetsClient;
}

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID;
}

async function readSheet(tabName, range = 'A:Z') {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${tabName}!${range}`
  });
  return res.data.values || [];
}

async function appendRow(tabName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${tabName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] }
  });
}

async function updateRow(tabName, rowIndex, values) {
  const sheets = await getSheets();
  const lastCol = String.fromCharCode(64 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${tabName}!A${rowIndex}:${lastCol}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });
}

async function deleteRow(tabName, rowIndex) {
  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: getSheetId() });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === tabName);
  if (!sheet) throw new Error(`Aba "${tabName}" nao encontrada`);

  const sheetId = sheet.properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });
}

async function ensureTabs() {
  const required = [
    { name: 'Usuarios', headers: ['id', 'nome', 'email', 'senha_hash', 'perfil', 'criado_em'] },
    { name: 'Membros', headers: ['id', 'nome', 'funcao', 'telefone', 'email', 'disponibilidade', 'ativo', 'criado_em'] },
    { name: 'Musicas', headers: ['id', 'titulo', 'artista', 'tom', 'bpm', 'cifra_url', 'video_url', 'observacoes', 'criado_em'] },
    { name: 'Escalas', headers: ['id', 'data_culto', 'tipo_culto', 'local', 'observacoes', 'status', 'criado_por', 'criado_em'] },
    { name: 'EscalaMembros', headers: ['id', 'escala_id', 'membro_id', 'funcao_na_escala', 'confirmado'] },
    { name: 'EscalaMusicas', headers: ['id', 'escala_id', 'musica_id', 'ordem', 'vs_id'] },
    { name: 'VS', headers: ['id', 'musica_id', 'nome', 'tipo', 'url', 'tom', 'bpm', 'descricao', 'criado_em'] },
    { name: 'MultitrackTracks', headers: ['id', 'vs_id', 'ordem', 'instrumento', 'label', 'url', 'volume_padrao', 'mutado_padrao', 'criado_em'] },
    { name: 'Eventos', headers: ['id', 'data', 'hora_inicio', 'hora_fim', 'tipo', 'titulo', 'local', 'descricao', 'cor', 'criado_por', 'criado_em'] },
    { name: 'EventoParticipantes', headers: ['id', 'evento_id', 'membro_id', 'funcao', 'confirmado'] },
    { name: 'ChatMessages', headers: ['id', 'remetente_id', 'canal', 'mensagem', 'criado_em'] },
    { name: 'Config', headers: ['chave', 'valor', 'atualizado_em'] }
  ];

  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: getSheetId() });
  const existing = new Set(spreadsheet.data.sheets.map(s => s.properties.title));

  const requests = [];
  for (const t of required) {
    if (!existing.has(t.name)) {
      requests.push({ addSheet: { properties: { title: t.name } } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSheetId(),
      requestBody: { requests }
    });
  }

  for (const t of required) {
    const rows = await readSheet(t.name, 'A1:Z1');
    if (rows.length === 0) {
      await appendRow(t.name, t.headers);
    }
  }
}

module.exports = {
  getSheets,
  getSheetId,
  readSheet,
  appendRow,
  updateRow,
  deleteRow,
  ensureTabs
};
