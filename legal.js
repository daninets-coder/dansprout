(() => {
  const policyVersion = '2026-09-09';
  const privacyContent = `
    <h2>Privacy Policy</h2>
    <p><strong>Last updated:</strong> ${policyVersion}</p>
    <p>Story Sprout is designed for adults to create and manage reading experiences for children. An adult parent, guardian, or authorized educator must create the account and enter learner information.</p>
    <h3>Information we collect</h3>
    <p>We collect the adult account email, display name, account role, learner first name, age range, interests, topics to avoid, generated stories, reading progress, consent records, and subscription status. We do not ask children to create accounts.</p>
    <h3>How we use information</h3>
    <p>We use this information to authenticate adults, create age- and grade-appropriate stories, align stories to selected U.S. reading standards, save reading activity, provide support, process subscriptions, and improve safety and reliability.</p>
    <h3>AI processing</h3>
    <p>When an adult enables AI story generation, story prompts and the information needed to tailor a story are sent to OpenAI for processing. Do not enter a child's full name, contact information, medical information, or other unnecessary sensitive information.</p>
    <h3>Payments and vendors</h3>
    <p>Stripe processes payment details and subscription billing. Railway hosts the application. PostgreSQL stores application data. OpenAI processes enabled AI story requests. Story Sprout does not store payment card numbers.</p>
    <h3>Retention and deletion</h3>
    <p>We retain account and learner data while the account is active or as needed to provide the service, meet legal obligations, resolve disputes, and maintain security records. An adult can request deletion from Privacy & data settings. Account deletion removes the account, learner profiles, stories, progress, and subscription records from the application database, subject to limited legally required records and provider retention.</p>
    <h3>Access and export</h3>
    <p>An authenticated adult can request an account data export. Adults are responsible for reviewing exported data and keeping it secure.</p>
    <h3>Children and schools</h3>
    <p>Story Sprout is an adult-managed service. Before use with children under 13 or by a school, the responsible organization must complete its required privacy, parental-consent, procurement, COPPA, FERPA, and state-law reviews. This policy is not a certification of legal compliance.</p>
    <h3>Contact and changes</h3>
    <p>For privacy questions or requests, contact the service owner through the support channel provided with your account. We may update this policy and will publish the new effective date.</p>`;
  const termsContent = `
    <h2>Terms of Service</h2>
    <p><strong>Last updated:</strong> ${policyVersion}</p>
    <p>Story Sprout provides adult-managed reading tools, curriculum-aligned story generation, saved stories, progress features, and optional subscription services.</p>
    <h3>Adult responsibility</h3>
    <p>You must be an adult or authorized educator to create an account. You are responsible for the learner information you enter, reviewing generated content before use, and supervising children's use of the service.</p>
    <h3>AI-generated content</h3>
    <p>AI stories are educational support materials, not professional educational, medical, psychological, or legal advice. Review stories for suitability and accuracy. Curriculum alignment is an instructional aid and does not replace a school or educator's curriculum review.</p>
    <h3>Acceptable use</h3>
    <p>Do not use the service to submit unlawful, hateful, sexual, dangerous, or otherwise inappropriate content; attempt to access another account; bypass safety controls; or use the service to make high-stakes decisions about a child.</p>
    <h3>Subscriptions</h3>
    <p>Paid plans renew according to the checkout terms shown by Stripe. Cancellation stops future renewal according to the applicable billing provider rules. Refunds and billing disputes are handled under the published billing policy and provider terms.</p>
    <h3>Account termination</h3>
    <p>We may restrict or terminate access when necessary to protect users, prevent abuse, enforce these terms, or maintain service security. You may delete your account using Privacy & data settings.</p>
    <h3>Changes and availability</h3>
    <p>Features, curriculum data, pricing, and availability may change. We will take reasonable steps to protect data and communicate material changes through the service.</p>
    <h3>Legal review</h3>
    <p>These terms are a product draft and should be reviewed by qualified counsel before public launch, especially for child privacy, school use, subscriptions, and the jurisdictions where the service operates.</p>`;

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

  const addLink = (parent, label, content) => {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'legal-link';
    link.textContent = label;
    link.onclick = () => openLegal(label, content);
    parent.appendChild(link);
  };

  const authCard = document.querySelector('.auth-card');
  if (authCard) {
    const links = document.createElement('div');
    links.className = 'legal-links';
    addLink(links, 'Privacy Policy', privacyContent);
    addLink(links, 'Terms of Service', termsContent);
    authCard.appendChild(links);
  }

  const enterpriseHeader = document.querySelector('.en-header');
  if (enterpriseHeader && !enterpriseHeader.querySelector('.legal-link')) {
    const links = document.createElement('div');
    links.className = 'legal-links legal-header-links';
    addLink(links, 'Privacy Policy', privacyContent);
    addLink(links, 'Terms', termsContent);
    enterpriseHeader.appendChild(links);
  }
})();
