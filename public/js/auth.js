document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + '-form').classList.add('active');
  });
});

function notify(msg, type = 'error') {
  console[type === 'error' ? 'error' : 'log']('[Louva.Studio]', msg);
  if (typeof showAlert === 'function') {
    showAlert(msg, type);
  } else {
    alert(msg);
  }
}

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd);
  try {
    const result = await API.post('/auth/login', body);
    if (!result || !result.token) {
      notify('Resposta inesperada do servidor: ' + JSON.stringify(result));
      return;
    }
    API.setToken(result.token);
    location.href = '/dashboard.html';
  } catch (err) {
    notify('Erro ao entrar: ' + err.message);
  }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd);
  if (!body.nome || !body.email || !body.senha) {
    notify('Preencha todos os campos.');
    return;
    }
  if ((body.senha || '').length < 6) {
    notify('A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  try {
    const result = await API.post('/auth/register', body);
    if (!result || !result.token) {
      notify('Resposta inesperada do servidor: ' + JSON.stringify(result));
      return;
    }
    API.setToken(result.token);
    location.href = '/dashboard.html';
  } catch (err) {
    notify('Erro ao cadastrar: ' + err.message);
  }
});

if (typeof API !== 'undefined' && API.getToken && API.getToken()) {
  location.href = '/dashboard.html';
} else {
  console.log('[Louva.Studio] api.js carregado, pronto para login/cadastro');
}
