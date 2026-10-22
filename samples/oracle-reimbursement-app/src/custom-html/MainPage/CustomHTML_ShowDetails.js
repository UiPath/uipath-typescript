/* =====================================================================
   Reimbursement · MainPage · "Show details" strip — JavaScript tab
   Clicking the strip sets Boolean_MainCollapsed = False, which shows Container_Main again.
   It reads String_MainDraftJson (written by the main control) to show "Unsaved" and the
   discrepancy count while the details are hidden.
   ===================================================================== */
(function () {
  'use strict';
  const VAR_COLLAPSED = 'Boolean_MainCollapsed';
  const VAR_DRAFT = 'String_MainDraftJson';
  const $ = s => document.querySelector(s);
  const tick = '<svg class="i" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';

  function show(raw) {
    let d = null;
    try { d = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null; } catch (e) { d = null; }
    $('#ex-dirty').hidden = !(d && d.dirty);
    const disc = $('#ex-disc');
    if (d && typeof d.discrepancies === 'number') {
      const k = d.discrepancies;
      disc.hidden = false;
      disc.className = 'ex-flag ' + (k ? 'ex-flag--bad' : 'ex-flag--ok');
      disc.innerHTML = k ? `<b>${k}</b><span>${k === 1 ? 'Discrepancy' : 'Discrepancies'}</span>` : `<b>${tick}</b><span>No discrepancies</span>`;
      disc.title = k ? `${k} ${k === 1 ? 'category does' : 'categories do'} not match RPPA` : 'All categories match RPPA';
    } else disc.hidden = true;
  }

  const btn = $('#ex-root');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    Promise.resolve()
      .then(() => App.setVariable(VAR_COLLAPSED, false))
      .catch(() => {})
      .then(() => { btn.disabled = false; });
  });

  App.onVariableChange(VAR_DRAFT, show);
  Promise.resolve().then(() => App.getVariable(VAR_DRAFT)).then(show).catch(() => {});
})();
