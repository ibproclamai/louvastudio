const API = {
  base: '/api',

  getToken() { return localStorage.getItem('token'); },
  setToken(token) { localStorage.setItem('token', token); },
  clearToken() { localStorage.removeItem('token'); },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(this.base + path, { ...options, headers });
    if (res.status === 401) {
      this.clearToken();
      if (!location.pathname.endsWith('/') && !location.pathname.endsWith('index.html') && !location.pathname.endsWith('setup.html')) {
        location.href = '/';
      }
      throw new Error('Nao autenticado');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  },

  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
  del(path) { return this.request(path, { method: 'DELETE' }); }
};

async function loadUser() {
  if (!API.getToken()) { location.href = '/'; return null; }
  try {
    const { user } = await API.get('/auth/me');
    document.querySelectorAll('.user-chip').forEach(el => el.textContent = user.nome);
    return user;
  } catch (e) {
    location.href = '/';
    return null;
  }
}

function setupAdminVisibility(user) {
  if (user && user.perfil === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }
}

function setupLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.addEventListener('click', async () => {
      try { await API.post('/auth/logout', {}); } catch (e) {}
      API.clearToken();
      toast('Ate logo!', 'info');
      setTimeout(() => location.href = '/', 400);
    });
  }
}

function setupNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  const overlay = document.getElementById('nav-overlay');
  if (!toggle || !menu) return;
  function close() {
    toggle.classList.remove('open');
    menu.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  }
  function open() {
    toggle.classList.add('open');
    menu.classList.add('open');
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  toggle.addEventListener('click', () => {
    if (menu.classList.contains('open')) close();
    else open();
  });
  if (overlay) overlay.addEventListener('click', close);
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showAlert(msg, type = 'error') {
  toast(msg, type);
}

function toast(msg, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  el.innerHTML = `<span style="font-size:1.2rem;font-weight:700">${icons[type] || 'ℹ'}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.addEventListener('click', e => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('modal-close')) {
    const m = e.target.closest('.modal');
    if (m) m.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
  setupLogout();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setupNavToggle();
}
