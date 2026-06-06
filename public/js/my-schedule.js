(async function () {
  const user = await loadUser();
  if (!user) return;
  setupLogout();
  setupAdminVisibility(user);

  try {
    const items = await API.get('/confirmations/minhas');
    const container = document.getElementById('my-schedules');
    if (items.length === 0) {
      container.innerHTML = '<p class="empty">Voce nao esta em nenhuma escala. Peca ao administrador para inclui-lo.</p>';
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const sorted = [...items].sort((a, b) => a.data_culto.localeCompare(b.data_culto));
    const upcoming = sorted.filter(i => i.data_culto >= today);
    const past = sorted.filter(i => i.data_culto < today);

    container.innerHTML = '';
    if (upcoming.length > 0) {
      container.innerHTML += '<h2 class="section" style="margin-top:0">Proximas</h2>' + upcoming.map(renderItem).join('');
    }
    if (past.length > 0) {
      container.innerHTML += '<h2 class="section">Passadas</h2>' + past.map(renderItem).join('');
    }
  } catch (err) {
    document.getElementById('my-schedules').innerHTML = `<p class="empty">Erro: ${escapeHtml(err.message)}</p>`;
  }
})();

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
          <p>${item.local ? escapeHtml(item.local) + ' &middot; ' : ''}${escapeHtml(item.funcao_na_escala || 'Equipe')}</p>
          <p>${renderConfirmBadge(item.confirmado)}</p>
        </div>
      </div>
      ${!isPast ? `
        <div class="confirm-buttons">
          <button class="btn btn-success btn-sm" onclick="confirm('${item.id}','confirmado')" ${item.confirmado === 'confirmado' ? 'disabled' : ''}>Vou estar la</button>
          <button class="btn btn-warning btn-sm" onclick="confirm('${item.id}','talvez')" ${item.confirmado === 'talvez' ? 'disabled' : ''}>Talvez</button>
          <button class="btn btn-danger btn-sm" onclick="confirm('${item.id}','recusado')" ${item.confirmado === 'recusado' ? 'disabled' : ''}>Nao posso</button>
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

window.confirm = async function (id, status) {
  try {
    await API.post('/confirmations/' + id + '/confirmar', { status });
    location.reload();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};
