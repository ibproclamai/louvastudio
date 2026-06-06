(function() {
  async function init() {
    const user = await requireAuth();
    Sidebar.setup(user, '/dashboard.html');
    const first = (user.nome || '').split(' ')[0] || user.nome;
    const welcome = document.getElementById('welcome-name');
    if (welcome) welcome.textContent = first;

    try {
      const min = await API.get('/ministerios/me');
      const ctx = document.getElementById('min-context');
      if (ctx && min) ctx.textContent = min.nome + (min.descricao ? ' · ' + min.descricao : '');
    } catch (e) {}

    try {
      const [songs, schedules, members, devs, allSchedules] = await Promise.all([
        API.get('/songs'),
        API.get('/schedules'),
        API.get('/members'),
        API.get('/devocionais'),
        API.get('/schedules')
      ]);
      document.getElementById('stat-songs').textContent = (songs || []).length;
      document.getElementById('stat-schedules').textContent = (schedules || []).filter(s => s.status !== 'rascunho' || true).length;
      document.getElementById('stat-members').textContent = (members || []).filter(m => m.ativo !== 'false').length;
      document.getElementById('stat-devs').textContent = (devs || []).length;

      const today = new Date();
      today.setHours(0,0,0,0);
      const future = (allSchedules || [])
        .filter(s => s.data_culto && new Date(s.data_culto + 'T00:00:00') >= today)
        .sort((a, b) => (a.data_culto || '').localeCompare(b.data_culto || ''));
      if (future.length > 0) {
        const next = future[0];
        const card = document.getElementById('next-service-card');
        card.classList.remove('hidden');
        document.getElementById('next-service-title').textContent = next.tipo_culto || 'Culto';
        const dt = new Date(next.data_culto + 'T00:00:00');
        document.getElementById('next-service-date').textContent =
          dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) +
          (next.local ? ' · ' + next.local : '') +
          (next.hora_inicio ? ' · ' + next.hora_inicio : '');
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
