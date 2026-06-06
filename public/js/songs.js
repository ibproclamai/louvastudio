let allSongs = [];
let currentUser = null;

(async function () {
  currentUser = await requireAuth();
  if (!currentUser) return;
  setupLogout();
  setupAdminVisibility(currentUser);
  setupRoleVisibility(currentUser);

  document.getElementById('btn-new-song').addEventListener('click', () => openSongForm());
  document.getElementById('form-song').addEventListener('submit', saveSong);
  document.getElementById('search-song').addEventListener('input', renderSongs);

  await loadSongs();
  setupSongFormUploads();
})();

function setupSongFormUploads() {
  const cifraZone = document.getElementById('upload-cifra-zone');
  if (cifraZone) {
    cifraZone.appendChild(createUploadButton({
      accept: 'image/*,application/pdf',
      label: '&#128196; Upload',
      folder: 'louva-studio/cifras',
      onUpload: (result) => {
        document.getElementById('cifra-url').value = result.url;
        toast('Cifra enviada!', 'success');
      }
    }));
  }
}

async function loadSongs() {
  try {
    allSongs = await API.get('/songs');
    renderSongs();
  } catch (err) {
    document.getElementById('songs-list').innerHTML = `<p class="empty">Erro: ${escapeHtml(err.message)}</p>`;
  }
}

function renderSongs() {
  const q = (document.getElementById('search-song').value || '').toLowerCase();
  const filtered = allSongs.filter(s =>
    !q || (s.título || '').toLowerCase().includes(q) || (s.artista || '').toLowerCase().includes(q)
  );

  const container = document.getElementById('songs-list');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty">Nenhuma música encontrada.</p>';
    return;
  }

  const isAdmin = currentUser && currentUser.perfil === 'admin';
  container.innerHTML = filtered.map(s => {
    const vsList = s.vs_list || [];
    const multitrack = vsList.find(v => v.tipo === 'multitrack');
    return `
    <div class="card">
      <div class="card-title">${escapeHtml(s.título)}</div>
      <div class="card-meta">
        ${s.artista ? escapeHtml(s.artista) + ' &middot; ' : ''}
        ${s.tom ? '<span class="badge badge-primary">Tom: ' + escapeHtml(s.tom) + '</span> ' : ''}
        ${s.bpm ? '<span class="badge">' + escapeHtml(s.bpm) + ' BPM</span>' : ''}
        ${vsList.length > 0 ? '<span class="badge badge-primary">' + vsList.length + ' VS</span>' : ''}
      </div>
      <div class="card-body">
        ${s.cifra_url ? '<a href="' + escapeHtml(s.cifra_url) + '" target="_blank">Cifra</a> &middot; ' : ''}
        ${s.video_url ? '<a href="javascript:void(0)" onclick="openYouTube(' + "'" + escapeHtml(s.video_url) + "'" + ')" class="btn-yt">Assistir</a> &middot; ' : ''}
        ${s.video_url ? '<button class="btn-copy" onclick="copyText(' + "'" + escapeHtml(s.video_url) + "'" + ', \'Link do YouTube\')">Copiar link</button>' : ''}
        ${s.observações ? '<br><small>' + escapeHtml(s.observações) + '</small>' : ''}
        ${vsList.length > 0 ? `<details style="margin-top:0.5rem"><summary><small>${vsList.length} trilha(s) VS</small></summary>${vsList.map(v => `<div style="margin-top:0.4rem;padding:0.4rem;background:var(--bg);border-radius:4px"><small><b>${escapeHtml(v.nome)}</b> <span class="badge badge-${escapeHtml(v.tipo)}">${escapeHtml(v.tipo)}</span>${v.tipo === 'multitrack' ? ' &middot; <a href="/multitrack.html?vs=' + encodeURIComponent(v.id) + '">Abrir Player</a>' : ''}<br><audio controls preload="none" src="${escapeHtml(v.url)}" style="width:100%;margin-top:0.3rem"></audio></small></div>`).join('')}</details>` : ''}
      </div>
      ${multitrack ? `<div class="card-actions"><a class="btn btn-sm btn-primary" href="/multitrack.html?vs=${encodeURIComponent(multitrack.id)}">&#9654; Tocar Multitrack</a></div>` : ''}
      ${isAdmin ? `
        <div class="card-actions">
          <button class="btn btn-sm" onclick="openSongForm('${s.id}')">Editar</button>
          <button class="btn btn-sm btn-primary" onclick="goToStudio('${s.id}')">+ VS</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSong('${s.id}')">Excluir</button>
        </div>
      ` : ''}
    </div>
  `;}).join('');
}

window.goToStudio = function (songId) {
  location.href = '/studio.html?song=' + encodeURIComponent(songId);
};

window.openSongForm = function (id) {
  document.getElementById('modal-title').textContent = id ? 'Editar música' : 'Nova música';
  const form = document.getElementById('form-song');
  form.reset();
  if (id) {
    const s = allSongs.find(x => x.id === id);
    if (s) {
      form.título.value = s.título || '';
      form.artista.value = s.artista || '';
      form.tom.value = s.tom || '';
      form.bpm.value = s.bpm || '';
      form.cifra_url.value = s.cifra_url || '';
      form.video_url.value = s.video_url || '';
      form.observações.value = s.observações || '';
      form.id.value = s.id;
    }
  }
  openModal('modal-song');
};

async function saveSong(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const body = {
    título: form.título.value.trim(),
    artista: form.artista.value.trim(),
    tom: form.tom.value.trim(),
    bpm: form.bpm.value,
    cifra_url: form.cifra_url.value.trim(),
    video_url: form.video_url.value.trim(),
    observações: form.observações.value.trim()
  };
  try {
    if (id) await API.put('/songs/' + id, body);
    else await API.post('/songs', body);
    closeModal('modal-song');
    await loadSongs();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

window.deleteSong = async function (id) {
  if (!confirm('Excluir esta música?')) return;
  try {
    await API.del('/songs/' + id);
    await loadSongs();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};
