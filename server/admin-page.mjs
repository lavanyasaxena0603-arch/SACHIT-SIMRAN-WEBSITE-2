/**
 * THE RSVP ADMIN VIEW — served as one self-contained HTML document.
 *
 * Deliberately NOT part of the React bundle:
 *   • The invitation guest never downloads a byte of this.
 *   • It is reachable only at /admin, behind a password and a signed cookie.
 *   • Server-side data endpoints all require that cookie; the page itself
 *     contains no guest data until an authenticated fetch succeeds.
 *
 * Every value from the database is inserted with `textContent` or through
 * `esc()`, never by string-concatenating into innerHTML. React is not here to
 * escape for us, so this file does it explicitly.
 */

export const adminHtml = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>RSVP Register — Simran &amp; Sachit</title>
<style>
  :root{
    --navy:#040711; --navy2:#090e1c; --panel:#0c1220; --gold:#d4af37; --gold-lt:#f3e5ab;
    --ink:#f7f2e7; --muted:#9a917f; --ok:#4f9d69; --warn:#c9922f; --bad:#a8483c;
  }
  *{box-sizing:border-box}
  body{margin:0;background:
      radial-gradient(90% 60% at 50% 0%,#101a30 0%,#070b16 55%,#040711 100%);
    color:var(--ink);font:15px/1.5 'Cinzel','Georgia',serif;min-height:100vh}
  a{color:var(--gold-lt)}
  .wrap{max-width:1240px;margin:0 auto;padding:28px 18px 64px}
  h1{font-size:20px;letter-spacing:.22em;text-transform:uppercase;margin:0 0 4px;color:var(--gold-lt)}
  .sub{color:var(--muted);font:12px/1.5 'Montserrat',sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .brand{display:flex;align-items:center;gap:14px;margin-bottom:22px}
  .mark{width:38px;height:38px;border:1px solid rgba(212,175,55,.55);border-radius:50%;
    display:grid;place-items:center;color:var(--gold);font-size:16px;flex:none}
  .card{background:rgba(12,18,32,.82);border:1px solid rgba(212,175,55,.22);border-radius:14px;
    padding:18px;box-shadow:0 18px 46px rgba(0,0,0,.45)}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;margin-bottom:18px}
  .stat{background:rgba(9,14,28,.85);border:1px solid rgba(212,175,55,.18);border-radius:12px;padding:14px}
  .stat .k{font:10px/1.4 'Montserrat',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
  .stat .v{font-size:26px;color:#fff6dd;margin-top:6px;font-variant-numeric:tabular-nums}
  .tools{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}
  input[type=search]{flex:1 1 220px;min-width:0;background:#080d19;border:1px solid rgba(212,175,55,.3);
    color:var(--ink);border-radius:999px;padding:11px 16px;font:14px 'Montserrat',sans-serif;outline:none}
  input[type=search]:focus{border-color:var(--gold)}
  button,.btn{background:linear-gradient(180deg,#0d1526,#070d18);border:1px solid rgba(212,175,55,.45);
    color:var(--gold-lt);border-radius:999px;padding:11px 18px;font:11px 'Montserrat',sans-serif;
    letter-spacing:.18em;text-transform:uppercase;cursor:pointer;text-decoration:none;
    display:inline-flex;align-items:center;justify-content:center;min-height:42px;transition:.2s}
  button:hover,.btn:hover{border-color:var(--gold-lt);box-shadow:0 0 20px rgba(212,175,55,.28)}
  button:disabled{opacity:.5;cursor:not-allowed}
  .seg{display:inline-flex;border:1px solid rgba(212,175,55,.3);border-radius:999px;overflow:hidden}
  .seg button{border:0;border-radius:0;background:transparent;padding:11px 16px}
  .seg button[aria-pressed=true]{background:rgba(212,175,55,.18);color:#fff6dd}
  table{width:100%;border-collapse:collapse;font:13px/1.5 'Montserrat',sans-serif}
  th,td{text-align:left;padding:10px 10px;border-bottom:1px solid rgba(212,175,55,.12);vertical-align:top}
  th{font:10px/1.4 'Montserrat',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
    position:sticky;top:0;background:#0b1120;z-index:1}
  tbody tr:hover{background:rgba(212,175,55,.05)}
  .pill{display:inline-block;padding:3px 9px;border-radius:999px;font-size:10px;letter-spacing:.12em;
    text-transform:uppercase;white-space:nowrap}
  .pill.accepts{background:rgba(79,157,105,.16);color:#8fd6a6;border:1px solid rgba(79,157,105,.4)}
  .pill.declines{background:rgba(168,72,60,.16);color:#e2a096;border:1px solid rgba(168,72,60,.4)}
  .pill.sent{background:rgba(79,157,105,.14);color:#8fd6a6;border:1px solid rgba(79,157,105,.35)}
  .pill.pending{background:rgba(201,146,47,.16);color:#e8c48a;border:1px solid rgba(201,146,47,.4)}
  .pill.failed{background:rgba(168,72,60,.16);color:#e2a096;border:1px solid rgba(168,72,60,.42)}
  .pill.skipped{background:rgba(154,145,127,.16);color:#c3bcae;border:1px solid rgba(154,145,127,.35)}
  .mono{font-variant-numeric:tabular-nums;white-space:nowrap}
  .name{color:#fff6dd}
  .small{font-size:11px;color:var(--muted)}
  .scroll{overflow:auto;max-height:64vh;border:1px solid rgba(212,175,55,.14);border-radius:10px}
  .empty{padding:34px;text-align:center;color:var(--muted);font-style:italic}
  .toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#0d1526;
    border:1px solid rgba(212,175,55,.5);color:#fff6dd;padding:12px 20px;border-radius:999px;
    font:11px 'Montserrat',sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:0;
    pointer-events:none;transition:.3s;z-index:50}
  .toast.on{opacity:1}
  /* login */
  .gate{max-width:380px;margin:14vh auto 0}
  .gate input{width:100%;background:#080d19;border:1px solid rgba(212,175,55,.32);color:var(--ink);
    border-radius:8px;padding:13px 15px;font:15px 'Montserrat',sans-serif;outline:none;margin:14px 0}
  .gate input:focus{border-color:var(--gold)}
  .gate button{width:100%}
  .err{color:#e2a096;font:12px 'Montserrat',sans-serif;min-height:18px;margin-bottom:6px}
  .banner{border:1px solid rgba(201,146,47,.42);background:rgba(201,146,47,.1);color:#f0d9a8;
    font:12px/1.6 'Montserrat',sans-serif;padding:12px 15px;border-radius:10px;margin-bottom:16px}
  @media(max-width:760px){ .scroll{max-height:none} th{position:static} }
</style>
</head>
<body>
<div class="wrap" id="app"><div class="empty">Loading…</div></div>
<div class="toast" id="toast"></div>
<script>
(function(){
  "use strict";
  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var state = { search:'', status:'all', rows:[], stats:null, wa:null };

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function el(tag, cls, text){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ toastEl.classList.remove('on'); }, 2600);
  }

  function api(path, opts){
    opts = opts || {};
    opts.headers = Object.assign({ 'Accept':'application/json' }, opts.headers || {});
    opts.credentials = 'same-origin';
    return fetch(path, opts).then(function(r){
      if (r.status === 401) { renderLogin(); throw new Error('unauthorised'); }
      return r.json().then(function(j){
        if (!r.ok) throw new Error(j && j.error ? j.error : ('HTTP ' + r.status));
        return j;
      });
    });
  }

  /* ------------------------------- LOGIN ------------------------------- */
  function renderLogin(msg){
    app.innerHTML = '';
    var gate = el('div','card gate');
    var brand = el('div','brand');
    brand.appendChild(el('div','mark','\u265B'));
    var t = el('div');
    t.appendChild(el('h1', null, 'RSVP Register'));
    t.appendChild(el('div','sub','Private — owner only'));
    brand.appendChild(t);
    gate.appendChild(brand);

    var err = el('div','err', msg || '');
    var input = document.createElement('input');
    input.type = 'password'; input.placeholder = 'Admin password';
    input.autocomplete = 'current-password';
    var btn = el('button', null, 'Unlock');
    var form = document.createElement('form');
    form.appendChild(input); form.appendChild(err); form.appendChild(btn);

    form.addEventListener('submit', function(e){
      e.preventDefault();
      btn.disabled = true; err.textContent = '';
      fetch('/api/admin/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body: JSON.stringify({ password: input.value })
      }).then(function(r){
        return r.json().then(function(j){ return { ok:r.ok, j:j }; });
      }).then(function(res){
        if (!res.ok) { err.textContent = res.j.error || 'Login failed'; btn.disabled = false; return; }
        load();
      }).catch(function(){ err.textContent = 'Network error.'; btn.disabled = false; });
    });

    gate.appendChild(form);
    app.appendChild(gate);
    setTimeout(function(){ input.focus(); }, 60);
  }

  /* ------------------------------ DASHBOARD ---------------------------- */
  function statCard(k, v){
    var c = el('div','stat');
    c.appendChild(el('div','k', k));
    c.appendChild(el('div','v', String(v)));
    return c;
  }

  function render(){
    app.innerHTML = '';

    var brand = el('div','brand');
    brand.appendChild(el('div','mark','\u265B'));
    var t = el('div');
    t.appendChild(el('h1', null, 'RSVP Register'));
    t.appendChild(el('div','sub','Simran & Sachit \u2014 private responses'));
    brand.appendChild(t);
    app.appendChild(brand);

    if (state.wa && state.wa.configured === false){
      var b = el('div','banner');
      b.textContent = 'WhatsApp is not configured yet (' + (state.wa.missing||[]).join(', ') +
        '). Every response below is saved safely; notifications are queued as "pending" and will send automatically once the credentials are set.';
      app.appendChild(b);
    }

    var s = state.stats || {};
    var grid = el('div','stats');
    [
      ['Responses', s.responses||0], ['Accepts', s.accepts||0], ['Declines', s.declines||0],
      ['Confirmed guests', s.confirmedGuests||0], ['Accompanying', s.accompanying||0],
      ['Engagement', s.engagementGuests||0], ['Wedding', s.weddingGuests||0],
      ['Notified', s.notified||0], ['Pending', s.pending||0], ['Failed', s.failed||0]
    ].forEach(function(p){ grid.appendChild(statCard(p[0], p[1])); });
    app.appendChild(grid);

    var tools = el('div','tools');

    var search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search name, mobile, email or RSVP ID…';
    search.value = state.search;
    var tmr;
    search.addEventListener('input', function(){
      clearTimeout(tmr);
      tmr = setTimeout(function(){ state.search = search.value.trim(); load(); }, 260);
    });

    var seg = el('div','seg');
    [['all','All'],['accepts','Accepts'],['declines','Declines']].forEach(function(p){
      var btn = el('button', null, p[1]);
      btn.setAttribute('aria-pressed', String(state.status === p[0]));
      btn.addEventListener('click', function(){ state.status = p[0]; load(); });
      seg.appendChild(btn);
    });

    var csv = el('a','btn','Export CSV');
    csv.href = '/api/admin/export.csv?status=' + encodeURIComponent(state.status) +
               '&search=' + encodeURIComponent(state.search);

    var retry = el('button', null, 'Retry pending');
    retry.addEventListener('click', function(){
      retry.disabled = true;
      api('/api/admin/retry', { method:'POST' })
        .then(function(j){ toast('Retried — ' + (j.sent||0) + ' sent'); load(); })
        .catch(function(){ toast('Retry failed'); retry.disabled = false; });
    });

    var out = el('button', null, 'Sign out');
    out.addEventListener('click', function(){
      api('/api/admin/logout', { method:'POST' }).then(renderLogin).catch(renderLogin);
    });

    tools.appendChild(search); tools.appendChild(seg); tools.appendChild(csv);
    tools.appendChild(retry); tools.appendChild(out);
    app.appendChild(tools);

    /* table */
    var card = el('div','card');
    var scroll = el('div','scroll');

    if (!state.rows.length){
      scroll.appendChild(el('div','empty','No responses yet.'));
    } else {
      var table = document.createElement('table');
      var thead = document.createElement('thead');
      var hr = document.createElement('tr');
      ['Received','Guest','Attendance','Guests','Events','Meal','Requests','WhatsApp','RSVP ID']
        .forEach(function(h){ hr.appendChild(el('th', null, h)); });
      thead.appendChild(hr);
      table.appendChild(thead);

      var tb = document.createElement('tbody');
      state.rows.forEach(function(r){
        var tr = document.createElement('tr');

        var td0 = el('td','mono');
        td0.appendChild(el('div', null, r.submitted_at_ist || ''));
        tr.appendChild(td0);

        var td1 = el('td');
        td1.appendChild(el('div','name', r.guest_name));
        td1.appendChild(el('div','small mono', r.phone_number));
        if (r.email) td1.appendChild(el('div','small', r.email));
        tr.appendChild(td1);

        var td2 = el('td');
        td2.appendChild(el('span','pill ' + (r.attendance_status === 'accepts' ? 'accepts' : 'declines'),
          r.attendance_status === 'accepts' ? 'Accepts' : 'Declines'));
        tr.appendChild(td2);

        tr.appendChild(el('td','mono', String(r.guest_count)));
        tr.appendChild(el('td','small', r.event_labels || '—'));

        var meal = r.meal_preference || '';
        meal = meal === 'non-vegetarian' ? 'Non-Vegetarian'
             : meal === 'vegetarian' ? 'Vegetarian'
             : meal === 'jain' ? 'Jain'
             : meal === 'vegan' ? 'Vegan'
             : meal === 'no-preference' ? 'No preference' : '—';
        tr.appendChild(el('td','small', meal));

        var td6 = el('td','small', r.special_requests || '—');
        td6.style.maxWidth = '220px';
        tr.appendChild(td6);

        var td7 = el('td');
        var pill = el('span','pill ' + (r.notification_status || 'pending'), r.notification_status || 'pending');
        pill.title = r.notification_error || '';
        td7.appendChild(pill);
        if (r.notification_status !== 'sent'){
          var rb = el('button', null, 'Send');
          rb.style.marginLeft = '6px';
          rb.style.padding = '4px 10px';
          rb.style.minHeight = '28px';
          rb.style.fontSize = '9px';
          rb.addEventListener('click', function(){
            rb.disabled = true;
            api('/api/admin/retry?id=' + encodeURIComponent(r.id), { method:'POST' })
              .then(function(j){ toast(j.ok ? 'Sent' : 'Still failing — see status'); load(); })
              .catch(function(){ toast('Retry failed'); rb.disabled = false; });
          });
          td7.appendChild(rb);
        }
        tr.appendChild(td7);

        tr.appendChild(el('td','mono small', r.id));
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      scroll.appendChild(table);
    }
    card.appendChild(scroll);
    app.appendChild(card);
  }

  /* ------------------------------- LOAD -------------------------------- */
  function load(){
    Promise.all([
      api('/api/admin/rsvps?status=' + encodeURIComponent(state.status) +
          '&search=' + encodeURIComponent(state.search)),
      api('/api/admin/stats')
    ]).then(function(res){
      state.rows = res[0].rows || [];
      state.stats = res[1].stats || {};
      state.wa = res[1].whatsapp || null;
      render();
    }).catch(function(err){
      if (err && err.message === 'unauthorised') return;
      app.innerHTML = '';
      var b = el('div','card');
      b.appendChild(el('div','err','Could not load the register: ' + (err && err.message)));
      app.appendChild(b);
    });
  }

  api('/api/admin/stats').then(function(){ load(); }).catch(function(){ /* login rendered */ });
})();
</script>
</body>
</html>`;
