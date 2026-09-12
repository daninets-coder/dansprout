(() => {
  const app = document.querySelector('.app, .enterprise');
  if (!app || document.querySelector('.privacy-trigger')) return;

  const token = localStorage.getItem('storySproutToken');
  const header = app.querySelector('.en-header');
  if (!header) return;

  const trigger = document.createElement('button');
  trigger.className = 'privacy-trigger';
  trigger.type = 'button';
  trigger.textContent = 'Privacy & data';
  header.insertBefore(trigger, header.lastElementChild);

  const modal = document.createElement('div');
  modal.className = 'privacy-backdrop hidden';
  modal.innerHTML = `<section class="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacyTitle">
    <button class="privacy-close" type="button" aria-label="Close privacy and data settings">&times;</button>
    <h2 id="privacyTitle">Privacy & data</h2>
    <p>Story Sprout keeps learner profiles and reading activity private to the adult account that created them. We do not sell learner data or store payment card numbers.</p>
    <h3>Adult consent</h3>
    <p>An adult parent, guardian, or teacher must approve learner profiles during account registration. Only an adult should enter a child's information.</p>
    <h3>What we store</h3>
    <p>We store the account email and name, learner profile details, saved stories, progress, and subscription status needed to provide the service. Payment details belong to the payment provider and are never sent to Story Sprout.</p>
    <h3>Retention and deletion</h3>
    <p>We retain account and learner data while the account is active or as needed to provide the service, meet legal obligations, resolve disputes, and maintain security records. Account deletion removes the account, learner profiles, stories, progress, and subscription records from the application database after the adult confirms the request through a one-time email link, subject to limited legally required records and provider retention.</p>
    <h3>Data export</h3>
    <p>Adults can request an export of account, learner, story, consent, and reminder data from the authenticated account. Keep exported data secure because it may contain learner information.</p>
    <h3>Vendors and disclosures</h3>
    <p>Stripe handles payment details and subscription billing. OpenAI processes enabled AI story requests. Railway hosts the application. PostgreSQL stores application data. Story Sprout does not store payment card numbers.</p>
    <h3>After cancellation</h3>
    <p>Cancellation stops future renewal but does not delete learner data. Your learner profiles, stories, and progress remain saved. An adult can delete the account at any time; deletion removes the account, learners, stories, and subscription records from the application database.</p>
    <p><button type="button" class="privacy-action secondary" data-privacy-action="billing">Manage subscription and billing</button></p>
    <div class="privacy-actions">
      <button class="privacy-action secondary" data-privacy-action="export" type="button">Download my data</button>
      <button class="privacy-action secondary" data-privacy-action="cancel" type="button">Cancel subscription</button>
      <button class="privacy-action danger" data-privacy-action="delete" type="button">Delete account and learner data</button>
    </div>
    <div class="privacy-status" role="status" aria-live="polite"></div>
    <div class="privacy-delete-panel hidden" aria-labelledby="privacyDeleteTitle">
      <h3 id="privacyDeleteTitle">Confirm account deletion</h3>
      <p>This permanently deletes your account, learner profiles, stories, progress, and subscription records. This cannot be undone.</p>
      <label for="privacyDeletePassword">Current password</label>
      <input id="privacyDeletePassword" type="password" autocomplete="current-password">
      <label for="privacyDeleteConfirm">Type DELETE to continue</label>
      <input id="privacyDeleteConfirm" type="text" autocomplete="off">
      <div class="privacy-delete-actions"><button class="privacy-action secondary" data-privacy-delete-cancel type="button">Cancel</button><button class="privacy-action danger" data-privacy-delete-submit type="button">Send confirmation email</button></div>
    </div>
  </section>`;
  document.body.appendChild(modal);
  const deleteStyle = document.createElement('style');
  deleteStyle.textContent = '.privacy-delete-panel{margin-top:18px;padding:16px;border:1px solid #dfb9a8;border-radius:8px;background:#fff7f2}.privacy-delete-panel h3{margin:0 0 7px;color:#8f352b}.privacy-delete-panel p{margin:0 0 14px;line-height:1.45}.privacy-delete-panel label{display:block;margin:10px 0 5px;font-weight:700}.privacy-delete-panel input{width:100%;padding:10px;border:1px solid #cdbeb2;border-radius:5px;font:14px Arial,sans-serif}.privacy-delete-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}';
  document.head.appendChild(deleteStyle);

  const close = () => modal.classList.add('hidden');
  const status = text => { modal.querySelector('.privacy-status').textContent = text; };
  const api = async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || 'Request failed.');
    return data;
  };

  trigger.onclick = () => { status(''); modal.classList.remove('hidden'); };
  modal.querySelector('.privacy-close').onclick = close;
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.querySelector('[data-privacy-action="cancel"]').onclick = async () => {
    close();
    document.querySelector('[data-api-view="billing"]')?.click();
  };
  modal.querySelector('[data-privacy-action="billing"]').onclick = () => {
    close();
    document.querySelector('[data-api-view="billing"]')?.click();
  };
  modal.querySelector('[data-privacy-action="export"]').onclick = async () => {
    if (!token) { status('Sign in to download account data.'); return; }
    try {
      const response = await fetch('/api/account/export', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Export failed.');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'story-sprout-account-export.json';
      link.click();
      URL.revokeObjectURL(link.href);
      status('Your account export is ready.');
    } catch (error) { status(error.message); }
  };
  modal.querySelector('[data-privacy-action="delete"]').onclick = async () => {
    modal.querySelector('.privacy-delete-panel').classList.remove('hidden');
    modal.querySelector('#privacyDeletePassword').focus();
  };
  modal.querySelector('[data-privacy-delete-cancel]').onclick = () => modal.querySelector('.privacy-delete-panel').classList.add('hidden');
  modal.querySelector('[data-privacy-delete-submit]').onclick = async () => {
    const currentPassword = modal.querySelector('#privacyDeletePassword').value;
    const confirmText = modal.querySelector('#privacyDeleteConfirm').value;
    if (!currentPassword) { status('Enter your current password to continue.'); return; }
    if (confirmText !== 'DELETE') { status('Type DELETE exactly to confirm.'); return; }
    try {
      if (token) await api('/api/account/deletion-request', { method: 'POST', body: JSON.stringify({ currentPassword, confirmText }) });
      status('Check your email. The account will be deleted only after you open the confirmation link. The link expires in 30 minutes.');
    } catch (error) { status(error.message); }
  };
})();