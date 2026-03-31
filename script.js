/* ══════════════════════════════════════════
   SAFSHIKAN — Aerial Agri Solutions
   script.js — Professional Redesign
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   INTRO — show "SAFSHIKAN" text, then reveal site
══════════════════════════════════════════ */
setTimeout(function () {
  var intro = document.getElementById('intro-screen');
  if (!intro) return;
  intro.classList.add('fade-out');
  setTimeout(function () {
    intro.style.display = 'none';
  }, 1200);
}, 2600);

/* ══════════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════════ */
function showPage(name, preselect) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });
  // Show target
  var target = document.getElementById('page-' + name);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.remove('active');
  });
  if (name === 'home') {
    document.querySelector('.nav-item') && document.querySelector('.nav-item').classList.add('active');
  }
  // Pre-select service if provided
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

  // Mark step 3 active
  document.querySelectorAll('.oi-step').forEach(function (s, i) {
    s.classList.remove('active');
    if (i < 2) s.classList.add('done');
  });
  var s3 = document.getElementById('step3-indicator');
  if (s3) s3.classList.add('active');

  // Toast
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
  setTimeout(function () {
    a.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);
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
