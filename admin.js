if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  document.getElementById('loginNote').textContent = 'Supabase is not configured yet. Add your keys to config.js.';
}

const supabaseClient = window.supabase
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

const loginWrap = document.getElementById('loginWrap');
const dashWrap = document.getElementById('dashWrap');
const loginForm = document.getElementById('loginForm');
const loginNote = document.getElementById('loginNote');
const logoutBtn = document.getElementById('logoutBtn');

let currentFilter = 'pending';

// ---------- AUTH ----------
async function checkSession() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showDashboard() {
  loginWrap.style.display = 'none';
  dashWrap.style.display = 'block';
  loadVendors();
  loadSubscriberCount();
}

function showLogin() {
  loginWrap.style.display = 'flex';
  dashWrap.style.display = 'none';
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabaseClient) return;
    loginNote.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      loginNote.textContent = 'Incorrect email or password.';
      return;
    }
    showDashboard();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showLogin();
  });
}

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('panel-vendors').style.display = tab === 'vendors' ? 'block' : 'none';
    document.getElementById('panel-newsletter').style.display = tab === 'newsletter' ? 'block' : 'none';
  });
});

// ---------- VENDOR APPLICATIONS ----------
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    loadVendors();
  });
});

async function loadVendors() {
  const listEl = document.getElementById('vendorList');
  listEl.innerHTML = '<p class="empty-state">Loading applications&hellip;</p>';

  let query = supabaseClient.from('vendor_applications').select('*').order('created_at', { ascending: false });
  if (currentFilter !== 'all') {
    query = query.eq('status', currentFilter);
  }
  const { data, error } = await query;

  if (error) {
    listEl.innerHTML = '<p class="empty-state">Could not load applications.</p>';
    return;
  }
  if (!data || data.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No applications here yet.</p>';
    return;
  }

  listEl.innerHTML = '';
  data.forEach((app) => {
    const card = document.createElement('div');
    card.className = 'vendor-card';
    const appliedDate = new Date(app.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    const categoryLabel = app.category === 'Other' && app.category_other ? app.category_other : app.category;
    const photos = Array.isArray(app.photo_urls) ? app.photo_urls : [];
    card.innerHTML = `
      <div>
        <span class="status-badge ${app.status}">${app.status}</span>
        ${categoryLabel ? '<span class="status-badge" style="background:#eef1e4;color:#4a5238;">' + escapeHtml(categoryLabel) + '</span>' : ''}
        <h3>${escapeHtml(app.business_name)}</h3>
        <div class="meta">
          ${escapeHtml(app.contact_name)} &middot;
          <a href="mailto:${escapeHtml(app.email)}">${escapeHtml(app.email)}</a>
          ${app.phone ? ' &middot; ' + escapeHtml(app.phone) : ''}
        </div>
        <div class="meta">
          ${app.website ? '<a href="' + escapeHtml(app.website) + '" target="_blank" rel="noopener">Website</a>' : ''}
          ${app.social_link ? ' &middot; <a href="' + escapeHtml(app.social_link) + '" target="_blank" rel="noopener">Instagram/Facebook</a>' : ''}
        </div>
        <p class="desc">${escapeHtml(app.product_description)}</p>
        ${photos.length ? '<div class="photo-thumbs">' + photos.map((u) => {
          const isImage = /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(u);
          return isImage
            ? '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener"><img src="' + escapeHtml(u) + '" alt="Stall photo" loading="lazy"></a>'
            : '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener" class="photo-file">File</a>';
        }).join('') + '</div>' : ''}
        ${app.coa_url ? '<p class="applied-at">COA: <a href="' + escapeHtml(app.coa_url) + '" target="_blank" rel="noopener">View certificate</a></p>' : ''}
        <p class="applied-at">Applied ${appliedDate}</p>
      </div>
      <div class="vendor-actions">
        <button class="btn-approve" data-id="${app.id}" data-action="approved" ${app.status === 'approved' ? 'disabled' : ''}>Approve</button>
        <button class="btn-decline" data-id="${app.id}" data-action="declined" ${app.status === 'declined' ? 'disabled' : ''}>Decline</button>
      </div>
    `;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => decideVendor(btn.dataset.id, btn.dataset.action, btn));
  });
}

async function decideVendor(id, decision, btnEl) {
  const card = btnEl.closest('.vendor-card');
  card.querySelectorAll('button').forEach((b) => (b.disabled = true));

  const { data: appRow, error: fetchErr } = await supabaseClient
    .from('vendor_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr) {
    alert('Could not load this application. Please refresh and try again.');
    loadVendors();
    return;
  }

  const { error: updateErr } = await supabaseClient
    .from('vendor_applications')
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    alert('Could not update this application. Please try again.');
    loadVendors();
    return;
  }

  // Best-effort email notification via Edge Function - failing silently
  // is fine here since the status is already saved either way.
  try {
    await supabaseClient.functions.invoke('notify-vendor', {
      body: {
        email: appRow.email,
        contact_name: appRow.contact_name,
        business_name: appRow.business_name,
        decision,
      },
    });
  } catch (e) {
    console.warn('Vendor was updated but the notification email may not have sent:', e);
  }

  loadVendors();
}

// ---------- NEWSLETTER ----------
async function loadSubscriberCount() {
  const el = document.getElementById('subscriberCount');
  const { count, error } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true });
  if (error) {
    el.textContent = '';
    return;
  }
  el.textContent = count + (count === 1 ? ' subscriber' : ' subscribers');
}

const newsletterSendForm = document.getElementById('newsletterSendForm');
if (newsletterSendForm) {
  newsletterSendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject = document.getElementById('nlSubject').value.trim();
    const body = document.getElementById('nlBody').value.trim();
    const note = document.getElementById('sendNlNote');
    const btn = document.getElementById('sendNlBtn');
    if (!subject || !body) return;

    if (!confirm('Send this newsletter to every subscriber now?')) return;

    btn.disabled = true;
    note.textContent = 'Sending&hellip;';
    note.className = 'form-note';

    const { data, error } = await supabaseClient.functions.invoke('send-newsletter', {
      body: { subject, body },
    });

    btn.disabled = false;
    if (error) {
      note.textContent = 'Could not send the newsletter. Please try again.';
      note.className = 'form-note error';
      return;
    }
    note.textContent = 'Sent to ' + (data && data.sent !== undefined ? data.sent : 'all') + ' subscribers.';
    note.className = 'form-note success';
    newsletterSendForm.reset();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

checkSession();
