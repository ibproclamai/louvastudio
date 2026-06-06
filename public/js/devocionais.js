(function() {
  let allDevs = [];
  let allSongs = [];
  let currentEditingId = null;

  async function init() {
    const user = await requireAuth();
    Sidebar.setup(user);
    setupEvents();
    await Promise.all([loadDevs(), loadSongsForSelect()]);
  }

  function setupEvents() {
    document.getElementById('btn-new-dev').addEventListener('click', () => {
      currentEditingId = null;
      document.getElementById('modal-dev-title').textContent = 'Novo Devocional';
      document.getElementById('form-dev').reset();
      openModal('modal-dev');
    });
    document.getElementById('form-dev').addEventListener('submit', saveDev);
    document.getElementById('filter-q').addEventListener('input', renderList);
    document.getElementById('filter-musica').addEventListener('change', renderList);
  }

  async function loadDevs() {
    try {
      allDevs = await API.get('/devocionais') || [];
      renderList();
    } catch (e) {
      console.error(e);
      toast('Erro ao carregar devocionais', 'error');
    }
  }

  async function loadSongsForSelect() {
    try {
      allSongs = await API.get('/songs') || [];
      const sel = document.getElementById('dev-musica');
      const fil = document.getElementById('filter-musica');
      allSongs.forEach(s => {
        const o1 = new Option(s.titulo, s.id);
        const o2 = new Option(s.titulo, s.id);
        sel.appendChild(o1);
        fil.appendChild(o2);
      });
    } catch (e) { console.error(e); }
  }

  function renderList() {
    const q = (document.getElementById('filter-q').value || '').toLowerCase();
    const m = document.getElementById('filter-musica').value;
    const filtered = allDevs.filter(d => {
      if (m && d.musica_id !== m) return false;
      if (q && !(d.titulo || '').toLowerCase().includes(q) && !(d.conteudo || '').toLowerCase().includes(q) && !(d.referencia || '').toLowerCase().includes(q)) return false;
      return true;
    });
    const cont = document.getElementById('devs-list');
    if (filtered.length === 0) {
      cont.innerHTML = '<p class="empty">Nenhum devocional ainda. Comece criando o primeiro!</p>';
      return;
    }
    const isAdmin = isAdminUser();
    cont.innerHTML = filtered.map(d => {
      const song = d.musica_id ? allSongs.find(s => s.id === d.musica_id) : null;
      const date = d.criado_em ? new Date(d.criado_em).toLocaleDateString('pt-BR') : '';
      return `
        <div class="card" style="cursor:pointer;" onclick="viewDev('${d.id}')">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:0.5rem;">
            <h3 class="card-title" style="margin-bottom:0.25rem;">${escapeHtml(d.titulo)}</h3>
            ${isAdmin ? `
              <div style="display:flex; gap:0.25rem;">
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); editDev('${d.id}')" title="Editar">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); deleteDev('${d.id}')" title="Excluir">🗑️</button>
              </div>
            ` : ''}
          </div>
          ${d.versiculo ? `<p style="font-style:italic; color:var(--text-muted); font-size:0.85rem; margin:0.4rem 0;">"${escapeHtml(d.versiculo)}"</p>` : ''}
          ${d.referencia ? `<div class="card-meta"><span class="badge badge-success">${escapeHtml(d.referencia)}</span></div>` : ''}
          ${song ? `<div class="card-meta"><span class="badge">🎵 ${escapeHtml(song.titulo)}</span></div>` : ''}
          <p style="color:var(--text-muted); font-size:0.85rem; line-height:1.5; margin-top:0.5rem;">
            ${escapeHtml((d.conteudo || '').slice(0, 140))}${(d.conteudo || '').length > 140 ? '...' : ''}
          </p>
          ${date ? `<div style="font-size:0.7rem; color:var(--text-soft); margin-top:0.5rem;">${date}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  window.viewDev = function(id) {
    const d = allDevs.find(x => x.id === id);
    if (!d) return;
    const song = d.musica_id ? allSongs.find(s => s.id === d.musica_id) : null;
    const body = `
      <div style="line-height:1.7;">
        ${d.versiculo ? `<p style="font-style:italic; color:var(--primary); font-size:1.05rem; border-left:3px solid var(--primary); padding-left:1rem; margin:0 0 1rem;">"${escapeHtml(d.versiculo)}"${d.referencia ? ' <strong>(' + escapeHtml(d.referencia) + ')</strong>' : ''}</p>` : ''}
        ${song ? `<p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">🎵 Música: <strong>${escapeHtml(song.titulo)}</strong></p>` : ''}
        <div style="white-space:pre-wrap;">${escapeHtml(d.conteudo)}</div>
      </div>
    `;
    showModalContent(d.titulo, body, isAdminUser());
  };

  window.editDev = function(id) {
    const d = allDevs.find(x => x.id === id);
    if (!d) return;
    currentEditingId = id;
    document.getElementById('modal-dev-title').textContent = 'Editar Devocional';
    const f = document.getElementById('form-dev');
    f.titulo.value = d.titulo || '';
    f.versiculo.value = d.versiculo || '';
    f.referencia.value = d.referencia || '';
    f.musica_id.value = d.musica_id || '';
    f.conteudo.value = d.conteudo || '';
    openModal('modal-dev');
  };

  window.deleteDev = async function(id) {
    if (!confirm('Excluir este devocional?')) return;
    try {
      await API.del(`/devocionais/${id}`);
      toast('Devocional excluído', 'success');
      await loadDevs();
    } catch (e) {
      toast('Erro ao excluir', 'error');
    }
  };

  async function saveDev(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    try {
      if (currentEditingId) {
        await API.put(`/devocionais/${currentEditingId}`, data);
        toast('Devocional atualizado!', 'success');
      } else {
        await API.post('/devocionais', data);
        toast('Devocional criado!', 'success');
      }
      closeModal('modal-dev');
      await loadDevs();
    } catch (err) {
      toast(err.message || 'Erro ao salvar', 'error');
    }
  }

  function showModalContent(title, bodyHtml, isAdmin) {
    let m = document.getElementById('modal-view');
    if (!m) {
      m = document.createElement('div');
      m.id = 'modal-view';
      m.className = 'modal hidden';
      m.innerHTML = '<div class="modal-content modal-large"><div class="modal-header"><h2 id="mv-title"></h2><button class="modal-close" data-close>&times;</button></div><div class="modal-body" id="mv-body"></div></div>';
      document.body.appendChild(m);
    }
    document.getElementById('mv-title').textContent = title;
    document.getElementById('mv-body').innerHTML = bodyHtml;
    openModal('modal-view');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
