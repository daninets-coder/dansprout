(() => {
  const policyVersion = '2026-10-21';
  const reviewStatus = '<p><strong>Effective date:</strong> 2026-10-21 &nbsp; <strong>Status:</strong> Draft for controlled pilot; qualified privacy, child-data, education, and legal review is required before public advertising or school use.</p>';
  const privacyContent = `
    <h2>Privacy Policy</h2>
    ${reviewStatus}
    <p>Story Sprout is designed for adults to create and manage reading experiences for children. An adult parent, guardian, or authorized educator must create the account and enter learner information.</p>
    <h3>Information we collect</h3>
    <p>We collect the adult account email, display name, account role, learner first name, age range, interests, topics to avoid, generated stories, reading progress, consent records, and subscription status. We do not ask children to create accounts.</p>
    <h3>How we use information</h3>
    <p>We use this information to authenticate adults, create age- and grade-appropriate stories, connect stories to selected reading practice objectives, save reading activity, provide support, process subscriptions, and improve safety and reliability. These connections are instructional aids, not formal educational determinations.</p>
    <h3>AI processing</h3>
    <p>When an adult enables AI story generation, story prompts and the information needed to tailor a story are sent to OpenAI for processing. Do not enter a child's full name, contact information, medical information, or other unnecessary sensitive information.</p>
    <h3>Payments and vendors</h3>
    <p>Stripe processes payment details and subscription billing. Railway hosts the application. PostgreSQL stores application data. OpenAI processes enabled AI story requests. Story Sprout does not store payment card numbers.</p>
    <h3>Retention and deletion</h3>
    <p>We retain account and learner data while the account is active or as needed to provide the service, meet legal obligations, resolve disputes, and maintain security records. An adult can request deletion from Privacy & data settings. Account deletion removes the account, learner profiles, stories, progress, and subscription records from the application database, subject to limited legally required records and provider retention.</p>
    <p>Generated stories are kept as drafts until a parent chooses to save them; unsaved drafts are deleted automatically after 30 days, and deleted stories are removed from our systems and age out of backups within 30 days.</p>
    <h3>Access and export</h3>
    <p>An authenticated adult can request an account data export. Adults are responsible for reviewing exported data and keeping it secure.</p>
    <h3>Children and schools</h3>
    <p>Story Sprout is an adult-managed service. Before use with children under 13 or by a school, the responsible organization must complete its required privacy, parental-consent, procurement, COPPA, FERPA, and state-law reviews. This policy is not a certification of legal compliance.</p>
    <h3>Contact and changes</h3>
    <p>For privacy questions or requests, use the Support form. We may update this policy and will publish the new effective date.</p>`;
  const childrenContent = `
    <h2>Children's Privacy Statement (COPPA)</h2>
    ${reviewStatus}
    <p>Story Sprout is directed to parents, guardians, and educators. Children cannot register themselves. An adult must create the account, verify their email, and agree to our Terms and Privacy Policy before adding a learner profile.</p>
    <h3>What we collect about a child</h3>
    <p>A learner profile holds only a first name or nickname, an age range or reading level, reading interests, topics to avoid, and the child's reading activity. We do not ask for or store a child's email address, phone number, home or school address, photo, or last name.</p>
    <h3>Child sign-in</h3>
    <p>If a parent creates a child username and password, the child can sign in only to read and practice. Parents control and can reset these credentials.</p>
    <h3>No advertising</h3>
    <p>We do not show advertising to children, sell children's information, or use advertising or retargeting trackers inside the signed-in reading and practice areas.</p>
    <h3>Parent rights</h3>
    <p>A parent can review a child's information, export it, or delete the child's profile or the entire account from Privacy & data settings, and can refuse further collection by deleting the profile. Use the Support form with any request.</p>
    <h3>Sharing</h3>
    <p>Information is shared only with providers needed to run the service (hosting, database, email, payments through Stripe, and AI story generation when an adult enables it), as described in the Privacy Policy.</p>`;
  // The Terms of Service is the full Subscriber Agreement, published once at /terms.html (built from legal/SUBSCRIBER_AGREEMENT.md).
  const termsContent = null;

  const openLegal = (title, content) => {
    let modal = document.querySelector('#legalModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'legalModal';
      modal.className = 'privacy-backdrop hidden';
      modal.innerHTML = '<section class="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="legalTitle"><button class="privacy-close" type="button" aria-label="Close legal information">&times;</button><div id="legalBody"></div></section>';
      document.body.appendChild(modal);
      modal.querySelector('.privacy-close').onclick = () => modal.classList.add('hidden');
      modal.onclick = event => { if (event.target === modal) modal.classList.add('hidden'); };
    }
    modal.querySelector('#legalBody').innerHTML = content;
    modal.classList.remove('hidden');
  };

  const openSupportWith = (opts = {}) => {
    let modal = document.querySelector('#legalModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'legalModal';
      modal.className = 'privacy-backdrop hidden';
      modal.innerHTML = '<section class="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="legalTitle"><button class="privacy-close" type="button" aria-label="Close support form">&times;</button><div id="legalBody"></div></section>';
      document.body.appendChild(modal);
      modal.querySelector('.privacy-close').onclick = () => modal.classList.add('hidden');
      modal.onclick = event => { if (event.target === modal) modal.classList.add('hidden'); };
    }
    modal.querySelector('#legalBody').innerHTML = '<h2 id="supportTitle"></h2><p id="supportIntro"></p><form id="supportForm"><label class="en-label" for="supportName">Your name</label><input id="supportName" class="en-input" maxlength="80" required><label class="en-label" for="supportEmail">Email for our reply</label><input id="supportEmail" class="en-input" type="email" maxlength="120" required><label class="en-label" for="supportCategory">What do you need help with?</label><select id="supportCategory" class="en-select"><option value="account">Account</option><option value="billing">Billing</option><option value="privacy">Privacy & data</option><option value="story_safety">Story safety</option><option value="technical">Technical problem</option><option value="other">Other</option></select><label class="en-label" for="supportMessage">Message</label><textarea id="supportMessage" class="en-input" rows="5" maxlength="2000" required></textarea><button class="en-button" type="submit" style="margin-top:14px">Send support request</button><p id="supportStatus" role="status" style="margin-top:12px"></p></form>';
    modal.querySelector('#supportTitle').textContent = opts.title || 'Contact DanSprout Stories support';
    modal.querySelector('#supportIntro').textContent = opts.intro || 'Send a question about your account, billing, privacy, story safety, or technical issues. Do not include passwords, payment-card numbers, or secret keys.';
    if (opts.category) modal.querySelector('#supportCategory').value = opts.category;
    if (opts.message) modal.querySelector('#supportMessage').value = opts.message;
    modal.classList.remove('hidden');
    modal.querySelector('#supportName').focus();
    modal.querySelector('#supportForm').onsubmit = async event => {
      event.preventDefault();
      const status = modal.querySelector('#supportStatus');
      const submit = modal.querySelector('button[type="submit"]');
      submit.disabled = true;
      status.textContent = 'Sending...';
      try {
        const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: modal.querySelector('#supportName').value, email: modal.querySelector('#supportEmail').value, category: modal.querySelector('#supportCategory').value, message: modal.querySelector('#supportMessage').value }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Support request failed.');
        status.textContent = result.message;
        event.target.reset();
      } catch (error) { status.textContent = error.message; } finally { submit.disabled = false; }
    };
  };

  const openSupport = () => openSupportWith({});
  window.openSupportForm = openSupportWith;

  const addLink = (parent, label, content) => {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'legal-link';
    link.textContent = label;
    link.onclick = () => (content ? openLegal(label, content) : window.open('/terms.html', '_blank', 'noopener'));
    parent.appendChild(link);
  };

  const legalPages = { terms: ['Terms of Service', termsContent], privacy: ['Privacy Policy', privacyContent], 'children-privacy': ["Children's Privacy", childrenContent] };
  document.querySelectorAll('a[data-legal]').forEach(anchor => anchor.addEventListener('click', event => { const page = legalPages[anchor.dataset.legal]; if (page && page[1]) { event.preventDefault(); openLegal(page[0], page[1]); } }));
  const hashPage = legalPages[location.hash.slice(1)];
  if (hashPage && hashPage[1]) openLegal(hashPage[0], hashPage[1]);

  const authCard = document.querySelector('.auth-card');
  if (authCard) {
    const links = document.createElement('div');
    links.className = 'legal-links';
    addLink(links, 'Privacy Policy', privacyContent);
    addLink(links, 'Terms of Service', termsContent);
    addLink(links, "Children's Privacy", childrenContent);
    const authSupport = document.createElement('button');
    authSupport.className = 'legal-link';
    authSupport.textContent = 'Support';
    authSupport.type = 'button';
    authSupport.onclick = openSupport;
    links.appendChild(authSupport);
    authCard.appendChild(links);
  }

  const enterpriseHeader = document.querySelector('.en-header');
  if (enterpriseHeader && !enterpriseHeader.querySelector('.legal-link')) {
    const links = document.createElement('div');
    links.className = 'legal-links legal-header-links';
    addLink(links, 'Privacy Policy', privacyContent);
    addLink(links, 'Terms', termsContent);
    addLink(links, "Children's Privacy", childrenContent);
    const support = document.createElement('button');
    support.className = 'legal-link';
    support.textContent = 'Support';
    support.type = 'button';
    support.onclick = openSupport;
    links.appendChild(support);
    enterpriseHeader.appendChild(links);
  }

  const appShell = document.querySelector('.app, .enterprise');
  if (appShell && !appShell.querySelector('.site-footer')) {
    const footerStyle = document.createElement('style');
    footerStyle.textContent = '.site-footer{margin-top:42px;padding:28px clamp(18px,5vw,54px);border-top:1px solid #e6dff2;background:rgba(255,253,249,.92);text-align:center}.site-footer-brand{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap;color:#1f2a46;font:14px Arial,sans-serif}.site-footer-brand strong{font:700 20px Georgia,serif}.site-footer-brand>span:last-child{color:#6b7592;font-size:12px}.site-footer-mark{display:grid;place-items:center;width:25px;height:25px;border-radius:6px;background:#e0533a;color:#fff;font-weight:700}.site-footer-links{display:flex;justify-content:center;gap:13px;flex-wrap:wrap;margin-top:14px}.site-footer-note{margin-top:14px;color:#6b7592;font:12px/1.45 Arial,sans-serif}';
    document.head.appendChild(footerStyle);
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = '<div class="site-footer-brand"><span class="site-footer-mark">✦</span><strong>DanSprout - Stories</strong><span>Personalized reading stories for growing readers.</span></div><div class="site-footer-links"></div><div class="site-footer-note">Parents guide the learning. Children bring the imagination. Printed storybooks are coming later.</div>';
    const footerLinks = footer.querySelector('.site-footer-links');
    addLink(footerLinks, 'Privacy Policy', privacyContent);
    addLink(footerLinks, 'Terms', termsContent);
    addLink(footerLinks, "Children's Privacy", childrenContent);
    const footerSupport = document.createElement('button');
    footerSupport.type = 'button';
    footerSupport.className = 'legal-link';
    footerSupport.textContent = 'Support';
    footerSupport.onclick = openSupport;
    footerLinks.appendChild(footerSupport);
    appShell.appendChild(footer);
  }
})();
