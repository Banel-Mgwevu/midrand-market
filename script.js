// Mobile nav toggle
const toggle = document.getElementById('menuToggle');
const links = document.getElementById('navlinks');
if (toggle && links) {
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
}

// Generic email validator
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Supabase client (config.js must load before this file, and supabase-js CDN before that)
let supabaseClient = null;
if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

// ---------- Newsletter modal (shown once per browser session on the homepage) ----------
const nlOverlay = document.getElementById('nlOverlay');
if (nlOverlay) {
  const nlCloseBtn = document.getElementById('nlClose');
  const nlModalForm = document.getElementById('nlModalForm');
  const nlModalNote = document.getElementById('nlModalNote');

  function openModal() {
    nlOverlay.classList.add('show');
  }
  function closeModal() {
    nlOverlay.classList.remove('show');
    sessionStorage.setItem('nlModalSeen', '1');
  }

  if (!sessionStorage.getItem('nlModalSeen')) {
    setTimeout(openModal, 900);
  }

  nlCloseBtn.addEventListener('click', closeModal);
  nlOverlay.addEventListener('click', (e) => {
    if (e.target === nlOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nlOverlay.classList.contains('show')) closeModal();
  });

  const heroNewsletterBtn = document.getElementById('heroNewsletterBtn');
  if (heroNewsletterBtn) {
    heroNewsletterBtn.addEventListener('click', openModal);
  }

  nlModalForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('nlModalName').value.trim();
    const email = document.getElementById('nlModalEmail').value.trim();
    if (!name || !isValidEmail(email)) {
      nlModalNote.textContent = 'Please enter your name and a valid email address.';
      nlModalNote.className = 'nl-note error';
      return;
    }
    if (!supabaseClient) {
      nlModalNote.textContent = 'Sign-ups are not connected yet. Add your Supabase keys to config.js.';
      nlModalNote.className = 'nl-note error';
      return;
    }
    const submitBtn = nlModalForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const { error } = await supabaseClient.from('subscribers').insert({ name, email });
    submitBtn.disabled = false;
    if (error) {
      nlModalNote.textContent = error.code === '23505'
        ? 'That email is already on the list!'
        : 'Something went wrong. Please try again.';
      nlModalNote.className = 'nl-note error';
      return;
    }
    nlModalNote.textContent = 'Thanks, ' + name + ' - you are on the list for market updates!';
    nlModalNote.className = 'nl-note success';
    nlModalForm.reset();
    setTimeout(closeModal, 1600);
  });
}

// ---------- Vendor application form ----------
const vendorForm = document.getElementById('vendorForm');
if (vendorForm) {
  const vendorNote = document.getElementById('vendorNote');
  vendorForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const business_name = document.getElementById('vBusiness').value.trim();
    const contact_name = document.getElementById('vContact').value.trim();
    const email = document.getElementById('vEmail').value.trim();
    const phone = document.getElementById('vPhone').value.trim();
    const product_description = document.getElementById('vProduct').value.trim();

    if (!business_name || !contact_name || !isValidEmail(email) || !product_description) {
      vendorNote.textContent = 'Please fill in all required fields with a valid email address.';
      vendorNote.className = 'form-note error';
      return;
    }
    if (!supabaseClient) {
      vendorNote.textContent = 'Applications are not connected yet. Add your Supabase keys to config.js.';
      vendorNote.className = 'form-note error';
      return;
    }
    const submitBtn = vendorForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const { error } = await supabaseClient.from('vendor_applications').insert({
      business_name, contact_name, email, phone, product_description
    });
    submitBtn.disabled = false;
    if (error) {
      vendorNote.textContent = 'Something went wrong sending your application. Please try again.';
      vendorNote.className = 'form-note error';
      return;
    }
    vendorNote.textContent = 'Thanks, ' + contact_name + '! Your application has been received - we will reply within a week.';
    vendorNote.className = 'form-note success';
    vendorForm.reset();
  });
}

// ---------- Zoo booking form ----------
// NOTE: this is still browser-only confirmation. Wire it to Supabase the same
// way as the forms above (a "zoo_bookings" table) if you want real bookings recorded.
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  const bookingNote = document.getElementById('bookingNote');
  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('bkName').value.trim();
    const email = document.getElementById('bkEmail').value.trim();
    const date = document.getElementById('bkDate').value;
    const slot = document.getElementById('bkSlot').value;
    const guests = document.getElementById('bkGuests').value;
    if (!name || !isValidEmail(email) || !date || !slot || !guests) {
      bookingNote.textContent = 'Please fill in every field with a valid email address.';
      bookingNote.className = 'form-note error';
      return;
    }
    bookingNote.textContent = 'Booking request received, ' + name + '! We will confirm your ' + slot + ' slot on ' + date + ' by email.';
    bookingNote.className = 'form-note success';
    bookingForm.reset();
  });
}
