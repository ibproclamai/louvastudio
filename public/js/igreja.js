document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireRole('admin');
  if (!user) return;
  Sidebar.setup(user, '/igreja.html');
  await loadExisting();
  bindEvents();
});

async function loadExisting() {
  try {
    const cfg = await API.get('/config');
    const form = document.getElementById('form-igreja');
    Object.keys(cfg).forEach(k => {
      const el = form.elements[k];
      if (el) el.value = cfg[k] || '';
    });
  } catch (e) {
    console.error(e);
  }
}

function bindEvents() {
  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (confirm('Cancelar e voltar ao inicio? Os dados não serao salvos.')) {
      location.href = '/dashboard.html';
    }
  });
  document.getElementById('form-igreja').addEventListener('submit', save);
}

async function save(e) {
  e.preventDefault();
  const form = e.target;
  const body = {};
  ['nome_igreja', 'cidade', 'endereco', 'pastor', 'louvor_responsavel', 'contato', 'whatsapp', 'site', 'logo_url', 'versiculo', 'mensagem_rodape']
    .forEach(k => { body[k] = form.elements[k]?.value?.trim() || ''; });

  if (!body.nome_igreja) {
    alert('O nome da igreja é obrigatório.');
    return;
  }

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  try {
    await API.put('/config', body);
    alert('Igreja cadastrada com sucesso! Agora você pode cadastrar os membros.');
    location.href = '/members.html';
  } catch (err) {
    alert('Erro: ' + (err.message || 'Falha ao salvar'));
    btn.disabled = false;
    btn.textContent = 'Salvar e ir para o sistema';
  }
}
