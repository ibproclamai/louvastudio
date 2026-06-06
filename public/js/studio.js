let allVS = [];
let allSongs = [];
let allUsers = [];
let currentUser = null;

const TIPOS_LABEL = {
  playback: 'Playback',
  stem: 'Stem',
  metronomo: 'Metronomo',
  click: 'Click',
  ensaio: 'Ensaio',
  guia: 'Guia',
  outro: 'Outro'
};

(async function () {
  currentUser = await loadUser();
  if (!currentUser) return;
  if (currentUser.perfil !== 'admin') {
    document.querySelector('main').innerHTML = '<p class="empty">Acesso restrito a administradores.</p>';
    return;
  }
  setupLogout();

  document.querySelectorAll('.studio-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.stab));
  });

  document.getElementById('btn-new-vs').addEventListener('click', () => openVSForm());
  document.getElementById('form-vs').addEventListener('submit', saveVS);
  document.getElementById('search-vs').addEventListener('input', renderVS);
  document.getElementById('filter-vs-song').addEventListener('change', renderVS);
  document.getElementById('filter-vs-tipo').addEventListener('change', renderVS);
  document.getElementById('form-config').addEventListener('submit', saveConfig);

  await Promise.all([loadSongs(), loadVS(), loadUsers(), loadConfig()]);

  const params = new URLSearchParams(location.search);
  const songId = params.get('song');
  if (songId) {
    document.getElementById('filter-vs-song').value = songId;
    renderVS();
    openVSForm();
    setTimeout(() => {
      const sel = document.querySelector('#form-vs select[name="musica_id"]');
      if (sel) sel.value = songId;
    }, 50);
  }
})();

function switchTab(name) {
  document.querySelectorAll('.studio-tab').forEach(t => t.classList.toggle('active', t.dataset.stab === name));
  document.querySelectorAll('.studio-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('panel-' + name).classList.remove('hidden');
}

async function loadSongs() {
  try {
    allSongs = await API.get('/songs');
    const sel = document.getElementById('filter-vs-song');
    const formSel = document.querySelector('#form-vs select[name="musica_id"]');
    const opts = '<option value="">Todas as musicas</option>' +
      allSongs.map(s => `<option value="${s.id}">${escapeHtml(s.titulo)}${s.artista ? ' - ' + escapeHtml(s.artista) : ''}</option>`).join('');
    sel.innerHTML = opts;
    formSel.innerHTML = '<option value="">Selecione a musica...</option>' +
      allSongs.map(s => `<option value="${s.id}">${escapeHtml(s.titulo)}${s.artista ? ' - ' + escapeHtml(s.artista) : ''}</option>`).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadVS() {
  try {
    allVS = await API.get('/vs');
    renderVS();
  } catch (e) {
    document.getElementById('vs-list').innerHTML = `<p class="empty">Erro: ${escapeHtml(e.message)}</p>`;
  }
}

function renderVS() {
  const q = (document.getElementById('search-vs').value || '').toLowerCase();
  const songFilter = document.getElementById('filter-vs-song').value;
  const tipoFilter = document.getElementById('filter-vs-tipo').value;

  const filtered = allVS.filter(v => {
    if (songFilter && v.musica_id !== songFilter) return false;
    if (tipoFilter && v.tipo !== tipoFilter) return false;
    if (q && !(v.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const container = document.getElementById('vs-list');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty">Nenhuma trilha VS cadastrada.</p>';
    return;
  }

  container.innerHTML = filtered.map(v => {
    const song = allSongs.find(s => s.id === v.musica_id);
    return `
      <div class="card vs-card">
        <div class="vs-card-head">
          <div>
            <div class="vs-card-title">${escapeHtml(v.nome)}</div>
            <div class="vs-card-song">${song ? escapeHtml(song.titulo) : '(musica removida)'}</div>
          </div>
          <span class="badge badge-${escapeHtml(v.tipo)}">${TIPOS_LABEL[v.tipo] || v.tipo}</span>
        </div>
        ${v.descricao ? `<div class="card-body">${escapeHtml(v.descricao)}</div>` : ''}
        <div class="vs-card-meta">
          ${v.tom ? '<span class="badge badge-primary">Tom: ' + escapeHtml(v.tom) + '</span>' : ''}
          ${v.bpm ? '<span class="badge">' + escapeHtml(v.bpm) + ' BPM</span>' : ''}
        </div>
        <audio class="vs-audio" controls preload="none" src="${escapeHtml(v.url)}"></audio>
        <a class="vs-link" href="${escapeHtml(v.url)}" target="_blank">Abrir link original</a>
        <div class="card-actions">
          <button class="btn btn-sm" onclick="openVSForm('${v.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVS('${v.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

window.openVSForm = function (id) {
  document.getElementById('modal-vs-title').textContent = id ? 'Editar trilha VS' : 'Nova trilha VS';
  const form = document.getElementById('form-vs');
  form.reset();
  if (id) {
    const v = allVS.find(x => x.id === id);
    if (v) {
      form.id.value = v.id;
      form.musica_id.value = v.musica_id;
      form.nome.value = v.nome || '';
      form.tipo.value = v.tipo || 'playback';
      form.url.value = v.url || '';
      form.tom.value = v.tom || '';
      form.bpm.value = v.bpm || '';
      form.descricao.value = v.descricao || '';
    }
  }
  openModal('modal-vs');
};

async function saveVS(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const body = {
    musica_id: form.musica_id.value,
    nome: form.nome.value.trim(),
    tipo: form.tipo.value,
    url: form.url.value.trim(),
    tom: form.tom.value.trim(),
    bpm: form.bpm.value,
    descricao: form.descricao.value.trim()
  };
  try {
    if (id) await API.put('/vs/' + id, body);
    else await API.post('/vs', body);
    closeModal('modal-vs');
    await loadVS();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

window.deleteVS = async function (id) {
  if (!confirm('Excluir esta trilha VS?')) return;
  try {
    await API.del('/vs/' + id);
    await loadVS();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

async function loadConfig() {
  try {
    const cfg = await API.get('/config');
    const form = document.getElementById('form-config');
    Object.keys(cfg).forEach(k => {
      const el = form.elements[k];
      if (el) el.value = cfg[k] || '';
    });
  } catch (e) {
    console.error(e);
  }
}

async function saveConfig(e) {
  e.preventDefault();
  const form = e.target;
  const body = {};
  ['nome_igreja', 'cidade', 'endereco', 'pastor', 'louvor_responsavel', 'contato', 'whatsapp', 'site', 'logo_url', 'versiculo', 'mensagem_rodape']
    .forEach(k => { body[k] = form.elements[k].value.trim(); });
  try {
    await API.put('/config', body);
    alert('Configuracoes salvas com sucesso.');
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

async function loadUsers() {
  try {
    allUsers = await API.get('/auth/users');
    renderUsers();
  } catch (e) {
    document.getElementById('users-list').innerHTML = `<p class="empty">Erro: ${escapeHtml(e.message)}</p>`;
  }
}

function renderUsers() {
  const container = document.getElementById('users-list');
  if (allUsers.length === 0) {
    container.innerHTML = '<p class="empty">Nenhum usuario cadastrado.</p>';
    return;
  }
  container.innerHTML = allUsers.map(u => `
    <div class="card user-card">
      <div class="user-card-head">
        <div>
          <div class="card-title">${escapeHtml(u.nome)}</div>
          <div class="card-meta">${escapeHtml(u.email)}</div>
        </div>
        <span class="badge badge-primary user-perfil">${escapeHtml(u.perfil)}</span>
      </div>
      <div class="card-meta">Cadastrado em: ${new Date(u.criado_em).toLocaleDateString('pt-BR')}</div>
      ${u.id !== currentUser.id ? `
        <div class="form-row" style="grid-template-columns: 1fr auto;">
          <select class="role-select" onchange="changeUserRole('${u.id}', this.value)">
            <option value="membro" ${u.perfil === 'membro' ? 'selected' : ''}>Membro</option>
            <option value="lider" ${u.perfil === 'lider' ? 'selected' : ''}>Lider</option>
            <option value="admin" ${u.perfil === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Excluir</button>
        </div>
      ` : '<small class="empty">Voce nao pode alterar seu proprio perfil aqui.</small>'}
    </div>
  `).join('');
}

window.changeUserRole = async function (id, perfil) {
  try {
    await API.put('/auth/users/' + id, { perfil });
    await loadUsers();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.deleteUser = async function (id) {
  if (!confirm('Excluir este usuario?')) return;
  try {
    await API.del('/auth/users/' + id);
    await loadUsers();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};
