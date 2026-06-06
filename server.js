require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const membersRoutes = require('./src/routes/members');
const songsRoutes = require('./src/routes/songs');
const schedulesRoutes = require('./src/routes/schedules');
const confirmationsRoutes = require('./src/routes/confirmations');
const vsRoutes = require('./src/routes/vs');
const multitrackRoutes = require('./src/routes/multitracks');
const configRoutes = require('./src/routes/config');
const reportsRoutes = require('./src/routes/reports');
const eventsRoutes = require('./src/routes/events');
const chatRoutes = require('./src/routes/chat');
const notificationsRoutes = require('./src/routes/notifications');
const ministeriosRoutes = require('./src/routes/ministerios');
const devocionaisRoutes = require('./src/routes/devocionais');

const app = express();
const PORT = process.env.PORT || 3000;

function checkSetup() {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
  const fullPath = path.resolve(credentialsPath);
  const hasCreds = fs.existsSync(fullPath);
  const sheetId = process.env.GOOGLE_SHEET_ID || '';
  const jwtSecret = process.env.JWT_SECRET || '';
  const isDefaultSecret = jwtSecret === 'troque-esta-chave-secreta-por-uma-longa-e-aleatoria' ||
                          jwtSecret === 'dev-secret-change-me' ||
                          jwtSecret === '';
  return {
    credentials_file: hasCreds,
    sheet_id: !!sheetId,
    jwt_secret: !!jwtSecret && !isDefaultSecret,
    node_modules: fs.existsSync(path.join(__dirname, 'node_modules'))
  };
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache');
    }
    if (filePath.endsWith('manifest.json')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

app.get('/api/setup/status', (req, res) => {
  const s = checkSetup();
  s.configured = s.credentials_file && s.sheet_id && s.jwt_secret;
  res.json(s);
});

app.post('/api/setup/test', async (req, res) => {
  try {
    const s = checkSetup();
    if (!s.credentials_file) throw new Error('Arquivo credentials.json nao encontrado na pasta do projeto.');
    if (!s.sheet_id) throw new Error('GOOGLE_SHEET_ID nao definido no .env');

    const sheets = require('./src/config/sheets');
    await sheets.getSheets();
    await sheets.ensureTabs();
    res.json({ ok: true, message: 'Conexao OK! Todas as abas foram criadas/verificadas na planilha.' });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/confirmations', confirmationsRoutes);
app.use('/api/vs', vsRoutes);
app.use('/api/multitracks', multitrackRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ministerios', ministeriosRoutes);
app.use('/api/devocionais', devocionaisRoutes);

app.get('/', (req, res) => {
  const s = checkSetup();
  if (!s.configured) return res.redirect('/setup.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/setup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

app.get('/onboarding.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

app.get('/VIDEO-TUTORIAL.md', (req, res) => {
  res.sendFile(path.join(__dirname, 'VIDEO-TUTORIAL.md'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  });
});

app.listen(PORT, () => {
  const s = checkSetup();
  console.log(`\n  Louva.Studio rodando em http://localhost:${PORT}`);
  if (!s.configured) {
    console.log(`  ⚠️  Sistema NAO configurado. Abra http://localhost:${PORT}/setup.html`);
  } else {
    console.log(`  ✓ Credenciais OK`);
    console.log(`  Planilha: ${process.env.GOOGLE_SHEET_ID}`);
  }
  console.log('');
});
