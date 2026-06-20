/**
 * TRIPZY — MERGED JAVASCRIPT
 * Full-stack SPA: auth, destination/option rendering, booking via REST API.
 * Access token stored in memory; refresh token lives in an httpOnly cookie.
 */

// ══════════════════════════════════════════════════════════
// API LAYER
// ══════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:3001/api';

// In-memory auth state — cleared on hard refresh (refresh cookie restores session)
let accessToken = null;
let currentUser = null;
let lastBookingRef = null;

// Cached API data
let cachedDestinations = null;
let cachedTripOptions = null;

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res = await fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: 'include', // sends/receives httpOnly refresh cookie
  });

  // Auto-refresh on 401, but not for auth endpoints (avoid infinite loop)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(API_BASE + path, { ...options, headers, credentials: 'include' });
    }
  }

  return res;
}

async function tryRefreshToken() {
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      accessToken = data.accessToken;
      return true;
    }
  } catch (_) {
    // network error — session lost
  }
  accessToken = null;
  currentUser = null;
  return false;
}

async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════

let currentPage = 'registration';

function navigateTo(pageName) {
  // Auth guard: itinerary + mytrips require login
  if ((pageName === 'itinerary' || pageName === 'mytrips') && !currentUser) {
    showModal({
      title: 'Login Required',
      message: `Please log in to ${pageName === 'mytrips' ? 'view your trips' : 'plan your trip'}.`,
      icon: 'lock',
      type: 'warning',
      confirmText: 'Go to Login',
      onConfirm: () => {
        switchAuthTab('login');
        navigateTo('registration');
      },
    });
    return;
  }

  // If already logged in, skip the auth page
  if (pageName === 'registration' && currentUser) {
    navigateTo('blog');
    return;
  }

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageName}`);
  if (!target) return;

  target.classList.add('active');
  currentPage = pageName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.location.hash = pageName;
  initializePage(pageName);
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (['registration', 'blog', 'itinerary', 'confirmation', 'mytrips'].includes(hash)) {
    navigateTo(hash);
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  if (typeof feather !== 'undefined') feather.replace();

  // Restore session from refresh cookie before first render
  const restored = await tryRefreshToken();
  if (restored) {
    try {
      const data = await apiJson('/auth/me');
      currentUser = data.user;
    } catch (_) {
      accessToken = null;
      currentUser = null;
    }
  }

  updateNavForAuth();

  const hash = window.location.hash.slice(1);
  if (['registration', 'blog', 'itinerary', 'confirmation', 'mytrips'].includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo(currentUser ? 'blog' : 'registration');
  }
});

// ══════════════════════════════════════════════════════════
// PAGE DISPATCH
// ══════════════════════════════════════════════════════════

function initializePage(pageName) {
  if (typeof feather !== 'undefined') feather.replace();
  switch (pageName) {
    case 'registration': initAuthPage();         break;
    case 'blog':         initBlogPage();         break;
    case 'itinerary':    initItineraryPage();    break;
    case 'confirmation': initConfirmationPage(); break;
    case 'mytrips':      initMyTripsPage();      break;
  }
}

// ══════════════════════════════════════════════════════════
// MODAL SYSTEM (unchanged from original)
// ══════════════════════════════════════════════════════════

function showModal(options) {
  const {
    title = 'Notification',
    message = '',
    icon = 'check-circle',
    type = 'success',
    confirmText = 'OK',
    cancelText = null,
    onConfirm = null,
    onCancel = null,
    closeOnOverlay = true,
    autoRedirect = false,
  } = options;

  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" aria-label="Close modal"><i data-feather="x"></i></button>
      <div class="modal-header">
        <div class="modal-icon ${type}"><i data-feather="${icon}"></i></div>
        <h3 class="modal-title" id="modal-title">${title}</h3>
      </div>
      <div class="modal-body">
        ${message}
        ${autoRedirect ? '<p id="redirect-timer" style="margin-top:1rem;color:var(--text-secondary);font-size:.9rem;text-align:center;">Redirecting in <strong>5</strong> seconds…</p>' : ''}
      </div>
      <div class="modal-footer">
        ${cancelText ? `<button class="btn btn-secondary modal-cancel">${cancelText}</button>` : ''}
        <button class="btn btn-primary modal-confirm">${confirmText}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  if (typeof feather !== 'undefined') feather.replace();

  const modal = overlay.querySelector('.modal');
  const closeBtn = overlay.querySelector('.modal-close');
  const confirmBtn = overlay.querySelector('.modal-confirm');
  const cancelBtn = overlay.querySelector('.modal-cancel');

  const closeModal = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => overlay.remove(), 300);
  };

  closeBtn.addEventListener('click', () => { if (onCancel) onCancel(); closeModal(); });
  if (closeOnOverlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { if (onCancel) onCancel(); closeModal(); }
    });
  }
  confirmBtn.addEventListener('click', () => { if (onConfirm) onConfirm(); closeModal(); });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { if (onCancel) onCancel(); closeModal(); });

  const handleEsc = (e) => {
    if (e.key === 'Escape') { if (onCancel) onCancel(); closeModal(); document.removeEventListener('keydown', handleEsc); }
  };
  document.addEventListener('keydown', handleEsc);

  setTimeout(() => confirmBtn.focus(), 100);

  if (autoRedirect && type === 'success') {
    let countdown = 5;
    const timerEl = document.getElementById('redirect-timer');
    const timer = setInterval(() => {
      countdown--;
      if (timerEl) timerEl.innerHTML = `Redirecting in <strong>${countdown}</strong> second${countdown !== 1 ? 's' : ''}…`;
      if (countdown <= 0) { clearInterval(timer); if (onConfirm) onConfirm(); closeModal(); }
    }, 1000);
    confirmBtn.addEventListener('click', () => clearInterval(timer), { once: true });
    closeBtn.addEventListener('click',   () => clearInterval(timer), { once: true });
  }
}

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════

function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return `******${String(phone).slice(-4)}`;
}

function debounce(func, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), wait); };
}

function validatePhone(v) { return /^\d{10}$/.test(v); }
function validatePinCode(v) { return /^\d{6}$/.test(v); }
function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function validatePassword(v) {
  return v.length >= 8 && /[A-Z]/.test(v) && /\d/.test(v);
}

function showFieldError(input, message) {
  const group = input.closest('.form-group');
  if (!group) return;
  group.querySelector('.error-message')?.remove();
  input.classList.add('error');
  input.classList.remove('success');
  const div = document.createElement('div');
  div.className = 'error-message';
  div.innerHTML = `<i data-feather="alert-circle" style="width:16px;height:16px;"></i> ${message}`;
  group.appendChild(div);
  if (typeof feather !== 'undefined') feather.replace();
}

function showFieldSuccess(input) {
  input.closest('.form-group')?.querySelector('.error-message')?.remove();
  input.classList.remove('error');
  input.classList.add('success');
}

function clearFieldValidation(input) {
  input.closest('.form-group')?.querySelector('.error-message')?.remove();
  input.classList.remove('error', 'success');
}

function setButtonLoading(btn, loading, originalText) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span> ${originalText}…`
    : originalText;
}

// ══════════════════════════════════════════════════════════
// AUTH PAGE (Register + Login tabs)
// ══════════════════════════════════════════════════════════

let authPageInitialized = false;

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('registrationForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
}

function initAuthPage() {
  if (authPageInitialized) return;
  authPageInitialized = true;

  // Tab switching
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  // Password visibility toggles
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      const icon = btn.querySelector('i');
      icon.setAttribute('data-feather', input.type === 'password' ? 'eye' : 'eye-off');
      if (typeof feather !== 'undefined') feather.replace();
    });
  });

  initRegisterForm();
  initLoginForm();
  initForgotPasswordFlow();
}

function initRegisterForm() {
  const form       = document.getElementById('registrationForm');
  const nameInput  = document.getElementById('reg-name');
  const phoneInput = document.getElementById('reg-phone');
  const pinInput   = document.getElementById('reg-pincode');
  const emailInput = document.getElementById('reg-email');
  const passInput  = document.getElementById('reg-password');
  const submitBtn  = document.getElementById('regSubmitBtn');
  const errorBox   = document.getElementById('reg-error');

  if (!form) return;

  // Live validation
  phoneInput.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
  pinInput.addEventListener('input',   (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });

  phoneInput.addEventListener('blur', () => {
    if (!validatePhone(phoneInput.value.trim())) showFieldError(phoneInput, 'Must be exactly 10 digits');
    else showFieldSuccess(phoneInput);
  });
  pinInput.addEventListener('blur', () => {
    if (!validatePinCode(pinInput.value.trim())) showFieldError(pinInput, 'PIN code must be exactly 6 digits');
    else showFieldSuccess(pinInput);
  });
  emailInput.addEventListener('blur', () => {
    if (!validateEmail(emailInput.value.trim())) showFieldError(emailInput, 'Enter a valid email address');
    else showFieldSuccess(emailInput);
  });
  passInput.addEventListener('blur', () => {
    if (!validatePassword(passInput.value)) showFieldError(passInput, 'Min 8 chars, 1 uppercase letter, 1 digit');
    else showFieldSuccess(passInput);
  });

  [nameInput, phoneInput, pinInput, emailInput, passInput].forEach((inp) => {
    inp.addEventListener('focus', () => { if (!inp.classList.contains('success')) clearFieldValidation(inp); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';

    const name     = nameInput.value.trim();
    const phone    = phoneInput.value.trim();
    const pinCode  = pinInput.value.trim();
    const email    = emailInput.value.trim();
    const password = passInput.value;

    // Client-side pre-check (server validates too)
    if (!name)                    { showFieldError(nameInput,  'Name is required'); nameInput.focus();  return; }
    if (!validatePhone(phone))    { showFieldError(phoneInput, 'Must be exactly 10 digits'); phoneInput.focus(); return; }
    if (!validatePinCode(pinCode)){ showFieldError(pinInput,   'PIN code must be exactly 6 digits'); pinInput.focus(); return; }
    if (!validateEmail(email))    { showFieldError(emailInput, 'Enter a valid email address'); emailInput.focus(); return; }
    if (!validatePassword(password)){ showFieldError(passInput, 'Min 8 chars, 1 uppercase letter, 1 digit'); passInput.focus(); return; }

    setButtonLoading(submitBtn, true, 'Register Now');

    try {
      const data = await apiJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, phone, pinCode, email, password }),
      });
      accessToken = data.accessToken;
      currentUser = data.user;
      updateNavForAuth();

      showModal({
        title: 'Registration Successful!',
        message: `Welcome to Tripzy, <strong>${name}</strong>! Get ready to explore amazing destinations.`,
        icon: 'check-circle',
        type: 'success',
        confirmText: 'Continue',
        closeOnOverlay: false,
        autoRedirect: true,
        onConfirm: () => navigateTo('blog'),
      });
    } catch (err) {
      errorBox.textContent = err.message || 'Registration failed. Please try again.';
      errorBox.style.display = 'block';
    } finally {
      setButtonLoading(submitBtn, false, 'Register Now');
    }
  });
}

function initLoginForm() {
  const form      = document.getElementById('loginForm');
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');
  const submitBtn  = document.getElementById('loginSubmitBtn');
  const errorBox   = document.getElementById('login-error');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      errorBox.textContent = 'Please enter your email and password.';
      errorBox.style.display = 'block';
      return;
    }

    setButtonLoading(submitBtn, true, 'Login');

    try {
      const data = await apiJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      accessToken = data.accessToken;
      currentUser = data.user;
      updateNavForAuth();

      showModal({
        title: 'Welcome Back!',
        message: `Great to see you again, <strong>${currentUser.name}</strong>!`,
        icon: 'check-circle',
        type: 'success',
        confirmText: 'Continue',
        closeOnOverlay: false,
        autoRedirect: true,
        onConfirm: () => navigateTo('blog'),
      });
    } catch (err) {
      errorBox.textContent = err.message || 'Invalid email or password.';
      errorBox.style.display = 'block';
    } finally {
      setButtonLoading(submitBtn, false, 'Login');
    }
  });
}

function showForgotFlow() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('forgotFlow').style.display = '';
  document.getElementById('forgot-step1').style.display = '';
  document.getElementById('forgot-step2').style.display = 'none';
  document.getElementById('forgot-dev-notice').style.display = 'none';
  document.getElementById('forgot-error').style.display = 'none';
  const emailInput = document.getElementById('forgot-email');
  // Pre-fill with whatever the user typed in the login email field
  const loginEmail = document.getElementById('login-email')?.value;
  if (loginEmail) emailInput.value = loginEmail;
  emailInput.focus();
}

function hideForgotFlow() {
  document.getElementById('forgotFlow').style.display = 'none';
  document.getElementById('loginForm').classList.remove('hidden');
}

function initForgotPasswordFlow() {
  document.getElementById('showForgotBtn')?.addEventListener('click', showForgotFlow);
  document.getElementById('backToLoginBtn')?.addEventListener('click', hideForgotFlow);

  // Force token input to uppercase as user types
  const tokenInput = document.getElementById('reset-token');
  tokenInput?.addEventListener('input', () => { tokenInput.value = tokenInput.value.toUpperCase(); });

  // Step 1 — request reset code
  document.getElementById('forgotRequestBtn')?.addEventListener('click', async () => {
    const emailInput = document.getElementById('forgot-email');
    const errorBox   = document.getElementById('forgot-error');
    const devNotice  = document.getElementById('forgot-dev-notice');
    const btn        = document.getElementById('forgotRequestBtn');

    errorBox.style.display = 'none';
    devNotice.style.display = 'none';

    const email = emailInput.value.trim();
    if (!validateEmail(email)) {
      errorBox.textContent = 'Please enter a valid email address.';
      errorBox.style.display = 'block';
      emailInput.focus();
      return;
    }

    setButtonLoading(btn, true, 'Send Reset Code');
    try {
      const data = await apiJson('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (data.devToken) {
        document.getElementById('forgot-dev-token').textContent = data.devToken;
        devNotice.style.display = 'block';
        // Auto-fill the code into step 2 for convenience
        if (tokenInput) tokenInput.value = data.devToken;
      }

      // Show step 2
      document.getElementById('forgot-step1').style.display = 'none';
      document.getElementById('forgot-step2').style.display = '';
      document.getElementById('reset-new-password').focus();
    } catch (err) {
      errorBox.textContent = err.message || 'Something went wrong. Please try again.';
      errorBox.style.display = 'block';
    } finally {
      setButtonLoading(btn, false, 'Send Reset Code');
    }
  });

  // Step 2 — submit new password
  document.getElementById('resetSubmitBtn')?.addEventListener('click', async () => {
    const token       = document.getElementById('reset-token').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;
    const errorBox    = document.getElementById('reset-error');
    const btn         = document.getElementById('resetSubmitBtn');

    errorBox.style.display = 'none';

    if (!token) {
      errorBox.textContent = 'Please enter the reset code.';
      errorBox.style.display = 'block';
      document.getElementById('reset-token').focus();
      return;
    }
    if (!validatePassword(newPassword)) {
      errorBox.textContent = 'Password must be at least 8 characters with 1 uppercase letter and 1 digit.';
      errorBox.style.display = 'block';
      document.getElementById('reset-new-password').focus();
      return;
    }

    setButtonLoading(btn, true, 'Reset Password');
    try {
      await apiJson('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      hideForgotFlow();
      // Pre-fill the email into the login form
      const forgotEmail = document.getElementById('forgot-email').value;
      if (forgotEmail) document.getElementById('login-email').value = forgotEmail;
      document.getElementById('login-password').value = '';

      showModal({
        title: 'Password Reset!',
        message: 'Your password has been updated. Please log in with your new password.',
        icon: 'check-circle',
        type: 'success',
        confirmText: 'Log In',
        onConfirm: () => document.getElementById('login-password').focus(),
      });
    } catch (err) {
      errorBox.textContent = err.message || 'Invalid or expired code. Please try again.';
      errorBox.style.display = 'block';
    } finally {
      setButtonLoading(btn, false, 'Reset Password');
    }
  });
}

// ══════════════════════════════════════════════════════════
// BLOG PAGE
// ══════════════════════════════════════════════════════════

let blogCarouselsReady = false;
let hamburgerReady = false;

async function initBlogPage() {
  await loadDestinations();
  if (!hamburgerReady) {
    initHamburger();
    hamburgerReady = true;
  }
  initYourTripsSection();
}

async function loadDestinations() {
  const container = document.getElementById('destinations-container');
  if (!container) return;

  // Use cache — destinations don't change at runtime
  if (cachedDestinations) {
    renderDestinationsHTML(container, cachedDestinations);
    return;
  }

  container.innerHTML = '<div class="loading-state"><span class="spinner spinner-dark"></span> Loading destinations…</div>';

  try {
    cachedDestinations = await apiJson('/destinations');
    renderDestinationsHTML(container, cachedDestinations);
  } catch (_) {
    container.innerHTML = '<div class="error-state">Failed to load destinations. Please refresh the page.</div>';
  }
}

function renderDestinationsHTML(container, destinations) {
  container.innerHTML = destinations.map((d, i) => buildDestinationSection(d, i)).join('');
  if (typeof feather !== 'undefined') feather.replace();

  if (!blogCarouselsReady) {
    initCarousels();
    initScrollHighlight();
    blogCarouselsReady = true;
  }
}

function buildDestinationSection(dest, index) {
  const slides = dest.images.map((src, i) => `
    <div class="carousel-slide">
      <img src="${src}" alt="${escHtml(dest.name)} — image ${i + 1}" loading="lazy">
    </div>`).join('');

  const indicators = dest.images.map((_, i) => `
    <button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>`).join('');

  const listItems = (arr) => arr.map((t) => `<li>${escHtml(t)}</li>`).join('');
  const tags = dest.tags.map((t) => `<span class="tag">${escHtml(t)}</span>`).join('');

  // map slug → pin colour class for destination sections
  const colorMap = { paris:'#c0392b', tokyo:'#8e44ad', rome:'#d35400', newyork:'#27ae60', london:'#2980b9' };
  const pinColor = colorMap[dest.slug] || '#667eea';

  return `
    <section id="${escHtml(dest.slug)}" class="destination-section">
      <div class="container">
        <div class="destination-card">
          <div class="carousel" data-carousel="${escHtml(dest.slug)}">
            <button class="carousel-btn carousel-btn-prev" aria-label="Previous image">
              <i data-feather="chevron-left"></i>
            </button>
            <div class="carousel-container">${slides}</div>
            <button class="carousel-btn carousel-btn-next" aria-label="Next image">
              <i data-feather="chevron-right"></i>
            </button>
            <div class="carousel-indicators">${indicators}</div>
          </div>

          <div class="destination-content">
            <h2 class="destination-title" style="display:flex;align-items:center;gap:.5rem;">
              <span style="width:10px;height:10px;border-radius:50%;background:${pinColor};display:inline-block;flex-shrink:0;"></span>
              ${escHtml(dest.name)}
            </h2>
            <p class="destination-description">${escHtml(dest.description)}</p>
            <div class="destination-info-section">
              <div class="info-block">
                <h3>Best Time to Visit</h3>
                <ul>${listItems(dest.bestTimeToVisit)}</ul>
              </div>
              <div class="info-block">
                <h3>Top Attractions</h3>
                <ul>${listItems(dest.topAttractions)}</ul>
              </div>
              <div class="info-block">
                <h3>Travel Tips</h3>
                <ul>${listItems(dest.travelTips)}</ul>
              </div>
              <div class="info-block">
                <h3>Tags</h3>
                <div class="tags">${tags}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initCarousels() {
  document.querySelectorAll('.carousel').forEach((carousel) => {
    const containerEl  = carousel.querySelector('.carousel-container');
    const slides       = carousel.querySelectorAll('.carousel-slide');
    const prevBtn      = carousel.querySelector('.carousel-btn-prev');
    const nextBtn      = carousel.querySelector('.carousel-btn-next');
    const indicators   = carousel.querySelectorAll('.carousel-indicator');

    let current = 0;
    const total = slides.length;
    let timer;

    const go = (idx) => {
      current = (idx + total) % total;
      containerEl.style.transform = `translateX(-${current * 100}%)`;
      indicators.forEach((ind, i) => ind.classList.toggle('active', i === current));
    };

    const startAuto = () => { timer = setInterval(() => go(current + 1), 5000); };
    const stopAuto  = () => clearInterval(timer);
    const bump      = (delta) => { go(current + delta); stopAuto(); startAuto(); };

    nextBtn.addEventListener('click', () => bump(1));
    prevBtn.addEventListener('click', () => bump(-1));
    indicators.forEach((ind, i) => ind.addEventListener('click', () => { go(i); stopAuto(); startAuto(); }));

    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') bump(-1);
      if (e.key === 'ArrowRight') bump(1);
    });

    let touchStartX = 0;
    carousel.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; stopAuto(); });
    carousel.addEventListener('touchend',   (e) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) bump(diff > 0 ? 1 : -1);
      startAuto();
    });

    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
    startAuto();
  });
}

function initHamburger() {
  const btn   = document.getElementById('hamburgerMenu');
  const links = document.getElementById('blogNavLinks');
  if (!btn || !links) return;

  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    links.classList.toggle('active');
  });

  links.querySelectorAll('.blog-nav-link').forEach((l) => {
    l.addEventListener('click', () => { btn.classList.remove('active'); links.classList.remove('active'); });
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !links.contains(e.target)) {
      btn.classList.remove('active');
      links.classList.remove('active');
    }
  });
}

function initScrollHighlight() {
  const nav = document.querySelector('.blog-nav');
  if (!nav) return;
  const navH = nav.offsetHeight;
  const navLinks = document.querySelectorAll('.blog-nav-link');

  const highlight = () => {
    const scrollY = window.scrollY + navH + 100;
    document.querySelectorAll('.destination-section').forEach((sec) => {
      if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) {
        navLinks.forEach((l) => { l.style.background = ''; l.style.color = ''; });
        const link = document.querySelector(`.blog-nav-link[href="#${sec.id}"]`);
        if (link) { link.style.background = '#e7f3ff'; link.style.color = 'var(--btn-primary)'; }
      }
    });
  };

  let raf;
  window.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(highlight);
  });
  highlight();
}

// ══════════════════════════════════════════════════════════
// ITINERARY PAGE
// ══════════════════════════════════════════════════════════

let itineraryReady = false;
let selectedDestIds = [];   // DB IDs
let selectedOptionIds = []; // DB IDs

async function initItineraryPage() {
  if (!currentUser) return; // navigateTo already handles redirect before we get here

  if (!itineraryReady) {
    await loadItineraryOptions();
  }
}

async function loadItineraryOptions() {
  try {
    // Destinations and options in parallel
    if (!cachedDestinations) {
      cachedDestinations = await apiJson('/destinations');
    }
    if (!cachedTripOptions) {
      cachedTripOptions = await apiJson('/trip-options');
    }

    renderDestinationCheckboxes(cachedDestinations);
    renderOptionCheckboxes(cachedTripOptions, 'TRAVEL',   'travel-checkbox-list');
    renderOptionCheckboxes(cachedTripOptions, 'FOOD',     'food-checkbox-list');
    renderOptionCheckboxes(cachedTripOptions, 'ACTIVITY', 'activity-checkbox-list');

    if (typeof feather !== 'undefined') feather.replace();

    setupItineraryListeners();
    animateItineraryCategories();
    itineraryReady = true;
  } catch (_) {
    ['dest-checkbox-list','travel-checkbox-list','food-checkbox-list','activity-checkbox-list'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<div class="error-state">Failed to load options. Please refresh.</div>';
    });
  }
}

function renderDestinationCheckboxes(destinations) {
  const container = document.getElementById('dest-checkbox-list');
  if (!container) return;

  container.innerHTML = destinations.map((d) => `
    <label class="checkbox-item" for="dest-${escHtml(d.slug)}">
      <input type="checkbox"
             id="dest-${escHtml(d.slug)}"
             data-db-id="${escHtml(d.id)}"
             data-type="destination"
             data-price="${d.basePrice}">
      <div class="checkbox-content">
        <div class="checkbox-title">${escHtml(d.name)}, ${escHtml(d.country)}</div>
        <div class="checkbox-subtitle">${escHtml(d.description.slice(0, 70))}…</div>
      </div>
      <div class="checkbox-price">${formatCurrency(d.basePrice)}</div>
    </label>`).join('');
}

function renderOptionCheckboxes(options, category, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = options.filter((o) => o.category === category);
  container.innerHTML = filtered.map((o) => `
    <label class="checkbox-item" for="opt-${escHtml(o.optionKey)}">
      <input type="checkbox"
             id="opt-${escHtml(o.optionKey)}"
             data-db-id="${escHtml(o.id)}"
             data-type="tripOption"
             data-option-key="${escHtml(o.optionKey)}"
             data-price="${o.price}">
      <div class="checkbox-content">
        <div class="checkbox-title">${escHtml(o.title)}</div>
        <div class="checkbox-subtitle">${escHtml(o.subtitle)}</div>
      </div>
      <div class="checkbox-price">${formatCurrency(o.price)}</div>
    </label>`).join('');
}

function setupItineraryListeners() {
  const checkboxes     = document.querySelectorAll('#page-itinerary input[type="checkbox"]');
  const summaryEl      = document.getElementById('selectedItems');
  const totalPriceEl   = document.getElementById('totalPrice');
  const confirmBtn     = document.getElementById('confirmTripBtn');

  if (!summaryEl || !totalPriceEl || !confirmBtn) return;

  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      updateItinerarySelection(checkboxes);
      updateItinerarySummary(summaryEl, totalPriceEl);
      animateCheckboxItem(cb);
    });
  });

  // breakfast / all-inclusive mutual exclusion
  const breakfast    = document.getElementById('opt-breakfast');
  const allInclusive = document.getElementById('opt-allinclusive');
  if (breakfast && allInclusive) {
    allInclusive.addEventListener('change', () => {
      if (allInclusive.checked && breakfast.checked) {
        breakfast.checked = false;
        animateCheckboxItem(breakfast);
        updateItinerarySelection(checkboxes);
        updateItinerarySummary(summaryEl, totalPriceEl);
        showModal({
          title: 'Selection Updated',
          message: "Daily Breakfast has been deselected — it's included in the All-Inclusive Dining package.",
          icon: 'alert-circle',
          type: 'warning',
          confirmText: 'Got it',
        });
      }
    });
  }

  confirmBtn.addEventListener('click', () => handleConfirmTrip());
}

function updateItinerarySelection(checkboxes) {
  selectedDestIds   = [];
  selectedOptionIds = [];

  checkboxes.forEach((cb) => {
    if (!cb.checked) return;
    if (cb.dataset.type === 'destination') selectedDestIds.push(cb.dataset.dbId);
    if (cb.dataset.type === 'tripOption')  selectedOptionIds.push(cb.dataset.dbId);
  });
}

function updateItinerarySummary(summaryEl, totalEl) {
  const checkboxes = document.querySelectorAll('#page-itinerary input[type="checkbox"]:checked');

  if (checkboxes.length === 0) {
    summaryEl.innerHTML = `
      <p style="text-align:center;color:var(--text-secondary);padding:2rem 0;">
        <i data-feather="info" style="width:24px;height:24px;margin-bottom:.5rem;"></i><br>
        No items selected yet
      </p>`;
    totalEl.textContent = '₹0';
    if (typeof feather !== 'undefined') feather.replace();
    return;
  }

  let total = 0;
  const dests  = [];
  const others = [];

  checkboxes.forEach((cb) => {
    const price = Number(cb.dataset.price);
    total += price;
    const label = cb.closest('label');
    const title = label?.querySelector('.checkbox-title')?.textContent || cb.id;
    if (cb.dataset.type === 'destination') dests.push({ title, price });
    else others.push({ title, price });
  });

  let html = '<div style="display:flex;flex-direction:column;gap:.75rem;">';

  if (dests.length) {
    html += `<div style="margin-bottom:.75rem;padding-bottom:.75rem;border-bottom:2px solid var(--btn-primary);">
      <div style="font-weight:600;color:var(--btn-primary);margin-bottom:.75rem;font-size:.9rem;">DESTINATIONS (Visa, Insurance &amp; Taxes)</div>`;
    dests.forEach((d) => {
      html += `<div class="price-row" style="margin-bottom:0;padding-bottom:.5rem;">
        <span class="price-label" style="font-size:.9rem;">${escHtml(d.title)}</span>
        <span class="price-value" style="font-size:.9rem;">${formatCurrency(d.price)}</span>
      </div>`;
    });
    html += '</div>';
  }

  others.forEach((o) => {
    html += `<div class="price-row" style="margin-bottom:0;padding-bottom:.75rem;">
      <span class="price-label" style="font-size:.95rem;">${escHtml(o.title)}</span>
      <span class="price-value">${formatCurrency(o.price)}</span>
    </div>`;
  });

  html += '</div>';
  summaryEl.innerHTML = html;
  totalEl.textContent = formatCurrency(total);
}

function animateCheckboxItem(cb) {
  const item = cb.closest('.checkbox-item');
  if (!item) return;
  if (cb.checked) {
    item.style.borderColor = 'var(--btn-primary)';
    item.style.background  = '#e7f3ff';
    const priceEl = item.querySelector('.checkbox-price');
    if (priceEl) {
      priceEl.style.transform = 'scale(1.1)';
      setTimeout(() => { priceEl.style.transform = 'scale(1)'; }, 200);
    }
  } else {
    item.style.borderColor = 'var(--border-color)';
    item.style.background  = 'var(--bg-card)';
  }
}

function animateItineraryCategories() {
  document.querySelectorAll('#page-itinerary .option-category').forEach((cat, i) => {
    cat.style.opacity = '0';
    cat.style.transform = 'translateY(20px)';
    setTimeout(() => {
      cat.style.transition = 'opacity .5s ease, transform .5s ease';
      cat.style.opacity = '1';
      cat.style.transform = 'translateY(0)';
    }, i * 100);
  });
}

async function handleConfirmTrip() {
  if (selectedDestIds.length === 0 && selectedOptionIds.length === 0) {
    showModal({ title: 'No Items Selected', message: 'Please select at least one travel option to continue.', icon: 'alert-circle', type: 'warning', confirmText: 'OK' });
    return;
  }

  if (selectedDestIds.length === 0) {
    showModal({ title: 'No Destination Selected', message: 'Please select at least one destination for your trip.', icon: 'alert-circle', type: 'warning', confirmText: 'OK' });
    return;
  }

  // Build preview list
  const checkboxes = document.querySelectorAll('#page-itinerary input[type="checkbox"]:checked');
  let previewTotal = 0;
  let listHTML = '<ul style="text-align:left;margin:1rem 0;padding-left:1.5rem;line-height:2;">';
  checkboxes.forEach((cb) => {
    const price = Number(cb.dataset.price);
    previewTotal += price;
    const title = cb.closest('label')?.querySelector('.checkbox-title')?.textContent || cb.id;
    listHTML += `<li>${escHtml(title)} — ${formatCurrency(price)}</li>`;
  });
  listHTML += `</ul><div style="margin-top:1rem;padding-top:1rem;border-top:2px solid var(--btn-primary);font-size:1.25rem;font-weight:600;color:var(--btn-primary);">
    Total: ${formatCurrency(previewTotal)}
  </div>`;

  const today = new Date().toISOString().split('T')[0];
  const datePickerHTML = `
    <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #e9ecef;">
      <label style="font-weight:600;display:block;margin-bottom:.5rem;">Travel Date <span style="font-weight:400;color:var(--text-secondary);font-size:.85rem;">(optional)</span></label>
      <input type="date" id="modal-travel-date" min="${today}"
        style="width:100%;padding:.625rem .75rem;border:1px solid var(--border-color);border-radius:8px;font-size:.95rem;color:var(--text-primary);">
      <p style="font-size:.78rem;color:var(--text-secondary);margin-top:.35rem;">Setting a date lets you track Upcoming vs Past trips in My Trips.</p>
    </div>`;

  showModal({
    title: 'Confirm Your Trip',
    message: `<p style="margin-bottom:1rem;">You have selected:</p>${listHTML}${datePickerHTML}<p style="margin-top:1rem;">Ready to proceed?</p>`,
    icon: 'check-circle',
    type: 'success',
    confirmText: 'Confirm Booking',
    cancelText: 'Review Again',
    closeOnOverlay: false,
    onConfirm: () => {
      const dateInput = document.getElementById('modal-travel-date');
      submitBooking(dateInput?.value || null);
    },
  });
}

async function submitBooking(travelDate = null) {
  const confirmBtn = document.getElementById('confirmTripBtn');
  setButtonLoading(confirmBtn, true, 'Confirm Trip');

  try {
    const payload = {
      destinationIds: selectedDestIds,
      tripOptionIds:  selectedOptionIds,
    };
    if (travelDate) payload.travelDate = travelDate;

    const data = await apiJson('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    lastBookingRef = data.booking.reference;

    showModal({
      title: 'Booking Confirmed!',
      message: `Your trip has been booked! Reference: <strong>${lastBookingRef}</strong>`,
      icon: 'check-circle',
      type: 'success',
      confirmText: 'View Confirmation',
      closeOnOverlay: false,
      autoRedirect: true,
      onConfirm: () => navigateTo('confirmation'),
    });
  } catch (err) {
    showModal({
      title: 'Booking Failed',
      message: err.message || 'Unable to complete your booking. Please try again.',
      icon: 'alert-circle',
      type: 'error',
      confirmText: 'OK',
    });
  } finally {
    setButtonLoading(confirmBtn, false, 'Confirm Trip');
    if (typeof feather !== 'undefined') feather.replace();
  }
}

// ══════════════════════════════════════════════════════════
// CONFIRMATION PAGE
// ══════════════════════════════════════════════════════════

let lastRenderedRef = null;

async function initConfirmationPage() {
  if (!lastBookingRef) {
    showModal({
      title: 'No Booking Found',
      message: "We couldn't find a recent booking. Please plan a new trip.",
      icon: 'alert-circle',
      type: 'warning',
      confirmText: 'Plan a Trip',
      closeOnOverlay: false,
      onConfirm: () => navigateTo('itinerary'),
    });
    return;
  }

  // Avoid redundant re-fetch on re-visit
  if (lastRenderedRef === lastBookingRef) return;

  const tripItems    = document.getElementById('tripItems');
  const totalAmountEl = document.getElementById('totalAmount');

  tripItems.innerHTML = '<div class="loading-state"><span class="spinner spinner-dark"></span> Loading…</div>';

  try {
    const data = await apiJson(`/bookings/${lastBookingRef}`);
    const booking = data.booking;
    lastRenderedRef = lastBookingRef;

    // Reference & dates
    document.getElementById('bookingRef').textContent  = booking.reference;
    document.getElementById('confUserName').textContent  = booking.user?.name  || '—';
    document.getElementById('confUserEmail').textContent = booking.user?.email || '—';
    document.getElementById('confUserPhone').textContent = maskPhone(booking.user?.phone);
    document.getElementById('bookingDate').textContent   = new Date(booking.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // Trip items
    const items = booking.items || [];
    if (items.length > 0) {
      tripItems.innerHTML = items.map((item, i) => {
        const label = item.destination
          ? `${item.destination.name}, ${item.destination.country}`
          : item.tripOption
            ? item.tripOption.title
            : 'Unknown item';
        return `
          <div class="summary-item" style="animation:slideUp .5s ease forwards;animation-delay:${i * 0.1}s;opacity:0;">
            <span class="summary-label">${escHtml(label)}</span>
            <span class="summary-value">${formatCurrency(item.priceAtBooking)}</span>
          </div>`;
      }).join('');
    } else {
      tripItems.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No items found</p>';
    }

    totalAmountEl.textContent = formatCurrency(booking.total);

    // "Plan Another" resets itinerary state and goes back to itinerary
    document.getElementById('planAnotherBtn').onclick = () => {
      itineraryReady  = false;
      selectedDestIds = [];
      selectedOptionIds = [];
      lastBookingRef  = null;
      lastRenderedRef = null;
      navigateTo('itinerary');
    };

    launchConfetti();
    animateConfirmIcon();
  } catch (err) {
    tripItems.innerHTML = `<div class="error-state">Failed to load booking: ${escHtml(err.message)}</div>`;
  }
}

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#56c8ff', '#667eea', '#764ba2', '#51cf66', '#ffd43b'];
  const pieces = Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 10 + 5,
    h: Math.random() * 10 + 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: Math.random() * 3 + 2,
    angle: Math.random() * Math.PI * 2,
    spin: Math.random() * 0.2 - 0.1,
  }));

  let animId;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((c) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
      c.y += c.speed;
      c.angle += c.spin;
      if (c.y > canvas.height) { c.y = -20; c.x = Math.random() * canvas.width; }
    });
    animId = requestAnimationFrame(draw);
  };

  draw();
  setTimeout(() => {
    cancelAnimationFrame(animId);
    canvas.style.transition = 'opacity 1s';
    canvas.style.opacity = '0';
    setTimeout(() => { canvas.style.opacity = ''; canvas.style.transition = ''; }, 1000);
  }, 5000);
}

function animateConfirmIcon() {
  const icon = document.querySelector('#page-confirmation .confirmation-icon');
  if (!icon) return;
  icon.style.transform = 'scale(0)';
  setTimeout(() => {
    icon.style.transition = 'transform .5s cubic-bezier(.68,-.55,.265,1.55)';
    icon.style.transform = 'scale(1)';
  }, 300);
}

// ══════════════════════════════════════════════════════════
// VIEW BOOKING DETAILS (from any trip card)
// ══════════════════════════════════════════════════════════

function viewBookingDetails(ref) {
  lastBookingRef  = ref;
  lastRenderedRef = null; // force re-fetch
  navigateTo('confirmation');
}

// ══════════════════════════════════════════════════════════
// BLOG PAGE — "Your Trips" inline section
// ══════════════════════════════════════════════════════════

let blogTripTabsBound = false;

async function initYourTripsSection() {
  const section = document.getElementById('your-trips-section');
  if (!section) return;

  if (!currentUser) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  if (typeof feather !== 'undefined') feather.replace();

  const list = document.getElementById('blog-trips-list');
  list.innerHTML = '<div class="loading-state"><span class="spinner spinner-dark"></span> Loading…</div>';

  try {
    // Reuse allBookings if already fetched from My Trips page
    if (!allBookings.length) {
      allBookings = await apiJson('/bookings');
    }
    renderBlogTripCards('upcoming');
    updateBlogTripTabCounts();

    if (!blogTripTabsBound) {
      document.querySelectorAll('#blog-trips-tabs .trips-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('#blog-trips-tabs .trips-tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          renderBlogTripCards(tab.dataset.filter);
        });
      });
      blogTripTabsBound = true;
    }
  } catch (err) {
    list.innerHTML = `<div class="error-state">Could not load trips: ${escHtml(err.message)}</div>`;
  }
}

function updateBlogTripTabCounts() {
  const now = new Date();
  const counts = {
    upcoming: allBookings.filter((b) => !b.travelDate || new Date(b.travelDate) >= now).length,
    past:     allBookings.filter((b) =>  b.travelDate && new Date(b.travelDate) <  now).length,
    all:      allBookings.length,
  };
  const labels = { upcoming: 'Upcoming', past: 'Past', all: 'All Trips' };
  document.querySelectorAll('#blog-trips-tabs .trips-tab').forEach((tab) => {
    tab.textContent = `${labels[tab.dataset.filter]} (${counts[tab.dataset.filter]})`;
  });
}

function renderBlogTripCards(filter) {
  const list = document.getElementById('blog-trips-list');
  if (!list) return;

  const now = new Date();
  let bookings = allBookings;
  if (filter === 'upcoming') bookings = allBookings.filter((b) => !b.travelDate || new Date(b.travelDate) >= now);
  else if (filter === 'past') bookings = allBookings.filter((b) =>  b.travelDate && new Date(b.travelDate) <  now);

  if (bookings.length === 0) {
    const emptyTitle = filter === 'upcoming' ? 'No upcoming trips' : filter === 'past' ? 'No past journeys yet' : 'No trips yet';
    const emptySub   = filter === 'upcoming' ? 'Plan your first adventure below!' : 'Your completed journeys will appear here.';
    list.innerHTML = `<div class="empty-state" style="padding:2rem 1rem;"><h3>${emptyTitle}</h3><p>${emptySub}</p></div>`;
    return;
  }

  // Limit preview to 3 on the blog page
  list.innerHTML = bookings.slice(0, 3).map((b) => buildTripCard(b, now)).join('');
  if (typeof feather !== 'undefined') feather.replace();
}

// ══════════════════════════════════════════════════════════
// AUTH NAV — show/hide My Trips + Logout based on session
// ══════════════════════════════════════════════════════════

function updateNavForAuth() {
  const myTripsBtn = document.getElementById('nav-mytrips-btn');
  const logoutBtn  = document.getElementById('nav-logout-btn');
  const userName   = document.getElementById('nav-user-name');

  const loggedIn = !!currentUser;

  if (myTripsBtn) myTripsBtn.style.display = loggedIn ? '' : 'none';
  if (logoutBtn)  logoutBtn.style.display  = loggedIn ? '' : 'none';
  if (userName) {
    userName.style.display = loggedIn ? '' : 'none';
    if (loggedIn) userName.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
  }
}

async function doLogout() {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}

  accessToken     = null;
  currentUser     = null;
  itineraryReady  = false;
  selectedDestIds   = [];
  selectedOptionIds = [];
  lastBookingRef  = null;
  lastRenderedRef = null;

  updateNavForAuth();
  navigateTo('registration');
}

// ══════════════════════════════════════════════════════════
// MY TRIPS PAGE
// ══════════════════════════════════════════════════════════

let myTripsTabsBound = false;
let allBookings = [];

async function initMyTripsPage() {
  if (!currentUser) return; // navigateTo already guards

  const greeting = document.getElementById('mytrips-greeting');
  if (greeting) greeting.textContent = `${currentUser.name}'s travel history and upcoming adventures`;

  await loadMyTrips();

  if (!myTripsTabsBound) {
    document.querySelectorAll('.trips-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.trips-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        renderTripCards(tab.dataset.filter);
      });
    });
    myTripsTabsBound = true;
  }
}

async function loadMyTrips() {
  const list = document.getElementById('trips-list');
  if (!list) return;

  list.innerHTML = '<div class="loading-state"><span class="spinner spinner-dark"></span> Loading your trips…</div>';

  try {
    allBookings = await apiJson('/bookings');

    const now      = new Date();
    const upcoming = allBookings.filter((b) => !b.travelDate || new Date(b.travelDate) >= now);
    const past     = allBookings.filter((b) =>  b.travelDate && new Date(b.travelDate) <  now);

    // Update tab labels with counts
    const counts = { upcoming: upcoming.length, past: past.length, all: allBookings.length };
    const labels = { upcoming: 'Upcoming', past: 'Past', all: 'All Trips' };
    document.querySelectorAll('#trips-tabs .trips-tab').forEach((tab) => {
      const f = tab.dataset.filter;
      tab.textContent = `${labels[f]} (${counts[f]})`;
    });

    // Activate the correct tab based on which has content
    const activeTab = document.querySelector('.trips-tab.active');
    renderTripCards(activeTab?.dataset.filter || 'upcoming');
  } catch (err) {
    list.innerHTML = `<div class="error-state">Failed to load trips: ${escHtml(err.message)}</div>`;
  }
}

function renderTripCards(filter) {
  const list = document.getElementById('trips-list');
  if (!list) return;

  const now = new Date();
  let bookings = allBookings;

  if (filter === 'upcoming') {
    bookings = allBookings.filter((b) => !b.travelDate || new Date(b.travelDate) >= now);
  } else if (filter === 'past') {
    bookings = allBookings.filter((b) =>  b.travelDate && new Date(b.travelDate) <  now);
  }

  if (bookings.length === 0) {
    const emptyTitle = filter === 'past' ? 'No past trips yet' : filter === 'upcoming' ? 'No upcoming trips' : 'No trips booked yet';
    const emptySub   = filter === 'upcoming'
      ? 'Plan your first adventure — click "Book a New Trip" below!'
      : filter === 'past' ? 'Your completed journeys will appear here.'
        : 'Start exploring and book your dream trip!';

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-feather="${filter === 'past' ? 'check-circle' : 'calendar'}" style="width:48px;height:48px;"></i></div>
        <h3>${emptyTitle}</h3>
        <p>${emptySub}</p>
      </div>`;
    if (typeof feather !== 'undefined') feather.replace();
    return;
  }

  list.innerHTML = bookings.map((b) => buildTripCard(b, now)).join('');
  if (typeof feather !== 'undefined') feather.replace();
}

function buildTripCard(booking, now) {
  const dests = booking.items.filter((i) => i.destination);
  const opts  = booking.items.filter((i) => i.tripOption);

  // Compute readable title
  const destNames = dests.map((i) => i.destination.name);
  let title = 'Trip';
  if (destNames.length === 1)      title = destNames[0];
  else if (destNames.length === 2) title = `${destNames[0]} to ${destNames[1]}`;
  else if (destNames.length >= 3)  title = `${destNames[0]} to ${destNames[1]} (+${destNames.length - 2} more)`;

  // Thumbnail: first image of first destination (images is a JSON string from the DB)
  let thumbnail = null;
  if (dests.length > 0 && dests[0].destination.images) {
    try {
      const imgs = JSON.parse(dests[0].destination.images);
      thumbnail = Array.isArray(imgs) && imgs.length ? imgs[0] : null;
    } catch (_) {}
  }

  const isPast     = booking.travelDate && new Date(booking.travelDate) < now;
  const isUpcoming = booking.travelDate && new Date(booking.travelDate) >= now;

  const travelDateStr = booking.travelDate
    ? new Date(booking.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date not set';
  const bookedDateStr = new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusBadge = booking.status === 'CONFIRMED'
    ? '<span class="trip-badge badge-confirmed">Confirmed</span>'
    : '<span class="trip-badge badge-cancelled">Cancelled</span>';
  const timeBadge = isPast
    ? '<span class="trip-badge badge-past">Past</span>'
    : isUpcoming ? '<span class="trip-badge badge-upcoming">Upcoming</span>'
      : '<span class="trip-badge badge-nodateyet">No Date</span>';

  const thumbHTML = thumbnail
    ? `<img src="${escHtml(thumbnail)}" alt="${escHtml(title)}" class="trip-thumb">`
    : `<div class="trip-thumb-placeholder"><i data-feather="map-pin"></i></div>`;

  const optNames = opts.map((i) => escHtml(i.tripOption.title)).join(' · ');

  return `
    <div class="trip-card">
      ${thumbHTML}
      <div class="trip-card-body">
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
          <span class="trip-ref">${escHtml(booking.reference)}</span>
          ${statusBadge}
          ${timeBadge}
        </div>
        <h3 class="trip-title">${escHtml(title)}</h3>
        <div class="trip-meta">
          <span><i data-feather="calendar" style="width:12px;height:12px;"></i> Travel: ${travelDateStr}</span>
          <span><i data-feather="clock" style="width:12px;height:12px;"></i> Booked: ${bookedDateStr}</span>
        </div>
        ${optNames ? `<div class="trip-options-row">${optNames}</div>` : ''}
      </div>
      <div class="trip-card-actions">
        <span class="trip-total">${formatCurrency(booking.total)}</span>
        <button type="button" class="view-details-btn" onclick="viewBookingDetails('${escHtml(booking.reference)}')">
          View Details &rarr;
        </button>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// BOOTSTRAP
// ══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  if (typeof feather !== 'undefined') feather.replace();
});
