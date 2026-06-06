(function() {
  let currentUser = null;
  let isAdminUser = false;

  const NAV_ITEMS = [
    { section: 'Principal' },
    { href: '/dashboard.html', icon: '🏠', label: 'Início' },
    { href: '/songs.html', icon: '📚', label: 'Repertório' },
    { href: '/schedules.html', icon: '📅', label: 'Escalas' },
    { href: '/my-schedule.html', icon: '✅', label: 'Minhas Escalas' },
    { href: '/members.html', icon: '👥', label: 'Equipe' },
    { href: '/ministerios.html', icon: '⛪', label: 'Ministérios' },
    { href: '/devocionais.html', icon: '📖', label: 'Devocionais' },
    { href: '/eventos.html', icon: '🎵', label: 'Eventos' },
    { href: '/chat.html', icon: '💬', label: 'Chat' },
    { href: '/studio.html', icon: '🎚️', label: 'Estúdio' },
    { section: 'Administração', adminOnly: true },
    { href: '/igreja.html', icon: '⚙️', label: 'Igreja', adminOnly: true },
    { href: '/relatorios.html', icon: '📊', label: 'Relatórios', adminOnly: true }
  ];

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function applyRoleVisibility(user) {
    if (!user) return;
    const isAdmin = user.perfil === 'admin';
    isAdminUser = isAdmin;
    document.querySelectorAll('.member-only').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('[data-requires-role="membro"]').forEach(el => el.classList.remove('hidden'));
    if (isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.add('hidden'));
    }
  }

  function renderNav(activePath) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    const isAdmin = currentUser && currentUser.perfil === 'admin';
    const html = NAV_ITEMS.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      return true;
    }).map(item => {
      if (item.section) {
        return `<div class="sidebar-section">${item.section}</div>`;
      }
      const isActive = activePath && item.href === activePath;
      return `<a class="sidebar-link${isActive ? ' active' : ''}" href="${item.href}"><span class="icon">${item.icon}</span> ${item.label}</a>`;
    }).join('');
    nav.innerHTML = html;
  }

  function setupSidebar(user, activePath) {
    currentUser = user;
    applyRoleVisibility(user);

    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.nome || 'Usuário';
    const roleEl = document.getElementById('user-role');
    if (roleEl) roleEl.textContent = user.perfil || 'membro';
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = getInitials(user.nome);

    renderNav(activePath);

    const logout = document.getElementById('btn-logout');
    if (logout) {
      logout.addEventListener('click', async () => {
        try { await API.post('/auth/logout', {}); } catch (e) {}
        API.clearToken();
        toast('Até logo!', 'info');
        setTimeout(() => location.href = '/', 400);
      });
    }

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileToggle = document.getElementById('mobile-toggle');

    function openSidebar() {
      if (sidebar) sidebar.classList.add('open');
      if (overlay) overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    if (mobileToggle) mobileToggle.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
    if (overlay) overlay.addEventListener('click', closeSidebar);
    if (sidebar) {
      sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      }));
    }
  }

  window.Sidebar = { setup: setupSidebar, getUser: () => currentUser, isAdmin: () => isAdminUser, applyRoleVisibility };
  window.isAdminUser = () => isAdminUser;
})();
