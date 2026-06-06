(async function () {
  const user = await requireAuth();
  if (!user) return;
  Sidebar.setup(user, '/my-schedule.html');
  window.__currentUser = user;
  isAdminUser = user.perfil === 'admin';

  try {
    const items = await API.get('/confirmations/minhas');
    const container = document.getElementById('my-schedules');
    if (items.length === 0) {
      container.innerHTML = '<p class="empty">Você não está em nenhuma escala. Peça ao administrador para incluí-lo.</p>';
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const sorted = [...items].sort((a, b) => a.data_culto.localeCompare(b.data_culto));
    const upcoming = sorted.filter(i => i.data_culto >= today);
    const past = sorted.filter(i => i.data_culto < today);

    container.innerHTML = '';
    if (upcoming.length > 0) {
      container.innerHTML += '<h2 class="section" style="margin-top:0">Próximas</h2>' + upcoming.map(renderItem).join('');
    }
    if (past.length > 0) {
      container.innerHTML += '<h2 class="section">Passadas</h2>' + past.map(renderItem).join('');
    }
  } catch (err) {
    document.getElementById('my-schedules').innerHTML = `<p class="empty">Erro: ${escapeHtml(err.message)}</p>`;
  }
})();

let isAdminUser = false;
let allSongs = [];
let currentScheduleMusicas = [];

function renderItem(item) {
  const d = new Date(item.data_culto + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const isPast = item.data_culto < new Date().toISOString().slice(0, 10);
  return `
    <div class="card">
      <div class="schedule-item" style="box-shadow:none; padding:0;">
        <div class="schedule-date">
          <div class="day">${day}</div>
          <div class="month">${month}</div>
        </div>
        <div class="schedule-info">
          <h3>${escapeHtml(item.tipo_culto || 'Culto')}</h3>
          <p>${item.local ? escapeHtml(item.local) + ' &middot; ' : ''}${escapeHtml(item.funcação_na_escala || 'Equipe')}</p>
          <p>${renderConfirmBadge(item.confirmado)}</p>
        </div>
      </div>
      <div class="schedule-musicas" id="musicas-${item.escala_id}">
        <p class="empty" style="margin:0.5rem 0;font-size:0.85rem;">Carregando músicas...</p>
      </div>
      ${!isPast ? `
        <div class="confirm-buttons" style="flex-wrap:wrap;">
          <button class="btn btn-success btn-sm" onclick="confirmar('${item.id}','confirmado')" ${item.confirmado === 'confirmado' ? 'disabled' : ''}>Vou estar la</button>
          <button class="btn btn-warning btn-sm" onclick="confirmar('${item.id}','talvez')" ${item.confirmado === 'talvez' ? 'disabled' : ''}>Talvez</button>
          <button class="btn btn-danger btn-sm" onclick="confirmar('${item.id}','recusado')" ${item.confirmado === 'recusado' ? 'disabled' : ''}>Não posso</button>
          <button class="btn btn-sm btn-primary" onclick="openAddSong('${item.escala_id}')">+ Adicionar música</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderConfirmBadge(status) {
  if (status === 'confirmado') return '<span class="badge badge-success">Confirmado</span>';
  if (status === 'recusado') return '<span class="badge badge-danger">Recusado</span>';
  if (status === 'talvez') return '<span class="badge badge-warning">Talvez</span>';
  return '<span class="badge">Pendente</span>';
}

window.confirmar = async function (id, status) {
  try {
    await API.post('/confirmations/' + id + '/confirmar', { status });
    location.reload();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.openAddSong = async function (escalaId) {
  try {
    const [songs, schedule] = await Promise.all([
      API.get('/songs'),
      API.get('/schedules/' + escalaId)
    ]);
    allSongs = songs;
    currentScheduleMusicas = schedule.musicas || [];
    const available = songs.filter(s => !currentScheduleMusicas.some(m => m.musica_id === s.id));
    if (available.length === 0) {
      alert('Todas as músicas já foram adicionadas à esta escala.');
      return;
    }
    const select = document.getElementById('song-select');
    if (select) {
      select.innerHTML = '<option value="">Selecione uma música...</option>' +
        available.map(s => `<option value="${s.id}">${escapeHtml(s.titulo)}${s.artista ? ' - ' + escapeHtml(s.artista) : ''}</option>`).join('');
    }
    document.getElementById('add-song-escala-id').value = escalaId;
    const ordem = (currentScheduleMusicas.length || 0) + 1;
    document.getElementById('add-song-ordem').value = ordem;
    openModal('modal-add-song');
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.saveSongToSchedule = async function () {
  const escalaId = document.getElementById('add-song-escala-id').value;
  const musicaId = document.getElementById('song-select').value;
  const ordem = document.getElementById('add-song-ordem').value;
  if (!musicaId) {
    alert('Selecione uma música.');
    return;
  }
  try {
    await API.post('/schedules/' + escalaId + '/musicas', { musica_id: musicaId, ordem: parseInt(ordem) || 1 });
    closeModal('modal-add-song');
    location.reload();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.removeSongFromSchedule = async function (escalaId, escalaMusicaId) {
  if (!confirm('Remover esta música da escala?')) return;
  try {
    await API.del('/schedules/' + escalaId + '/musicas/' + escalaMusicaId);
    location.reload();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

async function loadScheduleMusicas() {
  const containers = document.querySelectorAll('[id^="musicas-"]');
  for (const c of containers) {
    const escalaId = c.id.replace('musicas-', '');
    try {
      const sc = await API.get('/schedules/' + escalaId);
      if (!sc.musicas || sc.musicas.length === 0) {
        c.innerHTML = '<p class="empty" style="margin:0.5rem 0;font-size:0.85rem;">Nenhuma música na escala ainda.</p>';
      } else {
        c.innerHTML = sc.musicas.map(m => `
          <div class="schedule-musica-item">
            <span><b>${m.ordem}.</b> ${escapeHtml(m.titulo || '?')}${m.artista ? ' <small>(' + escapeHtml(m.artista) + ')</small>' : ''}</span>
            <button class="btn-icon" onclick="removeSongFromSchedule('${escalaId}','${m.id}')" title="Remover">&times;</button>
          </div>
        `).join('');
      }
    } catch (e) {
      c.innerHTML = `<p class="empty">Erro: ${escapeHtml(e.message)}</p>`;
    }
  }
}

setTimeout(loadScheduleMusicas, 100);
