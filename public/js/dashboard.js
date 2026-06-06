(async function () {
  const user = await loadUser();
  if (!user) return;
  setupLogout();
  setupAdminVisibility(user);

  const firstName = (user.nome || '').split(' ')[0] || user.nome;
  const welcomeEl = document.getElementById('welcome-name');
  if (welcomeEl) welcomeEl.textContent = firstName;

  try {
    const cfg = await API.get('/config');
    if (!cfg.nome_igreja && user.perfil === 'admin') {
      const banner = document.createElement('div');
      banner.className = 'card';
      banner.style.cssText = 'background:linear-gradient(135deg,#ec4899,#f59e0b);color:white;border:none;margin-bottom:1.5rem';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <div style="font-size:2.5rem">&#127968;</div>
          <div style="flex:1;min-width:200px">
            <h3 style="margin:0 0 0.25rem">Bem-vindo ao Louva.Studio!</h3>
            <p style="margin:0;opacity:0.95">Cadastre os dados da sua igreja para começar.</p>
          </div>
          <a href="/igreja.html" class="btn" style="background:white;color:#ec4899">Cadastrar Igreja</a>
        </div>
      `;
      const main = document.querySelector('main.container') || document.querySelector('main');
      if (main && !document.getElementById('church-banner')) {
        banner.id = 'church-banner';
        main.insertBefore(banner, main.firstChild);
      }
    }
  } catch (e) { console.error(e); }

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
        <p>${s.membros.length} membro(s) &middot; ${s.músicas.length} música(s) ${s.local ? '&middot; ' + escapeHtml(s.local) : ''}</p>
      </div>
      <div class="schedule-actions">
        <a href="/schedules.html" class="btn btn-sm">Ver</a>
      </div>
    </div>
  `;
}
