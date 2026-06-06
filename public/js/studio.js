let allVS = [];
let allSongs = [];
let allUsers = [];
let currentUser = null;
let isAdmin = false;

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
  currentUser = await requireAuth();
  if (!currentUser) return;
  window.__currentUser = currentUser;
  setupLogout();
  setupRoleVisibility(currentUser);
  isAdmin = currentUser.perfil === 'admin';

  document.querySelectorAll('.studio-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.stab));
  });

  if (isAdmin) {
    document.getElementById('btn-new-vs').addEventListener('click', () => openVSForm());
    document.getElementById('form-vs').addEventListener('submit', saveVS);
    document.getElementById('form-config').addEventListener('submit', saveConfig);
  }
  document.getElementById('search-vs').addEventListener('input', renderVS);
  document.getElementById('filter-vs-song').addEventListener('change', renderVS);
  document.getElementById('filter-vs-tipo').addEventListener('change', renderVS);

  await loadSongs();
  await loadVS();
  if (isAdmin) {
    await loadUsers();
    await loadConfig();
  } else {
    document.querySelectorAll('[data-admin-tab]').forEach(el => el.classList.add('hidden'));
    switchTab('vs');
  }

  const params = new URLSearchParams(location.search);
  const songId = params.get('song');
  if (songId && isAdmin) {
    document.getElementById('filter-vs-song').value = songId;
    renderVS();
    openVSForm();
    setTimeout(() => {
      const sel = document.querySelector('#form-vs select[name="música_id"]');
      if (sel) sel.value = songId;
    }, 50);
  }
})();

function switchTab(name) {
  document.querySelectorAll('.studio-tab').forEach(t => t.classList.toggle('active', t.dataset.stab === name));
  document.querySelectorAll('.studio-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('panel-' + name).classList.remove('hidden');
  if (name === 'multitrack') loadMultitracks();
  if (name === 'users') loadUsers();
}

async function loadSongs() {
  try {
    allSongs = await API.get('/songs');
    const sel = document.getElementById('filter-vs-song');
    const formSel = document.querySelector('#form-vs select[name="música_id"]');
    const opts = '<option value="">Todas as músicas</option>' +
      allSongs.map(s => `<option value="${s.id}">${escapeHtml(s.título)}${s.artista ? ' - ' + escapeHtml(s.artista) : ''}</option>`).join('');
    sel.innerHTML = opts;
    formSel.innerHTML = '<option value="">Selecione a música...</option>' +
      allSongs.map(s => `<option value="${s.id}">${escapeHtml(s.título)}${s.artista ? ' - ' + escapeHtml(s.artista) : ''}</option>`).join('');
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
    if (songFilter && v.música_id !== songFilter) return false;
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
    const song = allSongs.find(s => s.id === v.música_id);
    return `
      <div class="card vs-card">
        <div class="vs-card-head">
          <div>
            <div class="vs-card-title">${escapeHtml(v.nome)}</div>
            <div class="vs-card-song">${song ? escapeHtml(song.título) : '(música removida)'}</div>
          </div>
          <span class="badge badge-${escapeHtml(v.tipo)}">${TIPOS_LABEL[v.tipo] || v.tipo}</span>
        </div>
        ${v.descrição ? `<div class="card-body">${escapeHtml(v.descrição)}</div>` : ''}
        <div class="vs-card-meta">
          ${v.tom ? '<span class="badge badge-primary">Tom: ' + escapeHtml(v.tom) + '</span>' : ''}
          ${v.bpm ? '<span class="badge">' + escapeHtml(v.bpm) + ' BPM</span>' : ''}
        </div>
        <audio class="vs-audio" controls preload="none" src="${escapeHtml(v.url)}"></audio>
        <a class="vs-link" href="${escapeHtml(v.url)}" target="_blank">Abrir link original</a>
        ${isAdmin ? `
        <div class="card-actions">
          <button class="btn btn-sm" onclick="openVSForm('${v.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVS('${v.id}')">Excluir</button>
        </div>` : ''}
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
      form.música_id.value = v.música_id;
      form.nome.value = v.nome || '';
      form.tipo.value = v.tipo || 'playback';
      form.url.value = v.url || '';
      form.tom.value = v.tom || '';
      form.bpm.value = v.bpm || '';
      form.descrição.value = v.descrição || '';
    }
  }
  openModal('modal-vs');
};

async function saveVS(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const body = {
    música_id: form.música_id.value,
    nome: form.nome.value.trim(),
    tipo: form.tipo.value,
    url: form.url.value.trim(),
    tom: form.tom.value.trim(),
    bpm: form.bpm.value,
    descrição: form.descrição.value.trim()
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
    ['nome_igreja', 'cidade', 'endereco', 'pastor', 'louvor_responsavel', 'contato', 'whatsapp', 'site', 'logo_url', 'versiculo', 'mensagem_rodape', 'cloudinary_cloud_name', 'cloudinary_upload_preset', 'email_host', 'email_port', 'email_user', 'email_pass', 'email_from_name']
    .forEach(k => { body[k] = form.elements[k]?.value?.trim() || ''; });
  try {
    await API.put('/config', body);
    alert('Configurações salvas com sucesso.');
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

async function testEmail() {
  const email = document.getElementById('test-email-input').value.trim();
  if (!email) return alert('Informe um email de destino.');
  const btn = document.getElementById('btn-test-email');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try {
    const r = await API.post('/notifications/test', { email });
    alert('Email de teste enviado para ' + r.sentTo);
  } catch (err) {
    alert('Erro: ' + (err.message || 'Falha ao enviar'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar teste';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const testBtn = document.getElementById('btn-test-email');
  if (testBtn) testBtn.addEventListener('click', testEmail);
});

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
    container.innerHTML = '<p class="empty">Nenhum usuário cadastrado.</p>';
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
      ` : '<small class="empty">Você não pode alterar seu proprio perfil aqui.</small>'}
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
  if (!confirm('Excluir este usuário?')) return;
  try {
    await API.del('/auth/users/' + id);
    await loadUsers();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

let allMultitracks = [];

async function loadMultitracks() {
  try {
    allMultitracks = await API.get('/vs');
    renderMultitracks();
    populateMultitrackFilters();
  } catch (e) {
    document.getElementById('multitrack-list').innerHTML = `<p class="empty">Erro: ${escapeHtml(e.message)}</p>`;
  }
}

function populateMultitrackFilters() {
  const sel = document.getElementById('filter-multitrack-song');
  const formSel = document.querySelector('#form-multitrack select[name="música_id"]');
  const opts = allSongs.map(s => `<option value="${s.id}">${escapeHtml(s.título)}${s.artista ? ' - ' + escapeHtml(s.artista) : ''}</option>`).join('');
  sel.innerHTML = '<option value="">Todas as músicas</option>' + opts;
  formSel.innerHTML = '<option value="">Selecione a música...</option>' + opts;
}

function renderMultitracks() {
  const q = (document.getElementById('search-multitrack').value || '').toLowerCase();
  const songFilter = document.getElementById('filter-multitrack-song').value;
  const filtered = allMultitracks.filter(v => {
    if (v.tipo !== 'multitrack') return false;
    if (songFilter && v.música_id !== songFilter) return false;
    if (q && !(v.nome || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const container = document.getElementById('multitrack-list');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty">Nenhum multitrack cadastrado. Clique em "+ Novo multitrack" para começar.</p>';
    return;
  }

  container.innerHTML = filtered.map(v => {
    const song = allSongs.find(s => s.id === v.música_id);
    return `
      <div class="card vs-card">
        <div class="vs-card-head">
          <div>
            <div class="vs-card-title">${escapeHtml(v.nome)}</div>
            <div class="vs-card-song">${song ? escapeHtml(song.título) : '(música removida)'}</div>
          </div>
          <span class="badge badge-multitrack">Multitrack</span>
        </div>
        ${v.descrição ? `<div class="card-body">${escapeHtml(v.descrição)}</div>` : ''}
        <div class="card-actions">
          <a class="btn btn-sm btn-primary" href="/multitrack.html?vs=${v.id}">&#9654; Abrir Player</a>
          ${isAdmin ? `
          <button class="btn btn-sm" onclick="openTracksModal('${v.id}')">Gerenciar faixas</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVS('${v.id}')">Excluir</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.openMultitrackForm = function (id) {
  document.getElementById('modal-multitrack-title').textContent = id ? 'Editar multitrack' : 'Novo multitrack';
  const form = document.getElementById('form-multitrack');
  form.reset();
  if (id) {
    const v = allMultitracks.find(x => x.id === id);
    if (v) {
      form.id.value = v.id;
      form.música_id.value = v.música_id;
      form.nome.value = v.nome || '';
      form.descrição.value = v.descrição || '';
    }
  }
  openModal('modal-multitrack');
};

async function saveMultitrack(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const body = {
    música_id: form.música_id.value,
    nome: form.nome.value.trim(),
    tipo: 'multitrack',
    url: 'multitrack://' + (id || 'new'),
    descrição: form.descrição.value.trim()
  };
  try {
    let vsId;
    if (id) {
      await API.put('/vs/' + id, body);
      vsId = id;
    } else {
      const created = await API.post('/vs', body);
      vsId = created.id;
    }
    closeModal('modal-multitrack');
    await loadMultitracks();
    if (!id) openTracksModal(vsId);
  } catch (err) {
    toast('Erro: ' + err.message, 'error');
  }
}

let currentTracksVS = null;
let currentTracks = [];

window.openTracksModal = async function (vsId) {
  currentTracksVS = vsId;
  const vs = allMultitracks.find(v => v.id === vsId);
  document.getElementById('modal-tracks-title').textContent = `Faixas - ${vs ? vs.nome : ''}`;
  document.querySelector('#form-track input[name="vs_id"]').value = vsId;
  document.getElementById('form-track').reset();
  document.querySelector('#form-track input[name="vs_id"]').value = vsId;
  document.getElementById('btn-open-player').href = `/multitrack.html?vs=${vsId}`;
  await loadTracks(vsId);
  openModal('modal-tracks');
};

async function loadTracks(vsId) {
  try {
    currentTracks = await API.get(`/multitracks?vs_id=${vsId}`);
    renderTracks();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
}

function renderTracks() {
  const container = document.getElementById('tracks-list');
  if (currentTracks.length === 0) {
    container.innerHTML = '<p class="empty">Nenhuma faixa ainda. Adicione a primeira acima.</p>';
    return;
  }
  const ICONS = { click: '🥁', voz: '🎤', violao: '🎸', guitarra: '🎸', baixo: '🎸', teclado: '🎹', bateria: '🥁', metronomo: '⏱️', outro: '🎵' };
  container.innerHTML = currentTracks.map(t => `
    <div class="card vs-card" style="padding:0.75rem;">
      <div class="vs-card-head">
        <div>
          <div class="vs-card-title">${ICONS[t.instrumento] || '🎵'} ${escapeHtml(t.label || t.instrumento)}</div>
          <div class="vs-card-song">Vol: ${t.volume_padrao}% ${t.mutado_padrao === 'true' ? '· Muted' : ''}</div>
        </div>
        <button class="btn btn-sm btn-danger" onclick="deleteTrack('${t.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

async function saveTrack(e) {
  e.preventDefault();
  const form = e.target;
  const body = {
    vs_id: form.vs_id.value,
    instrumento: form.instrumento.value,
    label: form.label.value.trim() || form.instrumento.value,
    url: form.url.value.trim(),
    volume_padrao: parseInt(form.volume_padrao.value) || 80,
    mutado_padrao: form.mutado_padrao.checked,
    ordem: parseInt(form.ordem.value) || 0
  };
  try {
    await API.post('/multitracks', body);
    form.reset();
    document.querySelector('#form-track input[name="vs_id"]').value = body.vs_id;
    await loadTracks(body.vs_id);
    toast('Faixa adicionada!', 'success');
  } catch (err) {
    toast('Erro: ' + err.message, 'error');
  }
}

window.deleteTrack = async function (id) {
  if (!confirm('Excluir esta faixa?')) return;
  try {
    await API.del('/multitracks/' + id);
    await loadTracks(currentTracksVS);
  } catch (err) {
    toast('Erro: ' + err.message, 'error');
  }
};

document.getElementById('btn-new-multitrack')?.addEventListener('click', () => openMultitrackForm());
document.getElementById('form-multitrack')?.addEventListener('submit', saveMultitrack);
document.getElementById('form-track')?.addEventListener('submit', saveTrack);
document.getElementById('search-multitrack')?.addEventListener('input', renderMultitracks);
document.getElementById('filter-multitrack-song')?.addEventListener('change', renderMultitracks);

function setupVSFormUploads() {
  const zone = document.getElementById('upload-vs-zone');
  if (zone && !zone.dataset.setup) {
    zone.dataset.setup = '1';
    zone.appendChild(createUploadButton({
      accept: 'audio/*',
      label: '&#127911; Upload Audio',
      folder: 'louva-studio/vs',
      onUpload: (result) => {
        document.getElementById('vs-url').value = result.url;
        toast('Audio enviado!', 'success');
      }
    }));
  }
}

function setupTrackFormUploads() {
  const zone = document.getElementById('upload-track-zone');
  if (zone && !zone.dataset.setup) {
    zone.dataset.setup = '1';
    zone.appendChild(createUploadButton({
      accept: 'audio/*',
      label: '&#127911; Upload',
      folder: 'louva-studio/tracks',
      onUpload: (result) => {
        document.getElementById('track-url').value = result.url;
        toast('Faixa enviada!', 'success');
      }
    }));
  }
}
