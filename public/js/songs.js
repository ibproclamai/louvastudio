(function() {
  let allSongs = [];
  let currentEditingId = null;

  const BIBLE_BOOKS = [
    'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio', 'Josué', 'Juízes', 'Rute',
    '1 Samuel', '2 Samuel', '1 Reis', '2 Reis', '1 Crônicas', '2 Crônicas', 'Esdras', 'Neemias', 'Ester',
    'Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares', 'Isaías', 'Jeremias', 'Lamentações',
    'Ezequiel', 'Daniel', 'Oséias', 'Joel', 'Amós', 'Obadias', 'Jonas', 'Miqueias', 'Naum', 'Habacuque',
    'Sofonias', 'Ageu', 'Zacarias', 'Malaquias',
    'Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas',
    'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo',
    '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', '1 Pedro', '2 Pedro', '1 João', '2 João',
    '3 João', 'Judas', 'Apocalipse'
  ];

  async function init() {
    const user = await requireAuth();
    Sidebar.setup(user, '/songs.html');
    populateBibleFilter();
    setupEvents();
    await loadSongs();
  }

  function populateBibleFilter() {
    const sel = document.getElementById('filter-livro');
    BIBLE_BOOKS.forEach(b => {
      sel.appendChild(new Option(b, b));
    });
  }

  function setupEvents() {
    document.getElementById('btn-new-song').addEventListener('click', () => {
      currentEditingId = null;
      document.getElementById('modal-song-title').textContent = 'Nova música';
      document.getElementById('form-song').reset();
      openModal('modal-song');
    });
    document.getElementById('form-song').addEventListener('submit', saveSong);
    document.getElementById('filter-q').addEventListener('input', renderList);
    document.getElementById('filter-tema').addEventListener('change', renderList);
    document.getElementById('filter-intensidade').addEventListener('change', renderList);
    document.getElementById('filter-livro').addEventListener('change', renderList);
  }

  async function loadSongs() {
    try {
      allSongs = await API.get('/songs') || [];
      document.getElementById('stat-total').textContent = allSongs.length;
      renderList();
    } catch (e) {
      console.error(e);
      toast('Erro ao carregar músicas', 'error');
    }
  }

  function renderList() {
    const q = (document.getElementById('filter-q').value || '').toLowerCase();
    const tema = document.getElementById('filter-tema').value;
    const intensidade = document.getElementById('filter-intensidade').value;
    const livro = document.getElementById('filter-livro').value;

    const filtered = allSongs.filter(s => {
      if (tema && s.tema !== tema) return false;
      if (intensidade && s.intensidade !== intensidade) return false;
      if (livro) {
        const refs = (s.referencias_biblicas || '').toLowerCase();
        if (!refs.includes(livro.toLowerCase())) return false;
      }
      if (q) {
        const blob = [s.titulo, s.artista, s.versiculo_chave, s.referencias_biblicas, s.observacoes].join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    document.getElementById('stat-shown').textContent = filtered.length;
    const cont = document.getElementById('songs-list');
    if (filtered.length === 0) {
      cont.innerHTML = '<p class="empty">Nenhuma música encontrada com os filtros atuais.</p>';
      return;
    }
    const isAdmin = isAdminUser();
    cont.innerHTML = filtered.map(s => {
      const tags = [];
      if (s.tema) tags.push(`<span class="song-tag tema-${s.tema}">${s.tema.replace(/_/g, ' ')}</span>`);
      if (s.intensidade) tags.push(`<span class="song-tag int-${s.intensidade}">${s.intensidade}</span>`);
      const initials = (s.titulo || '?').slice(0, 2).toUpperCase();
      const last = s.ultima_execucao ? new Date(s.ultima_execucao + 'T00:00:00').toLocaleDateString('pt-BR') : null;
      return `
        <div class="song-card" onclick="viewSong('${s.id}')">
          <div class="song-cover">${initials}
            <div class="play-icon">▶</div>
          </div>
          <div class="song-title">${escapeHtml(s.titulo)}</div>
          <div class="song-artist">${escapeHtml(s.artista || '—')}</div>
          <div class="song-tags">${tags.join('')}</div>
          ${last ? `<div class="song-history">🕒 Última: <strong>${last}</strong> · ${s.total_execucoes || 0}x tocada</div>` : (s.total_execucoes > 0 ? `<div class="song-history">${s.total_execucoes}x tocada</div>` : '')}
          ${isAdmin ? `<div style="position:absolute; top:0.5rem; right:0.5rem; display:flex; gap:0.25rem; z-index:3;">
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); editSong('${s.id}')">✏️</button>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); deleteSong('${s.id}')">🗑️</button>
          </div>` : ''}
        </div>
      `;
    }).join('');
  }

  window.viewSong = async function(id) {
    try {
      const s = await API.get(`/songs/${id}`);
      const tags = [];
      if (s.tema) tags.push(`<span class="badge">${s.tema.replace(/_/g, ' ')}</span>`);
      if (s.intensidade) tags.push(`<span class="badge">${s.intensidade}</span>`);
      const refs = (s.referencias_biblicas || '').split('|').filter(Boolean);
      const body = `
        <div style="line-height:1.6;">
          <div class="card-meta" style="margin-bottom:1rem;">${tags.join(' ')}</div>
          ${s.versiculo_chave ? `<p style="font-style:italic; color:var(--primary); border-left:3px solid var(--primary); padding-left:1rem; margin:0 0 1rem;">"${escapeHtml(s.versiculo_chave)}"</p>` : ''}
          ${refs.length > 0 ? `<div style="margin-bottom:0.75rem;"><strong>Referências bíblicas:</strong> ${refs.map(r => `<span class="badge badge-success" style="margin:0.15rem;">${escapeHtml(r)}</span>`).join('')}</div>` : ''}
          <div class="form-row form-row-3" style="margin-bottom:1rem;">
            <div><strong>Tom:</strong> ${escapeHtml(s.tom || '—')}</div>
            <div><strong>BPM:</strong> ${escapeHtml(s.bpm || '—')}</div>
            <div><strong>Artista:</strong> ${escapeHtml(s.artista || '—')}</div>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
            ${s.cifra_url ? `<a href="${escapeHtml(s.cifra_url)}" target="_blank" class="btn btn-sm">🎸 Cifra</a>` : ''}
            ${s.video_url ? `<a href="${escapeHtml(s.video_url)}" target="_blank" class="btn btn-yt">Vídeo</a>` : ''}
            ${s.letra_url ? `<a href="${escapeHtml(s.letra_url)}" target="_blank" class="btn btn-sm">📝 Letra</a>` : ''}
          </div>
          ${s.observacoes ? `<p><strong>Observações:</strong> ${escapeHtml(s.observacoes)}</p>` : ''}
          <hr style="border-color: var(--border); margin: 1rem 0;">
          <h3 style="font-size:0.9rem; margin-bottom:0.5rem;">Histórico de execução</h3>
          ${(s.historico || []).length === 0
            ? '<p class="empty" style="padding:1rem;">Nunca tocada em uma escala</p>'
            : '<ul style="list-style:none; padding:0;">' + s.historico.slice(0, 10).map(h => `<li style="padding:0.4rem 0; border-bottom:1px solid var(--border);">📅 ${new Date(h.data_culto + 'T00:00:00').toLocaleDateString('pt-BR')} · ${escapeHtml(h.tipo_culto || 'culto')}</li>`).join('') + '</ul>'}
        </div>
      `;
      showModalContent(s.titulo, body, isAdminUser());
    } catch (e) {
      toast('Erro ao carregar música', 'error');
    }
  };

  window.editSong = function(id) {
    const s = allSongs.find(x => x.id === id);
    if (!s) return;
    currentEditingId = id;
    document.getElementById('modal-song-title').textContent = 'Editar música';
    const f = document.getElementById('form-song');
    f.titulo.value = s.titulo || '';
    f.artista.value = s.artista || '';
    f.tom.value = s.tom || '';
    f.bpm.value = s.bpm || '';
    f.cifra_url.value = s.cifra_url || '';
    f.video_url.value = s.video_url || '';
    f.letra_url.value = s.letra_url || '';
    f.tema.value = s.tema || '';
    f.intensidade.value = s.intensidade || '';
    f.referencias_biblicas.value = (s.referencias_biblicas || '').replace(/\|/g, ', ');
    f.versiculo_chave.value = s.versiculo_chave || '';
    f.observacoes.value = s.observacoes || '';
    openModal('modal-song');
  };

  window.deleteSong = async function(id) {
    if (!confirm('Excluir esta música? Esta ação não pode ser desfeita.')) return;
    try {
      await API.del(`/songs/${id}`);
      toast('Música excluída', 'success');
      await loadSongs();
    } catch (e) {
      toast('Erro ao excluir', 'error');
    }
  };

  async function saveSong(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.referencias_biblicas = (data.referencias_biblicas || '').split(',').map(s => s.trim()).filter(Boolean);
    try {
      if (currentEditingId) {
        await API.put(`/songs/${currentEditingId}`, data);
        toast('Música atualizada!', 'success');
      } else {
        await API.post('/songs', data);
        toast('Música criada!', 'success');
      }
      closeModal('modal-song');
      await loadSongs();
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
