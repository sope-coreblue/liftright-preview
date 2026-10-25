/* LiftRight site script. No dependencies. Progressive enhancement only. */
(function () {
  'use strict';

  /* ---------- Analytics hook (no-op until a provider is configured) ---------- */
  // Never pass form field contents. Only event names and non-personal properties.
  window.lrTrack = window.lrTrack || function (event, props) {
    if (window.__lrAnalytics && typeof window.__lrAnalytics.track === 'function') window.__lrAnalytics.track(event, props || {});
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]');
    if (a) window.lrTrack(a.getAttribute('data-track'), { page: location.pathname });
  });

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      document.body.classList.toggle('nav-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { toggle.click(); toggle.focus(); }
    });
  }

  /* ---------- Quote form ---------- */
  var form = document.getElementById('quote-form');
  if (!form) return;

  var errorsBox = document.getElementById('form-errors');
  var success = document.getElementById('quote-success');
  var summary = document.getElementById('quote-summary');
  var submitBtn = document.getElementById('quote-submit');
  var aside = document.querySelector('.quote-aside');
  var mode = form.getAttribute('data-mode') || 'demo';
  var endpoint = form.getAttribute('data-endpoint') || '';
  var STORAGE_KEY = 'lr-quote-draft';

  // Carry the selected service (and intent) from the referring page.
  var params = new URLSearchParams(location.search);
  var pre = params.get('equipment');
  if (pre) { var r = form.querySelector('input[name="equipment"][value="' + pre.replace(/"/g, '') + '"]'); if (r) r.checked = true; }
  var preWork = params.get('work');
  if (preWork) { var w = form.querySelector('#f-work'); if (w) { w.value = preWork; } }
  var intent = params.get('intent');
  var intentField = document.getElementById('f-intent');
  if (intent && intentField) intentField.value = intent;
  if (intent === 'fleet') {
    var h1 = document.querySelector('h1');
    if (h1) h1.textContent = 'Discuss your fleet';
    if (submitBtn) submitBtn.textContent = 'Send fleet enquiry';
    var units = document.getElementById('f-units'); if (units && !units.value) units.value = 'Not sure';
  }
  var src = document.getElementById('f-source');
  if (src) src.value = document.referrer ? new URL(document.referrer, location.href).pathname : '';

  // Preserve input across reloads (sessionStorage only, cleared on success).
  try {
    var draft = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (draft) Object.keys(draft).forEach(function (k) {
      var el = form.elements[k];
      if (!el || k === 'website') return;
      if (el.type === 'radio' || (el.length && el[0] && el[0].type === 'radio')) {
        var radio = form.querySelector('input[name="' + k + '"][value="' + String(draft[k]).replace(/"/g, '') + '"]'); if (radio && !pre) radio.checked = true;
      } else if (!el.value) el.value = draft[k];
    });
  } catch (e) { /* storage unavailable */ }
  form.addEventListener('input', function () {
    try {
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== 'website') data[k] = v; });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  });

  function fieldWrap(el) { return el.closest('.field') || el.closest('fieldset'); }
  function setError(el, msg, id) {
    var wrap = fieldWrap(el);
    if (!wrap) return;
    wrap.classList.add('has-error');
    var err = wrap.querySelector('.field-error');
    if (!err) { err = document.createElement('p'); err.className = 'field-error'; err.id = id + '-error'; wrap.appendChild(err); }
    err.textContent = msg;
    if (el.setAttribute) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', err.id); }
  }
  function clearErrors() {
    form.querySelectorAll('.has-error').forEach(function (w) { w.classList.remove('has-error'); });
    form.querySelectorAll('.field-error').forEach(function (e) { e.remove(); });
    form.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
    errorsBox.hidden = true; errorsBox.innerHTML = '';
    var box = aside && aside.querySelector('.form-error-box'); if (box) box.remove();
  }

  function validate() {
    clearErrors();
    var errors = [];
    var name = form.elements.name, email = form.elements.email, phone = form.elements.phone, location_ = form.elements.location;
    var equipment = form.querySelector('input[name="equipment"]:checked');
    if (!name.value.trim()) { setError(name, 'Enter your name so we know who to reply to.', 'f-name'); errors.push({ id: 'f-name', msg: 'Your name is missing' }); }
    var hasEmail = email.value.trim(), hasPhone = phone.value.trim();
    if (!hasEmail && !hasPhone) {
      setError(email, 'Give an email address or a phone number so we can reply.', 'f-email');
      errors.push({ id: 'f-email', msg: 'Add an email address or phone number' });
    } else if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hasEmail)) {
      setError(email, 'That email address does not look right. Check for a missing @ or domain.', 'f-email');
      errors.push({ id: 'f-email', msg: 'Check the email address' });
    }
    if (!equipment) {
      var group = form.querySelector('.choice-grid');
      setError(group, 'Choose the closest equipment category. Pick "Not sure" if you are unsure.', 'equipment');
      errors.push({ id: 'equipment-label', msg: 'Choose an equipment category' });
    }
    if (!location_.value.trim()) { setError(location_, 'Enter the town or postal code of the site so we can confirm coverage and travel.', 'f-location'); errors.push({ id: 'f-location', msg: 'Site town or postal code is missing' }); }
    if (errors.length) {
      errorsBox.hidden = false;
      errorsBox.innerHTML = '<h2>Please check ' + errors.length + ' item' + (errors.length > 1 ? 's' : '') + '</h2><ul>' +
        errors.map(function (e) { return '<li><a href="#' + e.id + '">' + e.msg + '</a></li>'; }).join('') + '</ul>';
      errorsBox.focus && errorsBox.setAttribute('tabindex', '-1'); errorsBox.focus();
      return false;
    }
    return true;
  }

  function payload() {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.submitted_at = new Date().toISOString();
    data.page = location.pathname;
    return data;
  }

  function showSuccess(data, receipt) {
    form.hidden = true;
    if (aside) aside.hidden = true;
    success.hidden = false;
    var eq = form.querySelector('input[name="equipment"]:checked');
    var rows = [
      ['Equipment', eq ? eq.parentNode.querySelector('.choice__box span').textContent : ''],
      ['Site', data.location],
      ['Contact by', data.email && data.phone ? 'email or phone' : data.email ? 'email' : 'phone'],
      data.units ? ['Units', data.units] : null,
      data.work ? ['Work', form.elements.work.options[form.elements.work.selectedIndex].text] : null,
      receipt ? ['Reference', receipt] : null,
    ].filter(Boolean);
    summary.innerHTML = '<h3>What you told us</h3><dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + escapeHtml(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (mode === 'demo' ? '<p class="demo-note"><strong>Demonstration mode.</strong> Nothing was sent. In live mode this enquiry would be routed by equipment category (' + escapeHtml(data.equipment) + ') and work type (' + escapeHtml(data.work || 'unspecified') + ') to the assigned owner and backup.</p>' : '');
    success.focus();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    window.lrTrack('quote_received', { equipment: data.equipment, work: data.work || '', intent: data.intent, mode: mode });
  }

  function showFailure() {
    submitBtn.disabled = false; submitBtn.textContent = submitBtn.getAttribute('data-label');
    var tpl = document.getElementById('error-template');
    if (tpl && aside) { aside.insertBefore(tpl.content.cloneNode(true), aside.firstChild); aside.querySelector('.form-error-box').setAttribute('tabindex', '-1'); aside.querySelector('.form-error-box').focus(); }
    errorsBox.hidden = false; errorsBox.innerHTML = '<p>We could not send your enquiry. Your details are still here. Please try again or use the direct contact details.</p>';
    window.lrTrack('quote_failed', { mode: mode });
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.elements.website && form.elements.website.value) { showSuccess(payload(), null); return; } // honeypot: silently accept
    if (!validate()) return;
    var data = payload();
    submitBtn.setAttribute('data-label', submitBtn.textContent);
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
    if (mode !== 'live' || !endpoint) {
      setTimeout(function () { showSuccess(data, null); }, 500);
      return;
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, 15000);
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data), signal: controller && controller.signal })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json().catch(function () { return {}; });
      })
      .then(function (json) {
        // Success only when the endpoint confirms durable receipt.
        if (!json || !json.receipt) throw new Error('No receipt');
        showSuccess(data, json.receipt);
      })
      .catch(function () { showFailure(); });
  });
})();
