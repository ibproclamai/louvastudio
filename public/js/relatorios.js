let charts = {};

(async function () {
  const user = await loadUser();
  if (!user) return;
  if (user.perfil !== 'admin') {
    document.querySelector('main').innerHTML = '<p class="empty">Acesso restrito a administradores.</p>';
    return;
  }
  setupLogout();
  document.getElementById('btn-refresh').addEventListener('click', loadAll);
  await loadAll();
})();

async function loadAll() {
  try {
    document.getElementById('report-error').classList.add('hidden');
    const [overview, topSongs, topMembers, schedulesByMonth, membersByFunction, pending] = await Promise.all([
      API.get('/reports/overview'),
      API.get('/reports/top-songs'),
      API.get('/reports/top-members'),
      API.get('/reports/schedules-by-month'),
      API.get('/reports/members-by-function'),
      API.get('/reports/pending-confirmations')
    ]);
    renderKPIs(overview);
    renderSchedulesChart(schedulesByMonth);
    renderConfirmationsChart(overview.confirmacoes);
    renderTopSongsChart(topSongs);
    renderFunctionsChart(membersByFunction);
    renderTopSongsTable(topSongs);
    renderTopMembersTable(topMembers);
    renderPendingTable(pending);
  } catch (e) {
    document.getElementById('report-error').classList.remove('hidden');
    document.getElementById('report-error').querySelector('p').textContent = 'Erro ao carregar: ' + e.message;
  }
}

function renderKPIs(o) {
  document.getElementById('kpi-membros').textContent = o.membros;
  document.getElementById('kpi-musicas').textContent = o.musicas;
  document.getElementById('kpi-escalas').textContent = `${o.escalasPublicadas}/${o.escalas}`;
  document.getElementById('kpi-taxa').textContent = o.confirmacoes.taxa + '%';
}

const PALETTE = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e', '#3b82f6', '#84cc16', '#a855f7'];

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function renderSchedulesChart(data) {
  destroyChart('schedules');
  const labels = data.map(d => {
    const [y, m] = d.mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(m) - 1]}/${y.substring(2)}`;
  });
  charts.schedules = new Chart(document.getElementById('chart-schedules'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Escalas',
        data: data.map(d => d.count),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#6366f1',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderConfirmationsChart(c) {
  destroyChart('confirmations');
  charts.confirmations = new Chart(document.getElementById('chart-confirmations'), {
    type: 'doughnut',
    data: {
      labels: ['Confirmado', 'Recusado', 'Talvez', 'Pendente'],
      datasets: [{
        data: [c.confirmado || 0, c.recusado || 0, c.talvez || 0, c.pendente || 0],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#64748b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '65%'
    }
  });
}

function renderTopSongsChart(data) {
  destroyChart('topSongs');
  if (data.length === 0) {
    document.getElementById('chart-top-songs').parentElement.querySelector('h3').innerHTML += ' <small>(sem dados)</small>';
    return;
  }
  charts.topSongs = new Chart(document.getElementById('chart-top-songs'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.titulo.length > 25 ? d.titulo.substring(0, 22) + '...' : d.titulo),
      datasets: [{
        label: 'Vezes tocada',
        data: data.map(d => d.count),
        backgroundColor: PALETTE,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderFunctionsChart(data) {
  destroyChart('functions');
  if (data.length === 0) return;
  charts.functions = new Chart(document.getElementById('chart-functions'), {
    type: 'pie',
    data: {
      labels: data.map(d => d.funcao),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: PALETTE,
        borderWidth: 2,
        borderColor: 'rgba(15, 23, 42, 0.3)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } }
    }
  });
}

function renderTopSongsTable(data) {
  const tbody = document.querySelector('#table-top-songs tbody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhuma musica escalada ainda.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(s.titulo)}</strong></td>
      <td>${escapeHtml(s.artista || '-')}</td>
      <td>${s.tom ? `<span class="badge badge-primary">${escapeHtml(s.tom)}</span>` : '-'}</td>
      <td><strong>${s.count}x</strong></td>
    </tr>
  `).join('');
}

function renderTopMembersTable(data) {
  const tbody = document.querySelector('#table-top-members tbody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum membro em escalas ainda.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(m.nome)}</strong></td>
      <td>${escapeHtml(m.funcao || '-')}</td>
      <td>${m.count}</td>
      <td>${m.confirmados}</td>
      <td>
        <div class="progress-bar-inline">
          <div class="progress-fill" style="width:${m.taxa}%; background:${m.taxa >= 75 ? 'var(--success)' : m.taxa >= 50 ? 'var(--warning)' : 'var(--danger)'}"></div>
          <span>${m.taxa}%</span>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPendingTable(data) {
  const tbody = document.querySelector('#table-pending tbody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty" style="color: var(--success);">&#9989; Nenhuma confirmacao pendente!</td></tr>';
    return;
  }
  tbody.innerHTML = data.slice(0, 20).map(p => {
    const d = new Date(p.escala_data + 'T00:00:00');
    const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td>${dataFmt}</td>
        <td>${escapeHtml(p.escala_tipo || 'Culto')}</td>
        <td><strong>${escapeHtml(p.membro_nome)}</strong></td>
        <td>${escapeHtml(p.funcao || '-')}</td>
      </tr>
    `;
  }).join('') + (data.length > 20 ? `<tr><td colspan="4" class="empty">+ ${data.length - 20} mais...</td></tr>` : '');
}
