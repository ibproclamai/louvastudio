#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const credPath = path.join(__dirname, '..', 'credentials.json');
if (!fs.existsSync(credPath)) {
  console.error('ERRO: credentials.json nao encontrado');
  process.exit(1);
}

const cred = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const singleLine = JSON.stringify(cred);

const outPath = path.join(__dirname, '..', 'CREDENCIAL-RENDER.txt');
fs.writeFileSync(outPath, singleLine, 'utf8');

console.log('');
console.log('  ============================================');
console.log('  CREDENCIAL GERADA COM SUCESSO!');
console.log('  ============================================');
console.log('');
console.log('  Arquivo criado: CREDENCIAL-RENDER.txt');
console.log('  Tamanho: ' + (singleLine.length) + ' caracteres');
console.log('');
console.log('  client_email: ' + cred.client_email);
console.log('');
console.log('  ============================================');
console.log('  PROXIMOS PASSOS (3 cliques):');
console.log('  ============================================');
console.log('');
console.log('  1. Abra o arquivo CREDENCIAL-RENDER.txt no Bloco de Notas');
console.log('     (duplo clique no arquivo)');
console.log('');
console.log('  2. Pressione Ctrl+A (selecionar tudo) e Ctrl+C (copiar)');
console.log('');
console.log('  3. Va no Render: dashboard.render.com');
console.log('     - Clique no servico louva-studio');
console.log('     - Menu lateral: Environment');
console.log('     - Edite a variavel GOOGLE_CREDENTIALS_JSON');
console.log('     - Apague o valor atual e cole (Ctrl+V) o novo');
console.log('     - Save Changes');
console.log('');
console.log('  4. Aguarde 1-2 minutos o Render reiniciar');
console.log('');
console.log('  5. Tente cadastrar de novo no site');
console.log('');
console.log('  ============================================');
console.log('  LEMBRE-SE: compartilhe a planilha Google com:');
console.log('  ' + cred.client_email);
console.log('  (permissao: EDITOR)');
console.log('  ============================================');
console.log('');

if (process.platform === 'win32') {
  const { exec } = require('child_process');
  setTimeout(() => {
    exec(`start notepad.exe "${outPath}"`, (err) => {
      if (err) console.log('  (Abra manualmente o arquivo CREDENCIAL-RENDER.txt)');
    });
  }, 1000);
}
