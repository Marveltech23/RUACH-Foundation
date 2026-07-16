/* ══════════════════════════════════════════════════════════════════
   RUACH Foundation — Frontend ↔ Backend integration script
   Include before </body>:  <script src="js/api.js" defer></script>
   ══════════════════════════════════════════════════════════════════ */

// ↓ UPDATE this to your deployed backend URL once live on Render.
const API_BASE_URL = 'https://ruach-backend-td82.onrender.com';

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data.data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function fmtDay(dateStr) {
  return new Date(dateStr).getDate().toString().padStart(2, '0');
}
function fmtMonth(dateStr) {
  return new Date(dateStr).toLocaleString('en-GB', { month: 'short' });
}
function fmtLongDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

/* ── GALLERY: rebuild .masonry-item nodes using existing markup/classes ── */
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  try {
    const images = await apiGet('/gallery');
    if (!images.length) return; // keep existing placeholder content if nothing uploaded yet
    grid.innerHTML = images.map(img => `
      <div class="masonry-item">
        <div class="img-ph">
          <img class="gallery-img" src="${img.image_url}" alt="${img.title || ''}" loading="lazy">
          <span class="masonry-label">${img.title || ''}</span>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error('Gallery load failed:', err); }
}

/* ── BLOG / NEWS: rebuild .news-card nodes, each clickable through to a full article page ── */
async function loadNews() {
    console.log("loadNews() called");

    const grid = document.getElementById("newsGrid");
    console.log("grid =", grid);

    if (!grid) {
        console.error("newsGrid not found");
        return;
    }

    try {
        const posts = await apiGet("/blog?published=true");

        console.log("posts =", posts);

        if (!posts.length) {
            console.log("No posts");
            return;
        }

        const [featured, ...rest] = posts;

        const cardHtml = (p, featuredClass = "") => `
            <div class="news-card ${featuredClass}">
                <h3>${p.title}</h3>
            </div>
        `;

        grid.innerHTML =
            cardHtml(featured, "news-featured") +
            rest.slice(0,2).map(cardHtml).join("");

    } catch(err){
        console.error(err);
    }
}
/* ── EVENTS: rebuild .event-card nodes + wire "Register Now" ── */
async function loadEvents() {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;
  try {
    const events = await apiGet('/events?published=true');
    if (!events.length) return;
    grid.innerHTML = events.map(e => `
      <div class="event-card">
        <div class="event-img">
          <img class="event-banner" src="${e.banner_url || ''}" alt="${e.title}">
          <div class="event-date-badge"><span class="day">${fmtDay(e.event_date)}</span><span class="month">${fmtMonth(e.event_date)}</span></div>
        </div>
        <div class="event-body">
          <div class="event-meta"><span>${e.start_time || ''}${e.end_time ? ' – ' + e.end_time : ''}</span><span>·</span><span>${e.venue || ''}</span></div>
          <h3 class="event-name">${e.title}</h3>
          <p class="event-venue">${e.venue || ''}</p>
          ${e.registration_open
            ? `<button class="btn-primary" style="font-size:10px;padding:10px 22px;border:none;cursor:pointer" onclick="openRegisterModal(${e.id}, '${String(e.title).replace(/'/g, "\\'")}')">Register Now</button>`
            : `<button class="btn-outline" style="font-size:10px;padding:10px 22px;cursor:not-allowed" disabled>Registration Closed</button>`}
        </div>
      </div>
    `).join('');
  } catch (err) { console.error('Events load failed:', err); }
}

/* ══════════════════════════════════════════════════════════════════
   EVENT REGISTRATION — popup modal (uses existing CSS variables only)
   ══════════════════════════════════════════════════════════════════ */
function ensureRegisterModal() {
  if (document.getElementById('ruachRegisterModal')) return;
  const modal = document.createElement('div');
  modal.id = 'ruachRegisterModal';
  modal.innerHTML = `
    <div id="ruachModalOverlay" style="display:none;position:fixed;inset:0;background:rgba(7,42,32,.7);z-index:3000;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--ivory);border-radius:4px;padding:36px;max-width:420px;width:100%;position:relative">
        <div id="ruachModalClose" style="position:absolute;top:14px;right:14px;cursor:pointer;font-size:20px;color:var(--text-muted)">&times;</div>
        <h3 style="font-family:var(--serif);color:var(--emerald);margin-bottom:6px" id="ruachModalTitle">Register</h3>
        <p style="font-family:var(--sans);font-size:.85rem;color:var(--text-muted);margin-bottom:20px" id="ruachModalEventName"></p>
        <div id="ruachModalAlert"></div>
        <form id="ruachRegisterForm" style="display:flex;flex-direction:column;gap:12px">
          <input type="hidden" id="ruachEventId">
          <input required type="text" placeholder="Full Name" id="ruachFullName" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <input required type="email" placeholder="Email Address" id="ruachEmail" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <input type="tel" placeholder="Phone Number" id="ruachPhone" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <input type="text" placeholder="Organization (optional)" id="ruachOrg" style="padding:12px;border:1px solid rgba(11,61,46,.2);border-radius:3px;font-family:var(--sans);font-size:16px">
          <button type="submit" class="btn-primary" style="border:none;cursor:pointer;padding:14px;margin-top:6px">Confirm Registration</button>
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
  document.getElementById('ruachEventId').value = eventId;
  document.getElementById('ruachModalEventName').textContent = eventTitle;
  document.getElementById('ruachModalAlert').innerHTML = '';
  document.getElementById('ruachModalOverlay').style.display = 'flex';
}
function closeRegisterModal() {
  const overlay = document.getElementById('ruachModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

async function submitRegistration(e) {
  e.preventDefault();
  const eventId = document.getElementById('ruachEventId').value;
  const payload = {
    full_name: document.getElementById('ruachFullName').value.trim(),
    email: document.getElementById('ruachEmail').value.trim(),
    phone: document.getElementById('ruachPhone').value.trim(),
    organization: document.getElementById('ruachOrg').value.trim()
  };
  const alertBox = document.getElementById('ruachModalAlert');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await apiPost(`/events/${eventId}/register`, payload);
    alertBox.innerHTML = `<p style="color:var(--emerald);font-size:.85rem;margin-bottom:10px">✓ You're registered! A confirmation email is on its way.</p>`;
    document.getElementById('ruachRegisterForm').reset();
    setTimeout(closeRegisterModal, 2500);
  } catch (err) {
    alertBox.innerHTML = `<p style="color:#B3261E;font-size:.85rem;margin-bottom:10px">${err.message}</p>`;
  } finally {
    submitBtn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════════════
   CONTACT FORM  &  PARTNERSHIP INQUIRY FORM
   Both submit to the same backend endpoint (POST /api/v1/contact)
   with a "type" field distinguishing them. No layout/markup changed —
   only the existing "Send Message" / "Submit Partnership Inquiry"
   buttons are wired up here.
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
      alertBox.innerHTML = `<p style="color:#B3261E;font-size:.82rem;margin-bottom:12px">Please fill in your name, email, and message.</p>`;
      return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    try {
      await apiPost('/contact', {
        type: 'contact',
        full_name: `${firstName} ${lastName}`.trim(),
        email,
        subject,
        message
      });
      alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.82rem;margin-bottom:12px">✓ Message sent! We'll be in touch soon.</p>`;
      ['contactFirstName','contactLastName','contactEmail','contactMessage'].forEach(id => document.getElementById(id).value = '');
    } catch (err) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">${err.message}</p>`;
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
      alertBox.innerHTML = `<p style="color:#B3261E;font-size:.82rem;margin-bottom:12px">Please fill in your contact name, email, and message.</p>`;
      return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    try {
      await apiPost('/contact', {
        type: 'partnership',
        full_name: contactName,
        email,
        organization: orgName,
        subject: partnerType,
        message
      });
      alertBox.innerHTML = `<p style="color:var(--gold-light);font-size:.82rem;margin-bottom:12px">✓ Inquiry received! Our partnerships team will reach out soon.</p>`;
      ['partnerOrgName','partnerContactName','partnerEmail','partnerMessage'].forEach(id => document.getElementById(id).value = '');
    } catch (err) {
      alertBox.innerHTML = `<p style="color:#e07a72;font-size:.82rem;margin-bottom:12px">${err.message}</p>`;
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
  wireContactForm();
  wirePartnerForm();
});
