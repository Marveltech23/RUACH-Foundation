/* ══════════════════════════════════════════════════════════════════════════
   RUACH Foundation — Shared Admin Panel Utilities (Supabase Auth + Storage)
   ══════════════════════════════════════════════════════════════════════════ */

function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG');
}

function showToast(message, type = 'success') {
  let el = document.getElementById('adminToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'adminToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, 3400);
}

function renderAdminChrome(activeKey) {
  const links = [
    { key: 'dashboard', href: 'index.html', label: 'Dashboard' },
    { key: 'gallery', href: 'gallery.html', label: 'Gallery' },
    { key: 'blog', href: 'blog.html', label: 'Blog Posts' },
    { key: 'events', href: 'events.html', label: 'Events & Regs' },
    { key: 'donations', href: 'donations.html', label: 'Donations' },
    { key: 'inquiries', href: 'inquiries.html', label: 'Inquiries' }
  ];

  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <a href="../index.html" class="admin-brand">
        <img src="../images/logoAsset 3.png" alt="RUACH Foundation">
        <div class="admin-brand-text">RUACH<span>Admin Portal</span></div>
      </a>
      <nav class="admin-nav">
        ${links.map(l => `<a href="${l.href}" class="${l.key === activeKey ? 'active' : ''}">${l.label}</a>`).join('')}
        <div class="admin-nav-divider"></div>
        <a href="../index.html" target="_blank">View Live Site ↗</a>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user-email" id="adminUserEmail">Checking session…</div>
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;color:var(--ivory);border-color:rgba(255,255,255,.25)" onclick="signOutAdmin()">Sign Out</button>
      </div>
    `;
  }

  const mobileBar = document.getElementById('adminMobileBar');
  if (mobileBar) {
    mobileBar.innerHTML = `
      <div style="font-family:var(--serif);font-size:1.1rem;font-weight:600;color:var(--gold-light)">RUACH Admin</div>
      <button type="button" class="admin-menu-btn" onclick="document.getElementById('adminSidebar').classList.toggle('open')">Menu</button>
    `;
  }
}

async function requireAdminAuth() {
  if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) {
    const main = document.querySelector('.admin-main');
    if (main && !document.getElementById('sbConfigWarn')) {
      const warn = document.createElement('div');
      warn.id = 'sbConfigWarn';
      warn.className = 'config-banner';
      warn.innerHTML = '<strong>Supabase not connected yet.</strong> Open <code>frontend/js/supabase-config.js</code> and paste your <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code>, then sign in at <a href="login.html" style="text-decoration:underline">Admin Login</a>.';
      main.prepend(warn);
    }
    const emailEl = document.getElementById('adminUserEmail');
    if (emailEl) emailEl.textContent = 'Not connected';
    return null;
  }

  const sb = window.getSupabaseClient();
  const { data: { session }, error } = await sb.auth.getSession();
  if (error || !session) {
    window.location.href = 'login.html';
    return null;
  }

  const emailEl = document.getElementById('adminUserEmail');
  if (emailEl) emailEl.textContent = session.user.email || 'Admin';
  return sb;
}

async function signOutAdmin() {
  const sb = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (sb) await sb.auth.signOut();
  window.location.href = 'login.html';
}

/* Upload an image file to Supabase Storage bucket `ruach-media` */
async function uploadMediaFile(sb, file, folder = 'uploads') {
  if (!file) return null;
  const bucket = (window.RUACH_CONFIG && window.RUACH_CONFIG.STORAGE_BUCKET) || 'ruach-media';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await sb.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadErr) throw uploadErr;

  const { data } = sb.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/* Clear frontend localStorage caches after admin updates */
function bustFrontendCache(key) {
  try { localStorage.removeItem('ruach:sb:' + key); } catch (e) {}
}
