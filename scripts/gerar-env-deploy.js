#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const credPath = path.join(__dirname, '..', 'credentials.json');
if (!fs.existsSync(credPath)) {
  console.error('Arquivo credentials.json nao encontrado em:', credPath);
  process.exit(1);
}

const raw = fs.readFileSync(credPath, 'utf8');
const single = raw.replace(/\n/g, '').replace(/\r/g, '');

const envPath = path.join(__dirname, '..', '.env.deploy');
const envContent = `# Cole isto no painel de variaveis de ambiente do seu host (Glitch, Render, etc)
# NUNCA compartilhe este arquivo publicamente!
GOOGLE_CREDENTIALS_JSON='${single}'
GOOGLE_SHEET_ID=${process.env.GOOGLE_SHEET_ID || 'SEU_SHEET_ID_AQUI'}
JWT_SECRET=${process.env.JWT_SECRET || 'GERE_UMA_CHAVE_LONGA_E_ALEATORIA'}
`;

fs.writeFileSync(envPath, envContent, 'utf8');
console.log('Arquivo gerado:', envPath);
console.log('');
console.log('IMPORTANTE:');
console.log(' 1. Abra o arquivo .env.deploy (Bloco de Notas)');
console.log(' 2. Copie TODO o conteudo');
console.log(' 3. Cole nas variaveis de ambiente do seu host');
console.log(' 4. DELETE o arquivo .env.deploy depois de copiar');
console.log('');
console.log('AVISO: o arquivo .env.deploy contem segredos. Delete apos copiar!');
