(async function () {
  const user = await loadUser();
  if (!user) return;
  setupLogout();
  setupAdminVisibility(user);

  try {
    const [members, songs, schedules] = await Promise.all([
      API.get('/members'),
      API.get('/songs'),
      API.get('/schedules')
    ]);

    document.getElementById('stat-members').textContent = members.filter(m => m.ativo === 'true').length;
    document.getElementById('stat-songs').textContent = songs.length;
    document.getElementById('stat-schedules').textContent = schedules.length;

    const pending = schedules.reduce((acc, s) =>
      acc + s.membros.filter(m => !m.confirmado).length, 0);
    document.getElementById('stat-pending').textContent = pending;

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = schedules
      .filter(s => s.data_culto >= today)
      .sort((a, b) => a.data_culto.localeCompare(b.data_culto))
      .slice(0, 5);

    const container = document.getElementById('next-schedules');
    if (upcoming.length === 0) {
      container.innerHTML = '<p class="empty">Nenhuma escala futura cadastrada.</p>';
    } else {
      container.innerHTML = upcoming.map(s => renderScheduleItem(s, true)).join('');
    }
  } catch (err) {
    document.getElementById('next-schedules').innerHTML = `<p class="empty">Erro: ${escapeHtml(err.message)}</p>`;
  }
})();

function renderScheduleItem(s, compact = false) {
  const d = new Date(s.data_culto + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `
    <div class="schedule-item">
      <div class="schedule-date">
        <div class="day">${day}</div>
        <div class="month">${month}</div>
      </div>
      <div class="schedule-info">
        <h3>${escapeHtml(s.tipo_culto || 'Culto')}</h3>
        <p>${s.membros.length} membro(s) &middot; ${s.musicas.length} musica(s) ${s.local ? '&middot; ' + escapeHtml(s.local) : ''}</p>
      </div>
      <div class="schedule-actions">
        <a href="/schedules.html" class="btn btn-sm">Ver</a>
      </div>
    </div>
  `;
}
