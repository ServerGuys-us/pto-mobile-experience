/* ============================================================
   PTO MOBILE EXPERIENCE — Main JavaScript
   ============================================================ */

/* ── NAV: scroll class + mobile toggle ─────────────────── */
(function () {
  const nav        = document.getElementById('nav');
  const toggle     = document.getElementById('navToggle');
  const mobileNav  = document.getElementById('navMobile');

  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      toggle.classList.toggle('active', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!nav?.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('open');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // Active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    if (a.getAttribute('href') === path || a.getAttribute('href') === path.replace('/index.html', '/')) {
      a.classList.add('active');
    }
  });
})();

/* ── ANIMATE ON SCROLL ──────────────────────────────────── */
(function () {
  const els = document.querySelectorAll('.anim-on-scroll');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach(el => observer.observe(el));
})();

/* ── FAQ ACCORDION ──────────────────────────────────────── */
(function () {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-answer').style.maxHeight = '0';
      });

      // Open clicked (if it was closed)
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
})();

/* ── QUOTE FORM SUBMISSION ──────────────────────────────── */
(function () {
  const form    = document.getElementById('quoteForm');
  const success = document.getElementById('formSuccess');
  const alertEl = document.getElementById('formAlert');

  if (!form) return;

  // Block past dates in the date picker
  const dateInput = form.querySelector('[name="event_date"]');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  // ── Validation rules ──────────────────────────────────────
  const RULES = [
    { name: 'name',            msg: 'Full name is required.' },
    { name: 'phone',           msg: 'Phone number is required.' },
    { name: 'email',           msg: 'A valid email address is required.',
      test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    { name: 'event_type',      msg: 'Please select your event type.' },
    { name: 'event_date',      msg: 'Please choose a future event date.',
      test: v => v && new Date(v + 'T00:00:00') >= new Date(new Date().toDateString()) },
    { name: 'start_time',      msg: 'Start time is required.' },
    { name: 'guests',          msg: 'Please select your group size.' },
    { name: 'pickup_location', msg: 'Pickup location is required.' },
  ];

  function validateForm() {
    clearAllErrors();
    let firstInvalid = null;
    RULES.forEach(({ name, msg, test }) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) return;
      const val = field.value.trim();
      if (!val || (test && !test(val))) {
        markInvalid(field, msg);
        if (!firstInvalid) firstInvalid = field;
      }
    });
    return firstInvalid;
  }

  function markInvalid(field, msg) {
    field.classList.add('invalid');
    const errEl = document.getElementById('err_' + field.name);
    if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
  }

  function clearField(field) {
    field.classList.remove('invalid');
    const errEl = document.getElementById('err_' + field.name);
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
  }

  function clearAllErrors() {
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    form.querySelectorAll('.field-error.visible').forEach(el => {
      el.textContent = ''; el.classList.remove('visible');
    });
    if (alertEl) { alertEl.style.display = 'none'; }
  }

  // Clear each field's error as the user fixes it
  RULES.forEach(({ name }) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field) {
      field.addEventListener('input',  () => clearField(field));
      field.addEventListener('change', () => clearField(field));
    }
  });

  // ── Submit ────────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const firstInvalid = validateForm();
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus();
      return;
    }

    const btn     = form.querySelector('[type="submit"]');
    const origTxt = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span> Sending…';

    const data = Object.fromEntries(new FormData(form));

    try {
      const res  = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        form.style.display = 'none';
        if (success) success.classList.add('visible');
        if (typeof gtag !== 'undefined') gtag('event', 'quote_submitted', { event_category: 'lead' });
      } else {
        showBanner(json.error || 'Something went wrong. Please call us directly.');
        btn.disabled  = false;
        btn.innerHTML = origTxt;
      }
    } catch {
      showBanner('Network error. Please try again or call us at (832) 737-0646.');
      btn.disabled  = false;
      btn.innerHTML = origTxt;
    }
  });

  function showBanner(msg) {
    if (!alertEl) return;
    alertEl.textContent   = msg;
    alertEl.className     = 'alert alert-error';
    alertEl.style.display = 'block';
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();

/* ── CONTACT FORM SUBMISSION ────────────────────────────── */
(function () {
  const form    = document.getElementById('contactForm');
  const alertEl = document.getElementById('contactAlert');

  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const btn     = form.querySelector('[type="submit"]');
    const origTxt = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending…';
    if (alertEl) { alertEl.style.display = 'none'; }

    const data = Object.fromEntries(new FormData(form));
    data.source = 'contact_page';

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.success) {
        if (alertEl) {
          alertEl.textContent = '✓ Message sent! We\'ll be in touch within a few hours.';
          alertEl.className = 'alert alert-success';
          alertEl.style.display = 'block';
        }
        form.reset();
      } else {
        throw new Error(json.error);
      }
    } catch (err) {
      if (alertEl) {
        alertEl.textContent = err.message || 'Failed to send. Please call us directly.';
        alertEl.className = 'alert alert-error';
        alertEl.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = origTxt;
    }
  });
})();

/* ── SMOOTH SCROLL FOR ANCHOR LINKS ────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ── FLEET CAROUSEL (mobile swipe hint) ─────────────────── */
(function () {
  const track = document.querySelector('.fleet-scroll');
  if (!track) return;
  // Touch drag scroll
  let startX, scrollLeft, isDown = false;
  track.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft; });
  track.addEventListener('mouseleave', () => { isDown = false; });
  track.addEventListener('mouseup',   () => { isDown = false; });
  track.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX);
  });
})();
