/* ══════════════════════════════════════════════════════════════════
   RUACH Foundation — Frontend ↔ Supabase Integration
   Requires before this script:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase-config.js"></script>
     <script src="js/api.js" defer></script>
   ══════════════════════════════════════════════════════════════════ */

const CACHE_MINUTES = 5;

function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDay(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return isNaN(d) ? '--' : d.getDate().toString().padStart(2, '0');
}

function fmtMonth(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d) ? '' : d.toLocaleString('en-GB', { month: 'short' });
}

function fmtLongDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG');
}

/* ── LOCALSTORAGE CACHE ── */
function readCache(key) {
  try {
    const raw = localStorage.getItem('ruach:sb:' + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function writeCache(key, data) {
  try { localStorage.setItem('ruach:sb:' + key, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
}
function clearCache(key) {
  try { localStorage.removeItem('ruach:sb:' + key); } catch (e) {}
}

async function cachedSupabaseQuery(key, fetcher, render) {
  const sb = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (!sb) return false;

  const cached = readCache(key);
  let shown = null;

  if (cached && Array.isArray(cached.data) && cached.data.length) {
    render(cached.data);
    shown = JSON.stringify(cached.data);
    if (Date.now() - cached.t < CACHE_MINUTES * 60 * 1000) return true;
  }

  const fresh = await fetcher(sb);
  if (!fresh || !fresh.length) {
    clearCache(key);
    return false;
  }
  writeCache(key, fresh);
  if (JSON.stringify(fresh) !== shown) render(fresh);
  return true;
}

/* ══════════════════════════════════════════════════════════════════
   1. HOME GALLERY PREVIEW (#galleryGrid)
   ══════════════════════════════════════════════════════════════════ */
function renderGallery(images) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.classList.remove('is-loading');
  grid.innerHTML = images.slice(0, 9).map(img => `
    <div class="masonry-item" onclick="window.location.href='gallery.html'">
      <div class="img-ph">
        <img class="gallery-img" src="${escHtml(img.image_url)}" alt="${escHtml(img.title || 'Gallery photo')}" loading="lazy" decoding="async" onerror="this.style.display='none'">
        <span class="masonry-label">${escHtml(img.title || '')}</span>
      </div>
    </div>
  `).join('');
}

async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid || document.getElementById('gallery-page')) return; // gallery.html handles its own grid
  try {
    await cachedSupabaseQuery(
      'gallery-home',
      async (sb) => {
        const { data, error } = await sb
          .from('gallery')
          .select('id, title, category, image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(9);
        if (error) throw error;
        return data || [];
      },
      renderGallery
    );
  } catch (err) {
    console.error('Gallery load failed (showing fallback):', err);
  } finally {
    grid.classList.remove('is-loading');
  }
}

/* ══════════════════════════════════════════════════════════════════
   2. HOME BLOG / NEWS (#newsGrid) — full readable cards
   ══════════════════════════════════════════════════════════════════ */
function renderNews(posts) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  grid.innerHTML = posts.slice(0, 3).map((p, i) => `
    <div class="news-card${i === 0 ? ' news-featured' : ''}" onclick="window.location.href='blog-post.html?slug=${encodeURIComponent(p.slug)}'">
      <div class="news-img">
        ${p.featured_image_url ? `<img class="news-photo" src="${escHtml(p.featured_image_url)}" alt="${escHtml(p.title)}" loading="lazy" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="news-body">
        <div class="news-category">${escHtml(p.category || 'Article')}</div>
        <h3 class="news-title">${escHtml(p.title)}</h3>
        <p class="news-excerpt">${escHtml(p.excerpt || '')}</p>
        <div class="news-meta">${escHtml(p.author || 'RUACH Editorial')}${p.published_at ? ' · ' + escHtml(fmtLongDate(p.published_at)) : ''}</div>
      </div>
    </div>
  `).join('');
}

async function loadNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  try {
    const loaded = await cachedSupabaseQuery(
      'news-home',
      async (sb) => {
        const { data, error } = await sb
          .from('blogs')
          .select('id, title, slug, category, author, excerpt, featured_image_url, published_at')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(3);
        if (error) throw error;
        return data || [];
      },
      renderNews
    );
    // Ensure fallback articles are clickable & readable even before Supabase is connected
    if (!loaded && Array.isArray(window.RUACH_FALLBACK_BLOGS) && window.RUACH_FALLBACK_BLOGS.length) {
      renderNews(window.RUACH_FALLBACK_BLOGS);
    }
  } catch (err) {
    console.error('News load failed (showing fallback):', err);
    if (Array.isArray(window.RUACH_FALLBACK_BLOGS) && window.RUACH_FALLBACK_BLOGS.length) {
      renderNews(window.RUACH_FALLBACK_BLOGS);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   3. EVENTS (#eventsGrid) & REGISTRATION MODAL
   ══════════════════════════════════════════════════════════════════ */
function renderEvents(events) {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;
  grid.innerHTML = events.map(e => `
    <div class="event-card">
      <div class="event-img">
        ${e.banner_url ? `<img class="event-banner" src="${escHtml(e.banner_url)}" alt="${escHtml(e.title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
        <div class="event-date-badge">
          <span class="day">${escHtml(fmtDay(e.event_date))}</span>
          <span class="month">${escHtml(fmtMonth(e.event_date))}</span>
        </div>
      </div>
      <div class="event-body">
        <div class="event-meta">
          <span>${escHtml(e.start_time || '')}${e.end_time ? ' – ' + escHtml(e.end_time) : ''}</span>
          ${e.venue ? `<span>·</span><span>${escHtml(e.venue)}</span>` : ''}
        </div>
        <h3 class="event-name">${escHtml(e.title)}</h3>
        <p class="event-venue">${escHtml(e.venue || '')}</p>
        ${e.registration_open !== false
          ? `<button type="button" class="btn-primary event-reg-btn" style="font-size:10px;padding:10px 22px;border:none;cursor:pointer" data-event-id="${escHtml(e.id)}" data-event-title="${escHtml(e.title)}">Register Now</button>`
          : `<button type="button" class="btn-outline" style="font-size:10px;padding:10px 22px;cursor:not-allowed;color:var(--text-muted);border-color:rgba(11,61,46,.2)" disabled>Registration Closed</button>`}
      </div>
    </div>
  `).join('');
  bindEventRegisterButtons();
}

function bindEventRegisterButtons() {
  document.querySelectorAll('#eventsGrid .event-reg-btn').forEach(btn => {
    btn.onclick = () => {
      openRegisterModal(btn.getAttribute('data-event-id'), btn.getAttribute('data-event-title'));
    };
  });
}

async function loadEvents() {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;
  // Wire any static fallback register buttons too
  bindEventRegisterButtons();
  try {
    await cachedSupabaseQuery(
      'events-home',
      async (sb) => {
        const { data, error } = await sb
          .from('events')
          .select('id, title, description, event_date, start_time, end_time, venue, banner_url, registration_open')
          .eq('published', true)
          .order('event_date', { ascending: true });
        if (error) throw error;
        return data || [];
      },
      renderEvents
    );
  } catch (err) {
    console.error('Events load failed (showing fallback):', err);
  }
}

function ensureRegisterModal() {
  if (document.getElementById('ruachRegisterModal')) return;
  const modal = document.createElement('div');
  modal.id = 'ruachRegisterModal';
  modal.innerHTML = `
    <div id="ruachModalOverlay" style="display:none;position:fixed;inset:0;background:rgba(7,42,32,.78);backdrop-filter:blur(4px);z-index:3000;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--ivory);border-radius:4px;border-top:4px solid var(--gold);padding:36px;max-width:440px;width:100%;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.35)">
        <button type="button" id="ruachModalClose" aria-label="Close modal" style="position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;font-size:24px;line-height:1;color:var(--text-muted)">&times;</button>
        <div style="font-family:var(--sans);font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:8px">Event Registration</div>
        <h3 style="font-family:var(--serif);font-size:1.6rem;color:var(--emerald);margin-bottom:6px" id="ruachModalTitle">Reserve Your Seat</h3>
        <p style="font-family:var(--sans);font-size:.85rem;color:var(--text-muted);margin-bottom:20px" id="ruachModalEventName"></p>
        <div id="ruachModalAlert"></div>
        <form id="ruachRegisterForm" style="display:flex;flex-direction:column;gap:12px">
          <input type="hidden" id="ruachEventId">
          <input type="hidden" id="ruachEventTitleInput">
          <input required type="text" placeholder="Full Name *" id="ruachFullName" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <input required type="email" placeholder="Email Address *" id="ruachEmail" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <input type="tel" placeholder="Phone Number" id="ruachPhone" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <input type="text" placeholder="Organization (optional)" id="ruachOrg" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <button type="submit" class="btn-primary" style="border:none;cursor:pointer;padding:14px;margin-top:6px;width:100%;text-align:center">Confirm Registration</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('ruachModalClose').onclick = closeRegisterModal;
  document.getElementById('ruachModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'ruachModalOverlay') closeRegisterModal();
  });
  document.getElementById('ruachRegisterForm').addEventListener('submit', submitRegistration);
}

function openRegisterModal(eventId, eventTitle) {
  ensureRegisterModal();
  document.getElementById('ruachEventId').value = eventId || '';
  document.getElementById('ruachEventTitleInput').value = eventTitle || '';
  document.getElementById('ruachModalEventName').textContent = eventTitle || '';
  document.getElementById('ruachModalAlert').innerHTML = '';
  document.getElementById('ruachModalOverlay').style.display = 'flex';
}
window.openRegisterModal = openRegisterModal;

function closeRegisterModal() {
  const overlay = document.getElementById('ruachModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

async function submitRegistration(e) {
  e.preventDefault();
  const sb = window.getSupabaseClient ? window.getSupabaseClient() : null;
  const alertBox = document.getElementById('ruachModalAlert');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const rawEventId = document.getElementById('ruachEventId').value;
  const eventTitle = document.getElementById('ruachEventTitleInput').value;
  const payload = {
    full_name: document.getElementById('ruachFullName').value.trim(),
    email: document.getElementById('ruachEmail').value.trim(),
    phone: document.getElementById('ruachPhone').value.trim(),
    organization: document.getElementById('ruachOrg').value.trim(),
    event_title: eventTitle
  };

  if (!sb) {
    alertBox.innerHTML = `<p style="color:#B3261E;font-size:.85rem;margin-bottom:10px">Supabase is not connected yet. Add your Supabase URL and Anon Key in <code>js/supabase-config.js</code> to enable live registrations.</p>`;
    return;
  }

  const numericId = Number(rawEventId);
  if (!numericId || isNaN(numericId)) {
    alertBox.innerHTML = `<p style="color:#B3261E;font-size:.85rem;margin-bottom:10px">Please publish this event in the Admin Panel first so registrations can be linked to it.</p>`;
    return;
  }
  payload.event_id = numericId;

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting…';
  try {
    const { error } = await sb.from('event_registrations').insert([payload]);
    if (error) throw error;
    alertBox.innerHTML = `<p style="color:var(--emerald);font-size:.85rem;margin-bottom:10px;font-weight:500">✓ You're registered for ${escHtml(eventTitle)}! We look forward to welcoming you.</p>`;
    document.getElementById('ruachRegisterForm').reset();
    setTimeout(closeRegisterModal, 2500);
  } catch (err) {
    alertBox.innerHTML = `<p style="color:#B3261E;font-size:.85rem;margin-bottom:10px">${escHtml(err.message || 'Registration failed.')}</p>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/* ══════════════════════════════════════════════════════════════════
   4. DONATION PAYMENT FLOW (#donate)
   Supports Paystack Inline (when PAYSTACK_PUBLIC_KEY is configured)
   and Bank Transfer / Pledge fallback — both record to Supabase `donations`.
   ══════════════════════════════════════════════════════════════════ */
function getSelectedDonationAmount() {
  const customInput = document.getElementById('donateCustomAmount');
  if (customInput && customInput.value.trim()) {
    const parsed = Number(customInput.value.replace(/[^0-9.]/g, ''));
    if (parsed > 0) return parsed;
  }
  const selectedBtn = document.querySelector('#donate .amount-btn.selected');
  if (selectedBtn) {
    const parsed = Number(selectedBtn.textContent.replace(/[^0-9.]/g, ''));
    if (parsed > 0) return parsed;
  }
  return 0;
}

function getSelectedDonationType() {
  const active = document.querySelector('#donate .donate-option.active .donate-option-title');
  return active ? active.textContent.trim() : 'One-Time Gift';
}

async function saveDonationToSupabase(record) {
  const sb = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (!sb) return { saved: false, reason: 'not_configured' };
  const { error } = await sb.from('donations').insert([record]);
  if (error) throw error;
  return { saved: true };
}

function ensureDonationModal() {
  if (document.getElementById('ruachDonateModal')) return;
  const modal = document.createElement('div');
  modal.id = 'ruachDonateModal';
  modal.innerHTML = `
    <div id="ruachDonateOverlay" style="display:none;position:fixed;inset:0;background:rgba(7,42,32,.78);backdrop-filter:blur(4px);z-index:3000;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--ivory);border-radius:4px;border-top:4px solid var(--gold);padding:36px;max-width:460px;width:100%;position:relative;box-shadow:0 24px 70px rgba(0,0,0,.35)">
        <button type="button" id="ruachDonateClose" aria-label="Close modal" style="position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;font-size:24px;line-height:1;color:var(--text-muted)">&times;</button>
        <div style="font-family:var(--sans);font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:8px">Complete Your Gift</div>
        <h3 style="font-family:var(--serif);font-size:1.6rem;color:var(--emerald);margin-bottom:8px" id="ruachDonateSummary"></h3>
        <p style="font-family:var(--sans);font-size:.85rem;color:var(--text-muted);line-height:1.65;margin-bottom:18px">
          Direct Bank Transfer details are shown below. Once you confirm, your donation reference is logged in our system for verification and receipt.
        </p>
        <div id="ruachBankBox" style="background:var(--ivory-warm);border-left:3px solid var(--gold);padding:16px;border-radius:3px;margin-bottom:18px;font-family:var(--sans);font-size:.84rem;line-height:1.7;color:var(--charcoal)"></div>
        <div id="ruachDonateModalAlert"></div>
        <button type="button" id="ruachConfirmTransferBtn" class="btn-primary" style="width:100%;text-align:center;border:none;cursor:pointer">I Have Sent / Confirm Pledge →</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('ruachDonateClose').onclick = () => {
    document.getElementById('ruachDonateOverlay').style.display = 'none';
  };
  document.getElementById('ruachDonateOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'ruachDonateOverlay') {
      document.getElementById('ruachDonateOverlay').style.display = 'none';
    }
  });
}

function wireDonationForm() {
  const btn = document.getElementById('donateSubmitBtn');
  if (!btn) return;

  const customInput = document.getElementById('donateCustomAmount');
  if (customInput) {
    customInput.addEventListener('input', () => {
      if (customInput.value.trim()) {
        document.querySelectorAll('#donate .amount-btn').forEach(b => b.classList.remove('selected'));
      }
    });
  }

  btn.addEventListener('click', async () => {
    const alertBox = document.getElementById('donateFormAlert');
    const fullName = (document.getElementById('donateFullName')?.value || '').trim();
    const email = (document.getElementById('donateEmail')?.value || '').trim();
    const amount = getSelectedDonationAmount();
    const donationType = getSelectedDonationType();

    if (!amount || amount < 100) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:14px">Please select or enter a valid donation amount (minimum ₦100).</p>`;
      return;
    }
    if (!fullName || !email) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:14px">Please enter your full name and email address.</p>`;
      return;
    }
    alertBox.innerHTML = '';

    const cfg = window.RUACH_CONFIG || {};
    const reference = 'RUACH-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // Path A: Paystack Inline Checkout (when PAYSTACK_PUBLIC_KEY is configured)
    if (cfg.PAYSTACK_PUBLIC_KEY && window.PaystackPop) {
      const handler = window.PaystackPop.setup({
        key: cfg.PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: Math.round(amount * 100), // kobo
        currency: 'NGN',
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: 'Donor Name', variable_name: 'donor_name', value: fullName },
            { display_name: 'Giving Type', variable_name: 'donation_type', value: donationType }
          ]
        },
        callback: async function (response) {
          try {
            await saveDonationToSupabase({
              full_name: fullName,
              email: email,
              donation_type: donationType,
              amount: amount,
              currency: 'NGN',
              payment_method: 'paystack',
              payment_reference: response.reference,
              status: 'completed'
            });
            alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.84rem;margin-bottom:14px">✓ Thank you, ${escHtml(fullName)}! Your ${escHtml(fmtNaira(amount))} gift was received (Ref: ${escHtml(response.reference)}).</p>`;
            document.getElementById('donateFullName').value = '';
            document.getElementById('donateEmail').value = '';
            if (customInput) customInput.value = '';
          } catch (err) {
            alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.84rem;margin-bottom:14px">✓ Payment succeeded (Ref: ${escHtml(response.reference)}), but logging failed: ${escHtml(err.message)}</p>`;
          }
        },
        onClose: function () {
          alertBox.innerHTML = `<p style="color:rgba(255,255,255,.65);font-size:.82rem;margin-bottom:14px">Payment window closed. You can try again anytime.</p>`;
        }
      });
      handler.openIframe();
      return;
    }

    // Path B: Bank Transfer / Direct Pledge modal (works immediately & logs to Supabase)
    ensureDonationModal();
    const bank = cfg.BANK_TRANSFER_DETAILS || {};
    document.getElementById('ruachDonateSummary').textContent = `${fmtNaira(amount)} · ${donationType}`;
    document.getElementById('ruachBankBox').innerHTML = `
      <div><strong>Bank:</strong> ${escHtml(bank.bankName || 'RUACH Foundation Account')}</div>
      <div><strong>Account Name:</strong> ${escHtml(bank.accountName || 'RUACH Foundation for Capacity Building')}</div>
      <div><strong>Account Number:</strong> ${escHtml(bank.accountNumber || 'Contact info@ruachfoundation.org')}</div>
      <div><strong>Reference:</strong> <code>${escHtml(reference)}</code></div>
    `;
    const modalAlert = document.getElementById('ruachDonateModalAlert');
    modalAlert.innerHTML = '';
    const confirmBtn = document.getElementById('ruachConfirmTransferBtn');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'I Have Sent / Confirm Pledge →';
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Recording…';
      try {
        const res = await saveDonationToSupabase({
          full_name: fullName,
          email: email,
          donation_type: donationType,
          amount: amount,
          currency: 'NGN',
          payment_method: 'bank_transfer',
          payment_reference: reference,
          status: 'pending'
        });
        if (!res.saved) {
          modalAlert.innerHTML = `<p style="color:#B3261E;font-size:.82rem;margin-bottom:12px">Supabase is not connected yet. Add your credentials in <code>js/supabase-config.js</code> to save donations.</p>`;
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'I Have Sent / Confirm Pledge →';
          return;
        }
        modalAlert.innerHTML = `<p style="color:var(--emerald);font-size:.84rem;margin-bottom:12px;font-weight:500">✓ Thank you, ${escHtml(fullName)}! Your gift (${escHtml(fmtNaira(amount))}) has been recorded with reference ${escHtml(reference)}.</p>`;
        alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.84rem;margin-bottom:14px">✓ Donation recorded! Ref: ${escHtml(reference)}</p>`;
        document.getElementById('donateFullName').value = '';
        document.getElementById('donateEmail').value = '';
        if (customInput) customInput.value = '';
        setTimeout(() => {
          document.getElementById('ruachDonateOverlay').style.display = 'none';
        }, 2500);
      } catch (err) {
        modalAlert.innerHTML = `<p style="color:#B3261E;font-size:.82rem;margin-bottom:12px">${escHtml(err.message || 'Could not record donation.')}</p>`;
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'I Have Sent / Confirm Pledge →';
      }
    };
    document.getElementById('ruachDonateOverlay').style.display = 'flex';
  });
}

/* ══════════════════════════════════════════════════════════════════
   5. CONTACT FORM & PARTNERSHIP FORM → Supabase `inquiries`
   ══════════════════════════════════════════════════════════════════ */
function wireContactForm() {
  const btn = document.getElementById('contactSubmitBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const alertBox = document.getElementById('contactFormAlert');
    const firstName = document.getElementById('contactFirstName').value.trim();
    const lastName = document.getElementById('contactLastName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value.trim();

    if (!firstName || !email || !message) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">Please fill in your name, email, and message.</p>`;
      return;
    }

    const sb = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!sb) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">Supabase is not connected yet. Configure <code>js/supabase-config.js</code> first.</p>`;
      return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    try {
      const { error } = await sb.from('inquiries').insert([{
        type: 'contact',
        full_name: `${firstName} ${lastName}`.trim(),
        email,
        subject,
        message
      }]);
      if (error) throw error;
      alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.82rem;margin-bottom:12px">✓ Message sent! We'll be in touch soon.</p>`;
      ['contactFirstName', 'contactLastName', 'contactEmail', 'contactMessage'].forEach(id => {
        document.getElementById(id).value = '';
      });
    } catch (err) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">${escHtml(err.message || 'Failed to send message.')}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function wirePartnerForm() {
  const btn = document.getElementById('partnerSubmitBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const alertBox = document.getElementById('partnerFormAlert');
    const orgName = document.getElementById('partnerOrgName').value.trim();
    const partnerType = document.getElementById('partnerType').value;
    const contactName = document.getElementById('partnerContactName').value.trim();
    const email = document.getElementById('partnerEmail').value.trim();
    const message = document.getElementById('partnerMessage').value.trim();

    if (!contactName || !email || !message) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">Please fill in your contact name, email, and message.</p>`;
      return;
    }

    const sb = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!sb) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">Supabase is not connected yet. Configure <code>js/supabase-config.js</code> first.</p>`;
      return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    try {
      const { error } = await sb.from('inquiries').insert([{
        type: 'partnership',
        full_name: contactName,
        email,
        organization: orgName,
        subject: partnerType,
        message
      }]);
      if (error) throw error;
      alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.82rem;margin-bottom:12px">✓ Inquiry received! Our partnerships team will reach out soon.</p>`;
      ['partnerOrgName', 'partnerContactName', 'partnerEmail', 'partnerMessage'].forEach(id => {
        document.getElementById(id).value = '';
      });
    } catch (err) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">${escHtml(err.message || 'Failed to submit inquiry.')}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadGallery();
  loadNews();
  loadEvents();
  wireDonationForm();
  wireContactForm();
  wirePartnerForm();
});
