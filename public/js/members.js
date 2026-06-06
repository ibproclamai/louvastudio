let allMembers = [];
let currentUser = null;

(async function () {
  currentUser = await loadUser();
  if (!currentUser) return;
  setupLogout();
  setupAdminVisibility(currentUser);

  document.getElementById('btn-new-member').addEventListener('click', () => openMemberForm());
  document.getElementById('form-member').addEventListener('submit', saveMember);
  document.getElementById('search-member').addEventListener('input', renderMembers);

  await loadMembers();
})();

async function loadMembers() {
  try {
    allMembers = await API.get('/members');
    renderMembers();
  } catch (err) {
    document.getElementById('members-list').innerHTML = `<p class="empty">Erro: ${escapeHtml(err.message)}</p>`;
  }
}

function renderMembers() {
  const q = (document.getElementById('search-member').value || '').toLowerCase();
  const filtered = allMembers.filter(m =>
    !q || (m.nome || '').toLowerCase().includes(q) || (m.funcao || '').toLowerCase().includes(q)
  );

  const container = document.getElementById('members-list');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty">Nenhum membro encontrado.</p>';
    return;
  }

  const isAdmin = currentUser && currentUser.perfil === 'admin';
  container.innerHTML = filtered.map(m => `
    <div class="card">
      <div class="card-title">${escapeHtml(m.nome)}</div>
      <div class="card-meta">${m.funcao ? '<span class="badge badge-primary">' + escapeHtml(m.funcao) + '</span>' : ''}
        ${m.ativo === 'true' ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}
      </div>
      <div class="card-body">
        ${m.telefone ? '&#128222; ' + escapeHtml(m.telefone) + '<br>' : ''}
        ${m.email ? '&#9993; ' + escapeHtml(m.email) + '<br>' : ''}
        ${m.disponibilidade ? '<small><b>Disponibilidade:</b> ' + escapeHtml(m.disponibilidade) + '</small>' : ''}
      </div>
      ${isAdmin ? `
        <div class="card-actions">
          <button class="btn btn-sm" onclick="openMemberForm('${m.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMember('${m.id}')">Excluir</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

window.openMemberForm = function (id) {
  document.getElementById('modal-title').textContent = id ? 'Editar membro' : 'Novo membro';
  const form = document.getElementById('form-member');
  form.reset();
  if (id) {
    const m = allMembers.find(x => x.id === id);
    if (m) {
      form.nome.value = m.nome || '';
      form.funcao.value = m.funcao || '';
      form.telefone.value = m.telefone || '';
      form.email.value = m.email || '';
      form.disponibilidade.value = m.disponibilidade || '';
      form.ativo.checked = m.ativo === 'true';
      form.id.value = m.id;
    }
  }
  openModal('modal-member');
};

async function saveMember(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const body = {
    nome: form.nome.value.trim(),
    funcao: form.funcao.value,
    telefone: form.telefone.value.trim(),
    email: form.email.value.trim(),
    disponibilidade: form.disponibilidade.value.trim(),
    ativo: form.ativo.checked
  };
  try {
    if (id) await API.put('/members/' + id, body);
    else await API.post('/members', body);
    closeModal('modal-member');
    await loadMembers();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

window.deleteMember = async function (id) {
  if (!confirm('Excluir este membro?')) return;
  try {
    await API.del('/members/' + id);
    await loadMembers();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
};
