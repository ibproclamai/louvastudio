(async function () {
  document.getElementById('btn-recheck').addEventListener('click', checkStatus);
  document.getElementById('btn-test').addEventListener('click', testConnection);

  document.querySelectorAll('.step-head').forEach(h => {
    h.addEventListener('click', () => {
      h.parentElement.classList.toggle('open');
    });
  });

  await checkStatus();
})();

async function checkStatus() {
  const bar = document.getElementById('status-bar');
  const icon = document.getElementById('status-icon');
  const text = document.getElementById('status-text');

  bar.className = 'status-bar checking';
  icon.innerHTML = '&#8987;';
  text.textContent = 'Verificando configuracao...';

  try {
    const s = await fetch('/api/setup/status').then(r => r.json());
    updateUI(s);
  } catch (e) {
    bar.className = 'status-bar error';
    icon.innerHTML = '&#10060;';
    text.textContent = 'Erro ao verificar: ' + e.message;
  }
}

function updateUI(s) {
  const bar = document.getElementById('status-bar');
  const icon = document.getElementById('status-icon');
  const text = document.getElementById('status-text');
  const goLogin = document.getElementById('go-login');

  setStep('node_modules', s.node_modules, s.node_modules ? 'Dependencias instaladas' : 'Dependencias nao instaladas - rode o iniciar.bat');
  setStep('credentials_file', s.credentials_file, s.credentials_file ? 'Arquivo credentials.json encontrado' : 'Arquivo credentials.json nao encontrado na pasta do projeto');
  setStep('sheet_id', s.sheet_id, s.sheet_id ? 'GOOGLE_SHEET_ID configurado' : 'GOOGLE_SHEET_ID nao configurado no .env');
  setStep('jwt_secret', s.jwt_secret, s.jwt_secret ? 'JWT_SECRET configurado' : 'JWT_SECRET nao foi alterado (ainda usa valor padrao)');

  if (s.configured) {
    bar.className = 'status-bar ok';
    icon.innerHTML = '&#9989;';
    text.textContent = 'Tudo configurado! Pode usar o sistema.';
    goLogin.classList.remove('hidden');
  } else {
    bar.className = 'status-bar error';
    icon.innerHTML = '&#9888;&#65039;';
    text.textContent = 'Faltam passos. Siga o guia abaixo.';
    goLogin.classList.add('hidden');

    if (!s.node_modules) {
      markStep(1, false);
    } else {
      markStep(1, true);
    }
    markStepError(!s.credentials_file, 5, s.credentials_file);
    markStepError(!s.sheet_id, 8, s.sheet_id);
    markStepError(!s.jwt_secret, 8, s.jwt_secret);
  }
}

function setStep(key, ok, message) {
  document.querySelectorAll(`[data-status="${key}"]`).forEach(el => {
    if (el.classList.contains('step-status')) {
      el.classList.remove('pending', 'ok', 'error');
      el.classList.add(ok ? 'ok' : 'pending');
      el.innerHTML = ok ? '&#9989;' : '&#8987;';
    } else {
      el.innerHTML = el.innerHTML.replace(/<b>.*?<\/b>/, '<b>' + escapeHtml(message) + '</b>');
    }
  });
}

function markStep(stepNum, done) {
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  if (!step) return;
  step.classList.toggle('done', done);
  const status = step.querySelector('.step-status');
  if (status && !status.dataset.status) {
    status.classList.remove('pending', 'ok', 'error');
    status.classList.add(done ? 'ok' : 'pending');
    status.innerHTML = done ? '&#9989;' : '&#8987;';
  }
}

function markStepError(hasError, stepNum, ok) {
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  if (!step) return;
  const has = hasError === undefined ? !ok : hasError;
  step.classList.toggle('error', has);
  step.classList.toggle('done', !has && ok);
  const status = step.querySelector('.step-status');
  if (status && !status.dataset.status) {
    status.classList.remove('pending', 'ok', 'error');
    status.classList.add(ok ? 'ok' : (has ? 'error' : 'pending'));
    status.innerHTML = ok ? '&#9989;' : (has ? '&#10060;' : '&#8987;');
  }
}

async function testConnection() {
  const btn = document.getElementById('btn-test');
  const result = document.getElementById('test-result');
  const goLogin = document.getElementById('go-login');

  btn.disabled = true;
  btn.textContent = 'Testando...';
  result.className = 'alert hidden';

  try {
    const res = await fetch('/api/setup/test', { method: 'POST' });
    const data = await res.json();

    if (data.ok) {
      result.className = 'alert alert-success';
      result.innerHTML = '&#9989; ' + escapeHtml(data.message);
      goLogin.classList.remove('hidden');
      setTimeout(() => checkStatus(), 500);
    } else {
      result.className = 'alert alert-error';
      result.innerHTML = '<b>&#10060; Erro:</b><br>' + escapeHtml(data.error);
    }
    result.classList.remove('hidden');
  } catch (e) {
    result.className = 'alert alert-error';
    result.innerHTML = '<b>&#10060; Erro:</b> ' + escapeHtml(e.message);
    result.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Testar conexao com Google Sheets';
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
