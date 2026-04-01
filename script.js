/* ══════════════════════════════════════════
   SAFSHIKAN — Aerial Agri Solutions
   script.js — Video Optimised + Mobile Menu
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   VIDEO OPTIMISATION UTILITIES
══════════════════════════════════════════ */

/**
 * True if the user prefers reduced motion.
 * We never autoplay in this case — accessibility + battery.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * True if the connection is too slow for streaming video.
 * Saves mobile data on 2G / save-data mode.
 */
function isSlowConnection() {
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  return conn.saveData === true ||
    conn.effectiveType === '2g' ||
    conn.effectiveType === 'slow-2g';
}

/**
 * True when the screen is a "mobile" width.
 * Used to pick the lower-res Cloudinary variant.
 */
function isMobileViewport() {
  return window.matchMedia('(max-width: 600px)').matches;
}

/**
 * Load a video from its data-src (or data-src-mobile on phones) and play it.
 * Guards against double-loading with a data-loaded flag.
 *
 * Why data-src instead of src:
 *   Setting src="" or src on page load immediately triggers a network request.
 *   We store the URL in a data attribute and inject it only when needed,
 *   so zero bytes are fetched for video until the right moment.
 *
 * Why data-src-mobile:
 *   Cloudinary lets us serve a smaller 640px-wide variant for phones,
 *   cutting bandwidth by ~60-70% on mobile without any quality loss at that size.
 */
function activateVideo(videoEl) {
  if (!videoEl || videoEl.dataset.loaded) return;

  /* Choose mobile or desktop URL */
  var src = (isMobileViewport() && videoEl.dataset.srcMobile)
    ? videoEl.dataset.srcMobile
    : videoEl.dataset.src;

  if (!src) return;

  videoEl.src = src;
  videoEl.load();
  videoEl.dataset.loaded = 'true';

  var p = videoEl.play();
  if (p !== undefined) {
    p.catch(function () {
      /* Autoplay blocked by browser — poster stays visible, no crash. */
    });
  }
}

/* ══════════════════════════════════════════
   BACKGROUND VIDEO
   Strategy:
   1. Skip entirely on slow connections or reduced-motion.
      → The poster image (already loaded as a CSS bg via the poster attr)
        keeps the background filled perfectly — zero visual gap.
   2. Defer via requestIdleCallback so it never competes with
      first-paint or the intro animation.
   3. Fade in smoothly via CSS transition ONLY after canplaythrough:
      this means the video won't flicker with a half-loaded first frame.
   4. Pause when the browser tab goes hidden (saves CPU/GPU/battery).
   5. On mobile (≤600px) we serve data-src-mobile — a 640px-wide
      Cloudinary URL that's ~70% smaller than the desktop version.
══════════════════════════════════════════ */
function initBgVideo() {
  var bgVideo = document.getElementById('bg-video');
  if (!bgVideo) return;

  /* Skip on reduced-motion or slow connection — poster already shows */
  if (prefersReducedMotion() || isSlowConnection()) return;

  // Allow video on mobile but use lower quality
  if (isSlowConnection()) return;

  function loadBgVideo() {
    activateVideo(bgVideo);

    /* Fade in ONLY after enough data is buffered to play without stalling.
       .bg-video--ready adds opacity:1 via a CSS transition. */
    bgVideo.addEventListener('canplaythrough', function () {
      bgVideo.classList.add('bg-video--ready');
    }, { once: true });
  }

  /* requestIdleCallback yields to the main thread during first paint.
     Fallback: 1.5s setTimeout for browsers without rIC (e.g. Safari < 16). */
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadBgVideo, { timeout: 2000 });
  } else {
    setTimeout(loadBgVideo, 1500);
  }

  /* Page visibility API — pause/resume to save battery & CPU */
  document.addEventListener('visibilitychange', function () {
    if (!bgVideo.dataset.loaded) return;
    if (document.hidden) {
      bgVideo.pause();
    } else {
      bgVideo.play().catch(function () { });
    }
  });
}

/* ══════════════════════════════════════════
   HERO VIDEO
   Strategy:
   1. IntersectionObserver: only fetch & decode when the element
      is ≥25% visible in the viewport — no wasted bytes if the
      user never scrolls to the hero video.
   2. First entry  → activateVideo() fetches and starts playback.
   3. Leaving view → pause() to free the decoding thread.
   4. Re-entering  → resume play() (no re-fetch needed).
   5. Tab hidden   → pause(); resume only if still in viewport.
   6. Fade-in via .visible class triggered by canplay event.
   7. Mobile: uses data-src-mobile for a smaller Cloudinary URL.
   8. Falls back to immediate load + play on browsers without IO.
══════════════════════════════════════════ */
function initHeroVideo() {
  var heroVideo = document.getElementById('hero-video');
  if (!heroVideo) return;

  if (prefersReducedMotion() || isSlowConnection()) return;

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!heroVideo.dataset.loaded) {
            /* First time in viewport — fetch & start */
            activateVideo(heroVideo);
            heroVideo.addEventListener('canplay', function () {
              heroVideo.classList.add('visible');
            }, { once: true });
          } else {
            /* Back in viewport — resume without re-fetching */
            heroVideo.play().catch(function () { });
          }
        } else {
          /* Left viewport — pause to free decoding thread */
          if (heroVideo.dataset.loaded) heroVideo.pause();
        }
      });
    }, {
      threshold: 0.25   /* trigger when 25% of the element is visible */
    });

    io.observe(heroVideo);
  } else {
    /* Legacy fallback — load immediately */
    activateVideo(heroVideo);
    heroVideo.classList.add('visible');
  }

  /* Tab visibility — only resume if the element is still in view */
  document.addEventListener('visibilitychange', function () {
    if (!heroVideo.dataset.loaded) return;
    if (document.hidden) {
      heroVideo.pause();
    } else {
      var r = heroVideo.getBoundingClientRect();
      var inView = r.top < window.innerHeight && r.bottom > 0;
      if (inView) heroVideo.play().catch(function () { });
    }
  });
}

/* ══════════════════════════════════════════
   INTRO + REVEAL
   The intro screen fades out, then JS adds .reveal
   to header / hero-content / hero-metrics so CSS
   transitions (not delayed animations) show them.
   Bulletproof on iOS Safari and all Android browsers.
══════════════════════════════════════════ */

function revealPage() {
  var els = [
    document.getElementById('site-header'),
    document.querySelector('.hero-content'),
    document.querySelector('.hero-metrics')
  ];
  els.forEach(function (el, i) {
    if (!el) return;
    setTimeout(function () { el.classList.add('reveal'); }, i * 100);
  });
  /* Hard safety: force visible after 1.2s regardless */
  setTimeout(function () {
    els.forEach(function (el) {
      if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
    });
  }, 1200);
}

function dismissIntro() {
  var intro = document.getElementById('intro-screen');
  if (!intro || intro.classList.contains('fade-out')) return;
  intro.classList.add('fade-out');
  setTimeout(function () {
    intro.style.display = 'none';
    intro.style.pointerEvents = 'none';
    revealPage();
    initBgVideo();
    initHeroVideo();
  }, 1300);
}

/* Primary: fire 2s after DOM ready */
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(dismissIntro, 2000);
});

/* Safety net: force after 4s from script parse */
setTimeout(function () {
  var intro = document.getElementById('intro-screen');
  if (intro && !intro.classList.contains('fade-out')) {
    dismissIntro();
  } else {
    revealPage();
  }
}, 4000);

/* ══════════════════════════════════════════
   MOBILE MENU
══════════════════════════════════════════ */
function toggleMobileMenu() {
  var btn = document.getElementById('hamburger-btn');
  var nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;

  var isOpen = nav.classList.contains('open');

  if (isOpen) {
    closeMobileMenu();
  } else {
    nav.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden'; /* prevent scroll when menu open */
  }
}

function closeMobileMenu() {
  var btn = document.getElementById('hamburger-btn');
  var nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;

  nav.classList.remove('open');
  btn.classList.remove('open');
  btn.setAttribute('aria-label', 'Open menu');
  document.body.style.overflow = '';
}

/* Close menu when clicking outside */
document.addEventListener('click', function (e) {
  var header = document.getElementById('site-header');
  var nav = document.getElementById('mobile-nav');
  if (!nav || !nav.classList.contains('open')) return;
  if (header && !header.contains(e.target)) {
    closeMobileMenu();
  }
});

/* ══════════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════════ */
function showPage(name, preselect) {
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });

  var target = document.getElementById('page-' + name);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.remove('active');
  });

  if (name === 'home') {
    var first = document.querySelector('.nav-item');
    if (first) first.classList.add('active');
  }

  if (preselect && name === 'order') {
    setTimeout(function () {
      var tile = document.getElementById('svc-' + preselect);
      if (tile) selectSvc(tile, preselect);
    }, 80);
  }
}

function scrollToEl(selector) {
  var el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════
   SERVICE SELECTION
══════════════════════════════════════════ */
function selectSvc(tile, val) {
  document.querySelectorAll('.svc-tile').forEach(function (t) {
    t.classList.remove('sel');
  });
  tile.classList.add('sel');
  document.getElementById('selectedService').value = val;
}

/* ══════════════════════════════════════════
   FORM SUBMISSION
══════════════════════════════════════════ */
function submitOrder() {
  var fields = ['fname', 'phone', 'location', 'acres', 'crop', 'date'];
  var empty = fields.some(function (f) {
    var el = document.getElementById(f);
    return !el || !el.value.trim();
  });
  if (empty) { showAlert('Please complete all required fields.'); return; }

  var acres = parseFloat(document.getElementById('acres').value);
  if (isNaN(acres) || acres < 1) {
    showAlert('Land area must be at least 1 acre.');
    return;
  }

  var phone = document.getElementById('phone').value;
  if (!/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(phone.trim())) {
    showAlert('Please enter a valid phone number.');
    return;
  }

  document.querySelectorAll('.oi-step').forEach(function (s, i) {
    s.classList.remove('active');
    if (i < 2) s.classList.add('done');
  });
  var s3 = document.getElementById('step3-indicator');
  if (s3) s3.classList.add('active');

  var toast = document.getElementById('toast');
  toast.classList.add('show');
  launchConfetti();
  setTimeout(function () { toast.classList.remove('show'); }, 5500);

  console.log('Order submitted:', {
    service: document.getElementById('selectedService').value,
    name: document.getElementById('fname').value,
    phone: phone,
    location: document.getElementById('location').value,
    acres: acres,
    crop: document.getElementById('crop').value,
    date: document.getElementById('date').value,
    notes: document.getElementById('notes').value,
  });
}

/* ══════════════════════════════════════════
   ALERT
══════════════════════════════════════════ */
function showAlert(msg) {
  var a = document.createElement('div');
  a.style.cssText =
    'position:fixed;top:80px;left:50%;' +
    'transform:translateX(-50%) translateY(-70px);' +
    'background:#FFFFFF;color:#3D2020;' +
    'padding:12px 22px;border-radius:100px;' +
    'font-family:"DM Sans",sans-serif;font-size:0.8rem;letter-spacing:0.04em;' +
    'z-index:600;box-shadow:0 8px 32px rgba(0,0,0,0.12);' +
    'border:1px solid rgba(180,60,60,0.18);' +
    'transition:transform 0.3s cubic-bezier(0,0,0.2,1);pointer-events:none;' +
    'max-width:calc(100vw - 48px);text-align:center;';
  a.textContent = '⚠  ' + msg;
  document.body.appendChild(a);
  setTimeout(function () { a.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
  setTimeout(function () {
    a.style.transform = 'translateX(-50%) translateY(-70px)';
    setTimeout(function () { a.remove(); }, 300);
  }, 3400);
}

/* ══════════════════════════════════════════
   CONFETTI
══════════════════════════════════════════ */
function launchConfetti() {
  var cols = ['#9CAF88', '#5C7A52', '#3D5A35', '#B8922A', '#D4AE50', '#E0E8D8'];
  for (var i = 0; i < 55; i++) {
    var c = document.createElement('div');
    var sz = 5 + Math.random() * 7;
    c.style.cssText =
      'position:fixed;width:' + sz + 'px;height:' + sz + 'px;' +
      'background:' + cols[Math.floor(Math.random() * cols.length)] + ';' +
      'left:' + (Math.random() * 100) + '%;top:-15px;z-index:400;' +
      'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px') + ';' +
      'pointer-events:none;opacity:0.85;' +
      'animation:cfall ' + (1.2 + Math.random() * 1.8) + 's linear forwards;';
    document.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 3500);
  }
  if (!document.querySelector('#cfall-kf')) {
    var s = document.createElement('style');
    s.id = 'cfall-kf';
    s.textContent = '@keyframes cfall{0%{transform:translateY(0) rotate(0);opacity:0.85}100%{transform:translateY(100vh) rotate(540deg);opacity:0}}';
    document.head.appendChild(s);
  }
}
