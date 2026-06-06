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

function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function openYouTube(url) {
  const id = getYouTubeId(url);
  if (!id) {
    toast('Link do YouTube invalido', 'error');
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'yt-modal';
  modal.innerHTML = `
    <div class="yt-modal-backdrop"></div>
    <div class="yt-modal-content">
      <button class="yt-modal-close" aria-label="Fechar">&times;</button>
      <iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" 
              allow="autoplay; encrypted-media" allowfullscreen
              frameborder="0"></iframe>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  function close() {
    modal.remove();
    document.body.style.overflow = '';
  }
  modal.querySelector('.yt-modal-backdrop').onclick = close;
  modal.querySelector('.yt-modal-close').onclick = close;
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
}

async function copyText(text, label = 'Link') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} copiado!`, 'success', 2000);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(`${label} copiado!`, 'success', 2000); }
    catch (err) { toast('Nao foi possivel copiar', 'error'); }
    ta.remove();
  }
}

let cloudinaryConfig = null;
async function getCloudinaryConfig() {
  if (cloudinaryConfig !== null) return cloudinaryConfig;
  try {
    const cfg = await API.get('/config');
    cloudinaryConfig = {
      cloudName: cfg.cloudinary_cloud_name || '',
      uploadPreset: cfg.cloudinary_upload_preset || ''
    };
  } catch (e) {
    cloudinaryConfig = { cloudName: '', uploadPreset: '' };
  }
  return cloudinaryConfig;
}

async function uploadToCloudinary(file, opts = {}) {
  const cfg = await getCloudinaryConfig();
  if (!cfg.cloudName || !cfg.uploadPreset) {
    throw new Error('Cloudinary nao configurado. Va em Estúdio > Configuracoes da Igreja e preencha Cloud Name e Upload Preset.');
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cfg.uploadPreset);
  if (opts.folder) formData.append('folder', opts.folder);
  if (opts.publicId) formData.append('public_id', opts.publicId);

  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cfg.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.secure_url, publicId: data.public_id, duration: data.duration, format: data.format });
        } catch (e) { reject(new Error('Resposta invalida do Cloudinary')); }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || 'Erro no upload'));
        } catch (e) { reject(new Error('Erro no upload: HTTP ' + xhr.status)); }
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede no upload'));
    xhr.send(formData);
  });
}

function createUploadButton(options) {
  const {
    accept = '*/*',
    label = '&#9654; Upload',
    onUpload,
    onProgress,
    folder = 'louva-studio'
  } = options;

  const wrap = document.createElement('div');
  wrap.className = 'upload-zone';
  wrap.innerHTML = `
    <input type="file" accept="${accept}" class="upload-input" hidden>
    <button type="button" class="btn-upload">${label}</button>
    <div class="upload-progress" hidden>
      <div class="upload-progress-bar"></div>
      <span class="upload-progress-text">0%</span>
    </div>
  `;

  const input = wrap.querySelector('.upload-input');
  const btn = wrap.querySelector('.btn-upload');
  const progress = wrap.querySelector('.upload-progress');
  const bar = wrap.querySelector('.upload-progress-bar');
  const text = wrap.querySelector('.upload-progress-text');

  btn.onclick = () => input.click();
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    btn.disabled = true;
    progress.hidden = false;
    try {
      const result = await uploadToCloudinary(file, {
        folder,
        onProgress: (p) => { bar.style.width = p + '%'; text.textContent = p + '%'; }
      });
      btn.textContent = '&#10003; Enviado';
      setTimeout(() => { btn.innerHTML = label; }, 2000);
      if (onUpload) onUpload(result, file);
    } catch (err) {
      toast(err.message, 'error', 5000);
    } finally {
      btn.disabled = false;
      input.value = '';
      setTimeout(() => { progress.hidden = true; bar.style.width = '0%'; text.textContent = '0%'; }, 500);
    }
  };

  return wrap;
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
