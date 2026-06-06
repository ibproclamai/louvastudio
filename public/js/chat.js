let currentUser = null;
let lastMessageId = '';
let allMessages = [];
let allMembers = [];
let pollInterval = null;
let isSending = false;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  showUserName(currentUser);
  applyAdminVisibility(currentUser);
  setupLogout();
  setupNavToggle();
  await loadMembers();
  await loadMessages();
  startPolling();
  bindEvents();
});

function applyAdminVisibility(user) {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = user.perfil === 'admin' ? '' : 'none';
  });
}

function bindEvents() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('msg-input');
  form.addEventListener('submit', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  document.getElementById('btn-open-sidebar').addEventListener('click', () => {
    document.getElementById('chat-sidebar').classList.add('open');
  });
  document.getElementById('btn-close-sidebar').addEventListener('click', () => {
    document.getElementById('chat-sidebar').classList.remove('open');
  });
}

async function loadMembers() {
  allMembers = await api('/api/chat/members');
  const ul = document.getElementById('members-list');
  ul.innerHTML = allMembers.map(m => `
    <li class="member-item">
      <div class="avatar">${(m.nome || 'U').charAt(0).toUpperCase()}</div>
      <div class="member-info">
        <strong>${escapeHtml(m.nome)}</strong>
        <small>${escapeHtml(m.função || m.perfil || '')}</small>
      </div>
    </li>
  `).join('');
}

async function loadMessages(initial = true) {
  try {
    const url = initial ? '/api/chat/messages' : `/api/chat/messages?since=${lastMessageId}`;
    const newMsgs = await api(url);
    if (initial) {
      allMessages = newMsgs;
    } else if (newMsgs.length > 0) {
      allMessages = allMessages.concat(newMsgs);
    }
    if (allMessages.length > 0) lastMessageId = allMessages[allMessages.length - 1].id;
    setConnected(true);
    renderMessages();
  } catch (e) {
    setConnected(false);
  }
}

function startPolling() {
  pollInterval = setInterval(() => loadMessages(false), 5000);
  setInterval(() => {
    if (Date.now() - lastPollAt > 15000) setConnected(false);
  }, 2000);
  let lastPollAt = Date.now();
  const orig = loadMessages;
  loadMessages = async function(initial) { lastPollAt = Date.now(); setConnected(true); return orig(initial); };
}

function setConnected(ok) {
  const dot = document.getElementById('conn-dot');
  const txt = document.getElementById('conn-text');
  dot.className = 'conn-dot ' + (ok ? 'ok' : 'off');
  txt.textContent = ok ? 'Conectado' : 'Reconectando...';
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (allMessages.length === 0) {
    container.innerHTML = '<div class="empty-chat">Nenhuma mensagem ainda. Comece a conversa!</div>';
    return;
  }
  const wasNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
  let html = '';
  let lastDate = '';
  for (const m of allMessages) {
    const d = new Date(m.criado_em);
    const dateKey = d.toLocaleDateString('pt-BR');
    if (dateKey !== lastDate) {
      html += `<div class="chat-date-divider"><span>${escapeHtml(dateKey)}</span></div>`;
      lastDate = dateKey;
    }
    const isMe = m.remetente_id === currentUser.id;
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    html += `
      <div class="msg ${isMe ? 'mine' : 'other'}">
        ${!isMe ? `<div class="msg-avatar">${(m.remetente_nome || 'U').charAt(0).toUpperCase()}</div>` : ''}
        <div class="msg-bubble">
          ${!isMe ? `<div class="msg-author">${escapeHtml(m.remetente_nome)}</div>` : ''}
          <div class="msg-text">${escapeHtml(m.mensagem).replace(/\n/g, '<br>')}</div>
          <div class="msg-time">${time}</div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
  if (wasNearBottom) container.scrollTop = container.scrollHeight;
}

async function sendMessage(e) {
  e.preventDefault();
  if (isSending) return;
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  isSending = true;
  const btn = document.getElementById('btn-send');
  btn.disabled = true;
  try {
    await api('/api/chat/messages', { method: 'POST', body: JSON.stringify({ mensagem: text }) });
    input.value = '';
    input.style.height = 'auto';
    await loadMessages(false);
  } catch (err) {
    toast(err.message || 'Erro ao enviar', 'error');
  } finally {
    isSending = false;
    btn.disabled = false;
    input.focus();
  }
}
