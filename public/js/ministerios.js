(function() {
  let currentMinisterio = null;
  let currentEditingId = null;

  async function init() {
    const user = await requireAuth();
    Sidebar.setup(user);
    setupEvents();
    await loadMinisterio();
  }

  function setupEvents() {
    document.getElementById('btn-new-ministerio').addEventListener('click', () => {
      currentEditingId = null;
      document.getElementById('modal-min-title').textContent = 'Novo Ministério';
      document.getElementById('form-ministerio').reset();
      openModal('modal-ministerio');
    });
    document.getElementById('btn-create-first').addEventListener('click', () => {
      document.getElementById('btn-new-ministerio').click();
    });
    document.getElementById('btn-join').addEventListener('click', () => {
      document.getElementById('form-join').reset();
      openModal('modal-join');
    });
    document.getElementById('form-ministerio').addEventListener('submit', saveMinisterio);
    document.getElementById('form-join').addEventListener('submit', joinMinisterio);
    document.getElementById('btn-regen-code').addEventListener('click', regenerateCode);
    document.getElementById('btn-copy-code').addEventListener('click', () => {
      const code = document.getElementById('min-codigo').textContent;
      navigator.clipboard.writeText(code);
      toast('Código copiado!', 'success');
    });
  }

  async function loadMinisterio() {
    try {
      const min = await API.get('/ministerios/me');
      if (!min) {
        document.getElementById('ministerio-section').classList.add('hidden');
        document.getElementById('no-ministerio').classList.remove('hidden');
        return;
      }
      currentMinisterio = min;
      document.getElementById('no-ministerio').classList.add('hidden');
      document.getElementById('ministerio-section').classList.remove('hidden');
      document.getElementById('min-nome').textContent = min.nome;
      document.getElementById('min-descricao').textContent = min.descricao || '';
      document.getElementById('min-codigo').textContent = min.codigo_convite;
      await loadMembros();
    } catch (e) {
      console.error(e);
      toast('Erro ao carregar ministério', 'error');
    }
  }

  async function loadMembros() {
    if (!currentMinisterio) return;
    try {
      const membros = await API.get(`/ministerios/${currentMinisterio.id}/membros`);
      const cont = document.getElementById('min-membros-list');
      if (membros.length === 0) {
        cont.innerHTML = '<p class="empty">Nenhum membro no ministério ainda</p>';
        return;
      }
      cont.innerHTML = membros.map(m => `
        <div class="card">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div class="sidebar-avatar" style="width:40px; height:40px;">${(m.nome || '?').slice(0,2).toUpperCase()}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600;">${escapeHtml(m.nome)}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(m.email || '')}</div>
            </div>
            <span class="badge ${m.perfil === 'admin' ? 'badge-success' : ''}">${m.perfil}</span>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  async function saveMinisterio(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
      await API.post('/ministerios', data);
      toast('Ministério criado!', 'success');
      closeModal('modal-ministerio');
      await loadMinisterio();
    } catch (err) {
      toast(err.message || 'Erro ao criar', 'error');
    }
  }

  async function joinMinisterio(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const codigo = fd.get('codigo');
    try {
      const res = await API.get(`/ministerios/join/${encodeURIComponent(codigo.toUpperCase())}`);
      toast(`Bem-vindo ao ${res.ministerio.nome}!`, 'success');
      closeModal('modal-join');
      await loadMinisterio();
    } catch (err) {
      toast(err.message || 'Código inválido', 'error');
    }
  }

  async function regenerateCode() {
    if (!currentMinisterio) return;
    if (!confirm('Gerar novo código? O anterior deixará de funcionar.')) return;
    try {
      const res = await API.post(`/ministerios/${currentMinisterio.id}/regenerate-code`, {});
      document.getElementById('min-codigo').textContent = res.codigo_convite;
      currentMinisterio.codigo_convite = res.codigo_convite;
      toast('Novo código gerado!', 'success');
    } catch (err) {
      toast(err.message || 'Erro', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
