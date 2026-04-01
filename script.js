/* ══════════════════════════════════════════
   SAFSHIKAN — Aerial Agri Solutions
   script.js — Optimised Video Loading
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   VIDEO OPTIMISATION UTILITIES
══════════════════════════════════════════ */

/**
 * Returns true if the user prefers reduced motion.
 * If so we never autoplay — accessibility + battery.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns true if the connection is too slow for streaming video.
 * Saves mobile data on 2G / save-data mode.
 */
function isSlowConnection() {
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  return conn.saveData === true || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g';
}

/**
 * Load a video from its data-src and play it.
 * Guards against double-loading with a data-loaded flag.
 */
function activateVideo(videoEl) {
  if (!videoEl || videoEl.dataset.loaded) return;
  var src = videoEl.dataset.src;
  if (!src) return;

  videoEl.src = src;
  videoEl.load();
  videoEl.dataset.loaded = 'true';

  var p = videoEl.play();
  if (p !== undefined) {
    p.catch(function () { /* autoplay blocked — poster stays visible, no crash */ });
  }
}

/* ══════════════════════════════════════════
   BACKGROUND VIDEO
   • Deferred via requestIdleCallback (or 1.5s fallback)
     so it never competes with first-paint resources.
   • Skipped entirely on slow connections or reduced-motion.
   • Paused when the browser tab is hidden (saves CPU/GPU).
   • Fades in smoothly only after enough data is buffered.
══════════════════════════════════════════ */
function initBgVideo() {
  var bgVideo = document.getElementById('bg-video');
  if (!bgVideo) return;

  if (isSlowConnection() || prefersReducedMotion()) {
    /* Poster image already fills the background — nothing else needed */
    return;
  }

  function loadBgVideo() {
    activateVideo(bgVideo);

    /* Smooth fade-in once the video has enough data to play without stalling */
    bgVideo.addEventListener('canplaythrough', function () {
      bgVideo.classList.add('bg-video--ready');
    }, { once: true });
  }

  /* requestIdleCallback yields to the main thread during first paint */
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadBgVideo, { timeout: 2000 });
  } else {
    setTimeout(loadBgVideo, 1500);
  }

  /* Page visibility — pause/resume to save battery & CPU */
  document.addEventListener('visibilitychange', function () {
    if (!bgVideo.dataset.loaded) return;
    document.hidden ? bgVideo.pause() : bgVideo.play().catch(function () {});
  });
}

/* ══════════════════════════════════════════
   HERO VIDEO
   • IntersectionObserver: only fetch & play when
     the element is 25% visible in the viewport.
   • Paused when scrolled out of view.
   • Resumed when scrolled back in.
   • Paused on hidden tab, resumed only if still in viewport.
   • Fades in via CSS class once canplay fires.
══════════════════════════════════════════ */
function initHeroVideo() {
  var heroVideo = document.getElementById('hero-video');
  if (!heroVideo) return;

  if (isSlowConnection() || prefersReducedMotion()) {
    return;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!heroVideo.dataset.loaded) {
            /* First entry into viewport — fetch and start */
            activateVideo(heroVideo);
            heroVideo.addEventListener('canplay', function () {
              heroVideo.classList.add('visible');
            }, { once: true });
          } else {
            heroVideo.play().catch(function () {});
          }
        } else {
          /* Left viewport — free up decoding thread */
          if (heroVideo.dataset.loaded) heroVideo.pause();
        }
      });
    }, { threshold: 0.25 });

    io.observe(heroVideo);
  } else {
    /* Legacy fallback */
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
      if (r.top < window.innerHeight && r.bottom > 0) {
        heroVideo.play().catch(function () {});
      }
    }
  });
}

/* ══════════════════════════════════════════
   INTRO — show "SAFSHIKAN", then reveal site.
   Video loading is intentionally deferred until
   AFTER the intro dismisses so zero video bytes
   are fetched during the splash screen.
══════════════════════════════════════════ */
setTimeout(function () {
  var intro = document.getElementById('intro-screen');
  if (!intro) return;
  intro.classList.add('fade-out');
  setTimeout(function () {
    intro.style.display = 'none';
    /* Start video loading now that the UI is visible */
    initBgVideo();
    initHeroVideo();
  }, 1200);
}, 2600);

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

function scrollTo(selector) {
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
    'position:fixed;top:88px;left:50%;' +
    'transform:translateX(-50%) translateY(-70px);' +
    'background:#FFFFFF;color:#3D2020;' +
    'padding:12px 26px;border-radius:100px;' +
    'font-family:"DM Sans",sans-serif;font-size:0.8rem;letter-spacing:0.04em;' +
    'z-index:600;box-shadow:0 8px 32px rgba(0,0,0,0.12);' +
    'border:1px solid rgba(180,60,60,0.18);' +
    'transition:transform 0.3s cubic-bezier(0,0,0.2,1);pointer-events:none;';
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
