#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('');
console.log('  ============================================');
console.log('    Gerar GOOGLE_CREDENTIALS_JSON para Render');
console.log('  ============================================');
console.log('');

const credPath = path.join(__dirname, '..', 'credentials.json');
if (!fs.existsSync(credPath)) {
  console.error('  ERRO: credentials.json nao encontrado em:', credPath);
  console.error('  Coloque o arquivo credentials.json na raiz do projeto.');
  process.exit(1);
}

const credContent = fs.readFileSync(credPath, 'utf8');

try {
  const parsed = JSON.parse(credContent);
  const singleLine = JSON.stringify(parsed);

  console.log('  Abaixo esta a string JSON em UMA linha so.');
  console.log('  Copie TUDO (sem as aspas externas) e cole no Render.');
  console.log('');
  console.log('  +' + '-'.repeat(78) + '+');
  console.log('  | ' + singleLine);
  console.log('  +' + '-'.repeat(78) + '+');
  console.log('');
  console.log('  Como usar:');
  console.log('  1. Selecione o conteudo entre os tracinhos (sem o |)');
  console.log('  2. No Render, va em Environment Variables');
  console.log('  3. Edite a variavel GOOGLE_CREDENTIALS_JSON');
  console.log('  4. Cole o valor e salve');
  console.log('');
  console.log('  client_email: ' + parsed.client_email);
  console.log('');
  console.log('  IMPORTANTE: o email acima precisa ter acesso de EDITOR');
  console.log('  na planilha Google: ' + (process.env.GOOGLE_SHEET_ID || '1HIBhZ6hDrq1ShA8170EgRBGlnEJha1Em5wFXjyryj20'));
  console.log('');
} catch (e) {
  console.error('  ERRO: credentials.json nao e um JSON valido:', e.message);
  process.exit(1);
}
