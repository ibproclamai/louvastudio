let allSchedules = [];
let allMembers = [];
let allSongs = [];
let allVS = [];
let currentUser = null;
let editingSchedule = null;

const selectedMembers = [];
const selectedSongs = [];

(async function () {
  currentUser = await requireAuth();
  if (!currentUser) return;
  Sidebar.setup(currentUser, '/schedules.html');

  document.getElementById('btn-new-schedule').addEventListener('click', () => openScheduleForm());
  document.getElementById('form-schedule').addEventListener('submit', saveSchedule);
  document.getElementById('btn-add-member').addEventListener('click', addMemberToSchedule);
  document.getElementById('btn-add-song').addEventListener('click', addSongToSchedule);
  document.getElementById('filter-status').addEventListener('change', renderSchedules);

  await loadAll();
})();

async function loadAll() {
  try {
    [allMembers, allSongs, allVS] = await Promise.all([
      API.get('/members'),
      API.get('/songs'),
      API.get('/vs')
    ]);
    await loadSchedules();
  } catch (err) {
    document.getElementById('schedules-list').innerHTML = `<p class="empty">Erro: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadSchedules() {
  allSchedules = await API.get('/schedules');
  renderSchedules();
}

function renderSchedules() {
  const container = document.getElementById('schedules-list');
  if (allSchedules.length === 0) {
    container.innerHTML = '<p class="empty">Nenhuma escala cadastrada. Crie a primeira!</p>';
    return;
  }
  const isAdmin = currentUser && currentUser.perfil === 'admin';
  const filterStatus = document.getElementById('filter-status').value;
  let sorted = [...allSchedules].sort((a, b) => b.data_culto.localeCompare(a.data_culto));
  if (filterStatus) sorted = sorted.filter(s => (s.status || 'rascunho') === filterStatus);

  if (sorted.length === 0) {
    container.innerHTML = '<p class="empty">Nenhuma escala com esse filtro.</p>';
    return;
  }

  container.innerHTML = sorted.map(s => {
    const d = new Date(s.data_culto + 'T00:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const confirmed = s.membros.filter(m => m.confirmado === 'confirmado').length;
    const status = s.status || 'rascunho';
    return `
      <div class="card" id="schedule-${s.id}">
        <div class="schedule-item" style="box-shadow:none; padding:0;">
          <div class="schedule-date">
            <div class="day">${day}</div>
            <div class="month">${month}</div>
          </div>
          <div class="schedule-info">
            <h3>${escapeHtml(s.tipo_culto || 'Culto')} <span class="status-badge status-${status}">${status === 'publicada' ? 'Publicada' : 'Rascunho'}</span></h3>
            <p>${s.local ? escapeHtml(s.local) + ' &middot; ' : ''}${s.membros.length} membro(s) (${confirmed} confirmado(s)) &middot; ${s.músicas.length} música(s)</p>
          </div>
          <div class="schedule-actions">
            ${isAdmin ? `<button class="btn btn-sm" onclick="editSchedule('${s.id}')">Editar</button>
            <button class="btn btn-sm ${status === 'publicada' ? '' : 'btn-success'}" onclick="togglePublish('${s.id}', '${status}')">${status === 'publicada' ? 'Voltar p/ rascunho' : 'Publicar'}</button>
            <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${s.id}')">Excluir</button>` : ''}
            <button class="btn btn-sm" onclick="printSchedule('${s.id}')">Imprimir</button>
          </div>
        </div>
        <div class="schedule-detail">
          ${s.membros.length > 0 ? `<h4>Membros</h4><ul>${s.membros.map(m =>
            `<li>${escapeHtml(m.membro_nome || '?')} ${m.membro_função ? '<small>(' + escapeHtml(m.membro_função) + ')</small>' : ''}
             ${m.função_na_escala ? ' &mdash; ' + escapeHtml(m.função_na_escala) : ''}
             ${renderConfirmBadge(m.confirmado)}</li>`).join('')}</ul>` : ''}
          ${s.músicas.length > 0 ? `<h4>Músicas</h4><ul>${s.músicas.map(mu =>
            `<li>${mu.ordem}. ${escapeHtml(mu.título || '?')} ${mu.artista ? '<small>- ' + escapeHtml(mu.artista) + '</small>' : ''}
             ${mu.tom ? '<span class="badge badge-primary">' + escapeHtml(mu.tom) + '</span>' : ''}
             ${mu.vs ? '<span class="badge badge-' + escapeHtml(mu.vs.tipo) + '">VS: ' + escapeHtml(mu.vs.nome) + '</span>' : ''}
             ${mu.vs && mu.vs.tipo === 'multitrack' ? `<a class="btn btn-sm btn-primary" style="margin-left:0.4rem" href="/multitrack.html?vs=${encodeURIComponent(mu.vs.id)}&schedule=${encodeURIComponent(s.id)}" target="_blank">&#9654; Tocar Multitrack</a>` : ''}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderConfirmBadge(status) {
  if (status === 'confirmado') return ' <span class="badge badge-success">Confirmado</span>';
  if (status === 'recusado') return ' <span class="badge badge-danger">Recusado</span>';
  if (status === 'talvez') return ' <span class="badge badge-warning">Talvez</span>';
  return ' <span class="badge">Pendente</span>';
}

window.editSchedule = async function (id) {
  const s = allSchedules.find(x => x.id === id);
  if (!s) return;
  editingSchedule = s;
  document.getElementById('modal-title').textContent = 'Editar escala';
  const form = document.getElementById('form-schedule');
  form.reset();
  form.id.value = s.id;
  form.data_culto.value = s.data_culto;
  form.tipo_culto.value = s.tipo_culto || '';
  form.local.value = s.local || '';
  form.observações.value = s.observações || '';
  const statusSel = form.elements['status'];
  if (statusSel) statusSel.value = s.status || 'rascunho';

  selectedMembers.length = 0;
  s.membros.forEach(m => selectedMembers.push({
    membro_id: m.membro_id,
    função_na_escala: m.função_na_escala || m.membro_função || ''
  }));
  selectedSongs.length = 0;
  s.músicas.forEach(mu => selectedSongs.push({ música_id: mu.música_id, ordem: Number(mu.ordem), vs_id: mu.vs_id || '' }));

  renderMemberPicker();
  renderSongPicker();
  openModal('modal-schedule');
};

window.openScheduleForm = function () {
  editingSchedule = null;
  document.getElementById('modal-title').textContent = 'Nova escala';
  const form = document.getElementById('form-schedule');
  form.reset();
  selectedMembers.length = 0;
  selectedSongs.length = 0;
  renderMemberPicker();
  renderSongPicker();
  openModal('modal-schedule');
};

function renderMemberPicker() {
  const c = document.getElementById('schedule-members');
  if (selectedMembers.length === 0) {
    c.innerHTML = '<p class="empty">Nenhum membro adicionado.</p>';
    return;
  }
  c.innerHTML = selectedMembers.map((sm, idx) => {
    const m = allMembers.find(mm => mm.id === sm.membro_id);
    return `
      <div class="checkbox-item">
        <strong>${escapeHtml(m ? m.nome : '?')}</strong>
        <input type="text" placeholder="Função na escala" value="${escapeHtml(sm.função_na_escala || '')}"
          onchange="updateMemberRole(${idx}, this.value)">
        <span class="remove" onclick="removeMemberFromSchedule(${idx})">&#10005;</span>
      </div>
    `;
  }).join('');
}

function renderSongPicker() {
  const c = document.getElementById('schedule-songs');
  if (selectedSongs.length === 0) {
    c.innerHTML = '<p class="empty">Nenhuma música adicionada.</p>';
    return;
  }
  c.innerHTML = selectedSongs
    .sort((a, b) => a.ordem - b.ordem)
    .map((ss, idx) => {
      const s = allSongs.find(ss2 => ss2.id === ss.música_id);
      const vsList = (s && s.vs_list) || [];
      const currentVS = vsList.find(v => v.id === ss.vs_id);
      return `
        <div class="song-pick-item" style="flex-wrap:wrap">
          <span><b>${ss.ordem}.</b> ${escapeHtml(s ? s.título : '?')} ${s && s.tom ? '<span class="badge badge-primary">' + escapeHtml(s.tom) + '</span>' : ''}</span>
          ${vsList.length > 0 ? `<select onchange="updateSongVS(${idx}, this.value)" style="margin-left:auto;padding:0.3rem;font-size:0.85rem">
            <option value="">Sem VS</option>
            ${vsList.map(v => `<option value="${v.id}" ${currentVS && currentVS.id === v.id ? 'selected' : ''}>VS: ${escapeHtml(v.nome)} (${escapeHtml(v.tipo)})</option>`).join('')}
          </select>` : ''}
          <span class="remove" onclick="removeSongFromSchedule(${idx})">&#10005;</span>
        </div>
      `;
    }).join('');
}

window.addMemberToSchedule = function () {
  const available = allMembers.filter(m => !selectedMembers.find(sm => sm.membro_id === m.id));
  if (available.length === 0) { alert('Todos os membros já foram adicionados.'); return; }
  const select = document.createElement('select');
  select.innerHTML = '<option value="">Selecione um membro...</option>' +
    available.map(m => `<option value="${m.id}">${escapeHtml(m.nome)} ${m.função ? '(' + escapeHtml(m.função) + ')' : ''}</option>`).join('');
  select.onchange = () => {
    if (select.value) {
      const m = allMembers.find(mm => mm.id === select.value);
      selectedMembers.push({ membro_id: select.value, função_na_escala: m.função || '' });
      renderMemberPicker();
    }
  };
  const c = document.getElementById('schedule-members');
  if (selectedMembers.length === 0) c.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'checkbox-item';
  wrap.appendChild(select);
  c.appendChild(wrap);
};

window.addSongToSchedule = function () {
  const available = allSongs.filter(s => !selectedSongs.find(ss => ss.música_id === s.id));
  if (available.length === 0) { alert('Todas as músicas já foram adicionadas.'); return; }
  const select = document.createElement('select');
  select.innerHTML = '<option value="">Selecione uma música...</option>' +
    available.map(s => `<option value="${s.id}">${escapeHtml(s.título)} ${s.artista ? '- ' + escapeHtml(s.artista) : ''}</option>`).join('');
  select.onchange = () => {
    if (select.value) {
      const ordem = selectedSongs.length === 0 ? 1 : Math.max(...selectedSongs.map(s => s.ordem)) + 1;
      selectedSongs.push({ música_id: select.value, ordem, vs_id: '' });
      renderSongPicker();
    }
  };
  const c = document.getElementById('schedule-songs');
  if (selectedSongs.length === 0) c.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'song-pick-item';
  wrap.appendChild(select);
  c.appendChild(wrap);
};

window.updateMemberRole = function (idx, value) {
  if (selectedMembers[idx]) selectedMembers[idx].função_na_escala = value;
};

window.updateSongVS = function (idx, vsId) {
  if (selectedSongs[idx]) selectedSongs[idx].vs_id = vsId || '';
};

window.removeMemberFromSchedule = function (idx) {
  selectedMembers.splice(idx, 1);
  renderMemberPicker();
};

window.removeSongFromSchedule = function (idx) {
  selectedSongs.splice(idx, 1);
  renderSongPicker();
};

async function saveSchedule(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const statusVal = form.elements['status'] ? form.elements['status'].value : 'rascunho';
  const body = {
    data_culto: form.data_culto.value,
    tipo_culto: form.tipo_culto.value,
    local: form.local.value,
    observações: form.observações.value,
    status: statusVal,
    membros: selectedMembers.map(m => ({ membro_id: m.membro_id, função_na_escala: m.função_na_escala })),
    músicas: selectedSongs.map(s => ({ música_id: s.música_id, ordem: s.ordem, vs_id: s.vs_id || '' }))
  };
  try {
    if (id) await API.put('/schedules/' + id, body);
    else await API.post('/schedules', body);
    closeModal('modal-schedule');
    await loadSchedules();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

window.deleteSchedule = async function (id) {
  if (!confirm('Excluir esta escala?')) return;
  try {
    await API.del('/schedules/' + id);
    await loadSchedules();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.togglePublish = async function (id, currentStatus) {
  const novo = currentStatus === 'publicada' ? 'rascunho' : 'publicada';
  try {
    await API.post('/schedules/' + id + '/publicar', { status: novo });
    await loadSchedules();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};

window.printSchedule = async function (id) {
  try {
    const [schedule, config] = await Promise.all([
      API.get('/schedules/' + id),
      API.get('/config').catch(() => ({}))
    ]);
    const d = new Date(schedule.data_culto + 'T00:00:00');
    const dataFmt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Escala - ${escapeHtml(schedule.tipo_culto || 'Culto')} - ${dataFmt}</title>
      <style>
        body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; padding: 1.5rem; color: #2d3436; max-width: 800px; margin: 0 auto; }
        h1 { color: #6c5ce7; margin-bottom: 0.25rem; }
        h2 { color: #6c5ce7; border-bottom: 2px solid #6c5ce7; padding-bottom: 0.3rem; margin-top: 1.5rem; }
        .meta { color: #636e72; margin-bottom: 1rem; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
        .info-grid div { padding: 0.4rem 0.6rem; background: #f5f6fa; border-radius: 4px; }
        ul { list-style: none; padding-left: 0; }
        li { padding: 0.4rem 0; border-bottom: 1px solid #dfe6e9; }
        .footer { margin-top: 2rem; text-align: center; color: #636e72; font-size: 0.85rem; font-style: italic; }
        .vs { color: #6c5ce7; font-size: 0.85rem; margin-left: 0.5rem; }
        .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem; background: #e0d4f5; color: #6c5ce7; margin-left: 0.25rem; }
        @média print { body { padding: 0.5rem; } .no-print { display: none; } }
      </style></head><body>
      <div class="no-print" style="text-align:right;margin-bottom:1rem"><button onclick="window.print()" style="padding:0.5rem 1rem;background:#6c5ce7;color:white;border:none;border-radius:4px;cursor:pointer">Imprimir</button></div>
      <h1>${escapeHtml(config.nome_igreja || 'Ministério de Louvor')}</h1>
      <div class="meta">${config.endereco ? escapeHtml(config.endereco) : ''}${config.cidade ? ' - ' + escapeHtml(config.cidade) : ''}</div>
      <h2>${escapeHtml(schedule.tipo_culto || 'Culto')}</h2>
      <div class="info-grid">
        <div><b>Data:</b> ${dataFmt}</div>
        <div><b>Local:</b> ${escapeHtml(schedule.local || '-')}</div>
        <div><b>Status:</b> ${schedule.status === 'publicada' ? 'Publicada' : 'Rascunho'}</div>
        <div><b>Lider de Louvor:</b> ${escapeHtml(config.louvor_responsavel || '-')}</div>
      </div>
      ${schedule.observações ? '<p><b>Observações:</b> ' + escapeHtml(schedule.observações) + '</p>' : ''}
      <h2>Equipe</h2>
      <ul>${schedule.membros.map(m => '<li>' + escapeHtml(m.membro_nome || '?') +
        (m.membro_função ? ' <small>(' + escapeHtml(m.membro_função) + ')</small>' : '') +
        (m.função_na_escala ? ' - <b>' + escapeHtml(m.função_na_escala) + '</b>' : '') + '</li>').join('')}</ul>
      <h2>Repertório</h2>
      <ul>${schedule.músicas.map(mu => '<li><b>' + mu.ordem + '.</b> ' + escapeHtml(mu.título || '?') +
        (mu.artista ? ' <small>(' + escapeHtml(mu.artista) + ')</small>' : '') +
        (mu.tom ? '<span class="badge">Tom: ' + escapeHtml(mu.tom) + '</span>' : '') +
        (mu.vs ? '<span class="vs">VS: ' + escapeHtml(mu.vs.nome) + '</span>' : '') + '</li>').join('')}</ul>
      <div class="footer">${escapeHtml(config.mensagem_rodape || 'Que o louvor seja para a glória de Deus!')}</div>
      </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};
