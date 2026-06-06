let allEventos = [];
let allMembers = [];
let currentView = 'calendar';
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let currentFilter = '';
let currentSearch = '';
let currentParticipants = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;
  Sidebar.setup(user, '/eventos.html');
  showUserName(user);
  applyAdminVisibility(user);
  loadTipos();
  await loadMembers();
  await loadEventos();
  bindEvents();
});

function applyAdminVisibility(user) {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = user.perfil === 'admin' ? '' : 'none';
  });
}

async function loadTipos() {
  const tipos = await api('/api/events/tipos/list');
  const sel = document.getElementById('ev-tipo');
  const chips = document.getElementById('filter-tipos');
  chips.innerHTML = '<button class="chip active" data-tipo="">Todos</button>';
  tipos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    sel.appendChild(opt);
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.tipo = t.value;
    chip.style.borderColor = t.cor;
    chip.textContent = t.label;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = t.value;
      renderCurrentView();
    });
    chips.appendChild(chip);
  });
  document.querySelector('.filter-chips .chip').addEventListener('click', e => {
    document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentFilter = '';
    renderCurrentView();
  });
  sel.addEventListener('change', e => {
    const opt = sel.querySelector(`option[value="${e.target.value}"]`);
    document.getElementById('ev-cor').value = opt?.dataset.color || '#6366f1';
  });
}

async function loadMembers() {
  allMembers = await api('/api/members');
  const sel = document.getElementById('select-membro');
  allMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.nome}${m.função ? ' (' + m.função + ')' : ''}`;
    sel.appendChild(opt);
  });
}

async function loadEventos() {
  allEventos = await api('/api/events');
  renderCurrentView();
}

function bindEvents() {
  document.getElementById('btn-new-event').addEventListener('click', openCreateModal);
  document.getElementById('form-evento').addEventListener('submit', saveEvento);
  document.getElementById('btn-prev-month').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('btn-next-month').addEventListener('click', () => navigateMonth(1));
  document.querySelectorAll('.view-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentView = b.dataset.view;
      document.getElementById('calendar-view').style.display = currentView === 'calendar' ? '' : 'none';
      document.getElementById('list-view').style.display = currentView === 'list' ? '' : 'none';
      renderCurrentView();
    });
  });
  document.getElementById('search-input').addEventListener('input', e => {
    currentSearch = e.target.value.toLowerCase();
    renderCurrentView();
  });
  document.getElementById('btn-add-participant').addEventListener('click', addParticipant);
}

function renderCurrentView() {
  if (currentView === 'calendar') renderCalendar();
  else renderList();
}

function filteredEventos() {
  return allEventos.filter(e => {
    if (currentFilter && e.tipo !== currentFilter) return false;
    if (currentSearch && !e.título.toLowerCase().includes(currentSearch)) return false;
    return true;
  });
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('calendar-title').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const eventos = filteredEventos();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (dateStr === today.toISOString().slice(0, 10)) cell.classList.add('today');
    const dayNum = document.createElement('span');
    dayNum.className = 'cal-day-num';
    dayNum.textContent = d;
    cell.appendChild(dayNum);
    const dayEvents = eventos.filter(e => e.data === dateStr);
    dayEvents.forEach(e => {
      const ev = document.createElement('div');
      ev.className = 'cal-event';
      ev.style.background = e.cor || '#6366f1';
      ev.textContent = (e.hora_inicio ? e.hora_inicio + ' ' : '') + e.título;
      ev.title = e.título;
      ev.addEventListener('click', () => openDetail(e));
      cell.appendChild(ev);
    });
    grid.appendChild(cell);
  }
}

function renderList() {
  const container = document.getElementById('eventos-list');
  const eventos = filteredEventos();
  if (eventos.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum evento encontrado.</div>';
    return;
  }
  container.innerHTML = eventos.map(e => {
    const d = new Date(e.data + 'T00:00:00');
    const dataFmt = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    return `
      <div class="event-card" style="border-left-color:${e.cor || '#6366f1'}" onclick='openDetail(${JSON.stringify(e).replace(/'/g, "&#39;")})'>
        <div class="event-date">
          <span class="event-day">${d.getDate()}</span>
          <span class="event-month">${d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
        </div>
        <div class="event-info">
          <h3>${escapeHtml(e.título)}</h3>
          <div class="event-meta">
            <span class="badge" style="background:${e.cor || '#6366f1'}">${escapeHtml(e.tipo)}</span>
            ${e.hora_inicio ? `<span>&#9201; ${escapeHtml(e.hora_inicio)}${e.hora_fim ? ' - ' + escapeHtml(e.hora_fim) : ''}</span>` : ''}
            ${e.local ? `<span>&#128205; ${escapeHtml(e.local)}</span>` : ''}
            ${e.participantes?.length ? `<span>&#128101; ${e.participantes.length} participante(s)</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function navigateMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  renderCalendar();
}

function openCreateModal() {
  document.getElementById('modal-title').textContent = 'Novo Evento';
  document.getElementById('form-evento').reset();
  document.getElementById('ev-id').value = '';
  document.getElementById('ev-cor').value = '#6366f1';
  document.getElementById('participants-section').style.display = '';
  currentParticipants = [];
  renderParticipants();
  openModal('modal-evento');
}

function renderParticipants() {
  const ul = document.getElementById('participants-list');
  ul.innerHTML = currentParticipants.map((p, i) => {
    const m = allMembers.find(mm => mm.id === p.membro_id);
    return `<li><span>${escapeHtml(m?.nome || p.membro_id)}${p.função ? ' (' + escapeHtml(p.função) + ')' : ''}</span>
      <button type="button" onclick="removeParticipant(${i})" class="btn-icon">&times;</button></li>`;
  }).join('');
}

window.removeParticipant = (i) => {
  currentParticipants.splice(i, 1);
  renderParticipants();
};

function addParticipant() {
  const mid = document.getElementById('select-membro').value;
  const func = document.getElementById('participant-função').value;
  if (!mid) return toast('Selecione um membro', 'warn');
  if (currentParticipants.find(p => p.membro_id === mid)) return toast('Já adicionado', 'warn');
  currentParticipants.push({ membro_id: mid, função: func });
  document.getElementById('select-membro').value = '';
  document.getElementById('participant-função').value = '';
  renderParticipants();
}

async function saveEvento(e) {
  e.preventDefault();
  const id = document.getElementById('ev-id').value;
  const data = {
    data: document.getElementById('ev-data').value,
    hora_inicio: document.getElementById('ev-hora-inicio').value,
    hora_fim: document.getElementById('ev-hora-fim').value,
    tipo: document.getElementById('ev-tipo').value,
    título: document.getElementById('ev-título').value,
    local: document.getElementById('ev-local').value,
    descrição: document.getElementById('ev-descrição').value,
    cor: document.getElementById('ev-cor').value,
    participantes: currentParticipants
  };
  try {
    if (id) {
      await api(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      for (const p of (allEventos.find(x => x.id === id)?.participantes || [])) {
        try { await api(`/api/events/${id}/participantes/${p.id}`, { method: 'DELETE' }); } catch {}
      }
      for (const p of currentParticipants) {
        await api(`/api/events/${id}/participantes`, { method: 'POST', body: JSON.stringify({ membro_id: p.membro_id, função: p.função }) });
      }
    } else {
      await api('/api/events', { method: 'POST', body: JSON.stringify(data) });
    }
    closeModal('modal-evento');
    toast('Evento salvo!', 'success');
    await loadEventos();
  } catch (err) {
    toast(err.message || 'Erro ao salvar', 'error');
  }
}

function openDetail(e) {
  document.getElementById('detail-title').textContent = e.título;
  const d = new Date(e.data + 'T00:00:00');
  const dataFmt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  document.getElementById('detail-body').innerHTML = `
    <div class="detail-row"><span class="detail-label">Data:</span> ${dataFmt}</div>
    ${e.hora_inicio ? `<div class="detail-row"><span class="detail-label">Horario:</span> ${escapeHtml(e.hora_inicio)}${e.hora_fim ? ' - ' + escapeHtml(e.hora_fim) : ''}</div>` : ''}
    ${e.local ? `<div class="detail-row"><span class="detail-label">Local:</span> ${escapeHtml(e.local)}</div>` : ''}
    <div class="detail-row"><span class="detail-label">Tipo:</span> <span class="badge" style="background:${e.cor || '#6366f1'}">${escapeHtml(e.tipo)}</span></div>
    ${e.descrição ? `<div class="detail-row"><span class="detail-label">Descrição:</span><p>${escapeHtml(e.descrição)}</p></div>` : ''}
    ${e.participantes?.length ? `<h3 style="margin-top:1.5rem">Participantes (${e.participantes.length})</h3>
      <ul class="participants-display">${e.participantes.map(p => `<li>&#9836; ${escapeHtml(p.membro_nome)}${p.membro_função ? ' <small>(' + escapeHtml(p.membro_função) + ')</small>' : ''}${p.função ? ' - <em>' + escapeHtml(p.função) + '</em>' : ''}</li>`).join('')}</ul>` : ''}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="editEvento('${e.id}')">Editar</button>
      <button class="btn btn-danger" onclick="deleteEvento('${e.id}')">Excluir</button>
      <button class="btn btn-primary" onclick="closeModal('modal-detail')">Fechar</button>
    </div>
  `;
  openModal('modal-detail');
}

window.editEvento = (id) => {
  closeModal('modal-detail');
  const e = allEventos.find(x => x.id === id);
  if (!e) return;
  document.getElementById('modal-title').textContent = 'Editar Evento';
  document.getElementById('ev-id').value = e.id;
  document.getElementById('ev-título').value = e.título;
  document.getElementById('ev-tipo').value = e.tipo;
  document.getElementById('ev-data').value = e.data;
  document.getElementById('ev-hora-inicio').value = e.hora_inicio || '';
  document.getElementById('ev-hora-fim').value = e.hora_fim || '';
  document.getElementById('ev-local').value = e.local || '';
  document.getElementById('ev-descrição').value = e.descrição || '';
  document.getElementById('ev-cor').value = e.cor || '#6366f1';
  document.getElementById('participants-section').style.display = '';
  currentParticipants = (e.participantes || []).map(p => ({ membro_id: p.membro_id, função: p.função }));
  renderParticipants();
  openModal('modal-evento');
};

window.deleteEvento = async (id) => {
  if (!confirm('Excluir este evento?')) return;
  try {
    await api(`/api/events/${id}`, { method: 'DELETE' });
    closeModal('modal-detail');
    toast('Evento excluido', 'success');
    await loadEventos();
  } catch (e) { toast(e.message || 'Erro', 'error'); }
};
