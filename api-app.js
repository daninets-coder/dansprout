(() => {
  const appRoot = document.querySelector('.app');
  if (!appRoot) return;
  const token = localStorage.getItem('storySproutToken');
  if (!token) return;

  const api = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (response.status === 401) {
      localStorage.removeItem('storySproutToken');
      localStorage.removeItem('storySproutAccount');
      location.reload();
      throw new Error('Session expired.');
    }
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const app = document.querySelector('.app');
  const account = JSON.parse(localStorage.getItem('storySproutAccount') || '{}');
  const $ = selector => document.querySelector(selector);
  const esc = value => {
    const n = document.createElement('div');
    n.textContent = String(value ?? '');
    return n.innerHTML;
  };
  const formatStoryDate = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const notify = text => {
    const toast = $('#apiToast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  };

  const asset = relativePath => encodeURI(relativePath);
  const gradeBadgeMap = {
    PreK: asset('images/buttons/Prek.jpg'),
    K: asset('images/buttons/Kindergarten.jpg'),
    '1': asset('images/buttons/1st Grade.jpg'),
    '2': asset('images/buttons/2nd Grade.jpg'),
    '3': asset('images/buttons/3rd Grade.jpg'),
    '4': asset('images/buttons/4th Grade.jpg'),
    '5': asset('images/buttons/5th Grade.jpg'),
    '6': asset('images/buttons/6th Grade.jpg'),
    '7': asset('images/buttons/7th Grade.jpg'),
    '8': asset('images/buttons/8th Grade.jpg'),
  };
  const themeBannerMap = {
    Moonlight: asset('images/banner/banner01.jpg'),
    Rainforest: asset('images/banner/shelby-murphy-figueroa-gGbS4kHj4Ho-unsplash.jpg'),
    Ocean: asset('images/banner/reno-laithienne-odHhPgEgkWM-unsplash.jpg'),
    Castle: asset('images/banner/bull start.png'),
    Garden: asset('images/banner/annie-spratt-faAef6F6luc-unsplash.jpg'),
    Sky: asset('images/banner/mana5280-lblkLbfWa-I-unsplash.jpg'),
    Space: asset('images/banner/banner01.jpg'),
    Dinosaurs: asset('images/banner/bull start.png'),
    Arctic: asset('images/banner/reno-laithienne-odHhPgEgkWM-unsplash.jpg'),
    Farm: asset('images/banner/annie-spratt-faAef6F6luc-unsplash.jpg'),
    City: asset('images/banner/Designer.jpeg'),
    Jungle: asset('images/banner/shelby-murphy-figueroa-gGbS4kHj4Ho-unsplash.jpg'),
    Desert: asset('images/banner/mana5280-lblkLbfWa-I-unsplash.jpg'),
    Underwater: asset('images/banner/reno-laithienne-odHhPgEgkWM-unsplash.jpg'),
    Fairytale: asset('images/banner/bull start.png'),
  };
  const themeOptions = [
    ['Moonlight', '🌙'], ['Rainforest', '🌿'], ['Ocean', '🌊'], ['Castle', '🏰'], ['Garden', '🌷'],
    ['Sky', '☁️'], ['Space', '🚀'], ['Dinosaurs', '🦕'], ['Arctic', '❄️'], ['Farm', '🐄'],
    ['City', '🏙️'], ['Jungle', '🐒'], ['Desert', '🏜️'], ['Underwater', '🐠'], ['Fairytale', '🧚'],
  ];
  const domainIconMap = {
    comprehension: asset('images/Random2/book.png'),
    vocabulary: asset('images/Random2/alphabet-a.png'),
    fluency: asset('images/Random2/star.png'),
    phonics: asset('images/Random2/alphabet-c.png'),
    oral_language: asset('images/Random2/thought.png'),
    writing_response: asset('images/Random2/rectangle.png'),
    social_emotional_reading: asset('images/Random2/heart.png'),
  };

  let learners = [];
  let stories = [];
  let me = null;

  app.className = 'enterprise';
  app.innerHTML = `
    <header class="en-header">
      <button class="en-brand" id="apiHome"><span class="en-mark"></span>Story Sprout</button>
      <nav class="en-nav">
        <button data-api-view="home" class="active">Home</button>
        <button data-api-view="learners">Learners</button>
        <button data-api-view="billing">Plans & billing</button>
      </nav>
      <div style="display:flex;gap:8px">
        <button class="en-family" id="apiClearCache" title="Clear cache">Clear cache</button>
        <button class="en-family" id="apiLogout">Sign out</button>
      </div>
    </header>
    <main class="en-main">
      <section id="apiHomeView">
        <div class="en-eyebrow">SECURE FAMILY WORKSPACE</div>
        <h1 class="en-title">Welcome, ${esc(account.displayName || 'Reader')}.</h1>
        <p class="en-lede">Your learners and subscription are stored in your protected Story Sprout account.</p>

        <section class="en-card" style="margin-bottom:20px">
          <h2>First-run success path</h2>
          <div id="apiOnboarding"></div>
        </section>

        <div class="en-grid">
          <section class="en-card">
            <h2>Create a learning story</h2>
            <p>Choose a learner, select a reading skill, and generate a story aligned to a reading objective.</p>
            <label class="en-label">Learner</label>
            <select id="apiLearner" class="en-select"></select>
            <div style="width:100%">
              <label class="en-label">Grade level</label>
              <select id="apiGradeLevel" class="en-select" aria-label="Grade level"><option value="PreK">PreK</option><option value="K">K</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select>
            </div>
            <div style="width:100%;margin-top:22px;padding-top:16px;border-top:1px solid #e7d9c4">
              <label class="en-label">Reading skill for this grade</label>
              <select id="apiGoal" class="en-select"><option value="comprehension">Comprehension</option><option value="vocabulary">Vocabulary</option><option value="fluency">Fluency</option><option value="phonics">Phonics</option><option value="oral_language">Oral Language</option><option value="writing_response">Writing Response</option><option value="social_emotional_reading">Reading Confidence & SEL</option></select>
            </div>
            <label class="en-label">Choose a story world</label>
            <select id="apiTheme" class="en-select" aria-label="Story world">${themeOptions.map(([value, emoji]) => `<option value="${value}">${emoji} ${value}</option>`).join('')}</select>
            <label class="en-label">Adventure</label>
            <input id="apiPrompt" class="en-input" maxlength="300" placeholder="Finding a map beneath a moonlit bench">
            <button id="apiCreate" class="en-button" style="margin-top:16px;width:100%">Generate reading-aligned story</button>
            <div class="story-visual" id="apiStoryVisual"><img id="apiThemeImage" class="story-visual-banner" alt="Story world image"><div class="story-visual-overlay"><img id="apiGradeBadge" class="story-visual-grade" alt="Grade badge"><img id="apiDomainIcon" class="story-visual-icon" alt="Reading skill icon"></div></div>
            <div id="apiNextStoryHint" style="margin-top:12px;color:#5d5d5d;font-size:13px"></div>
          </section>
          <aside class="en-card trial">
            <span class="en-badge" id="apiPlanBadge">PLAN</span>
            <h2 style="margin-top:17px">Private by design.</h2>
            <p>Only the signed-in parent or teacher can access their learner profiles and stories.</p>
            <img src="${asset('images/Speak/speakpanda.png')}" class="trial-mascot" alt="Friendly reading panda">
            <div id="apiPricingOffer" style="margin-top:10px;font-size:13px"></div>
          </aside>
        </div>

        <section class="en-card" style="margin-top:20px">
          <h2>Business scorecard</h2>
          <div id="apiBusinessScore"></div>
        </section>

        <section class="en-card" style="margin-top:20px">
          <h2>Saved stories</h2>
          <p class="book-modal-meta" style="margin:0 0 12px;text-transform:none;letter-spacing:0">Your most recent reports appear at the top.</p>
          <div id="apiStoryList" class="story-list"></div>
        </section>

        <section class="en-card" style="margin-top:20px">
          <h2>Account activity</h2>
          <div id="apiStats" class="en-stat-grid"></div>
          <div id="apiAiStatus" style="margin-top:10px"></div>
          <div id="apiReminderOpt" style="margin-top:10px"></div>
        </section>

        <section class="en-card hidden" id="apiTeacherTools" style="margin-top:20px">
          <h2>School pilot tools</h2>
          <p style="color:#555">Import learners with CSV rows: first_name,age_band,interests,topics_to_avoid</p>
          <textarea id="apiRosterCsv" class="en-input" style="min-height:120px" placeholder="Maya,6-8,space,none\nJordan,9-11,oceans,storms"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button id="apiImportRoster" class="en-button">Import roster CSV</button>
            <button id="apiDownloadPdf" class="en-outline">Download progress PDF</button>
          </div>
        </section>
      </section>

      <section id="apiLearnersView" class="hidden">
        <div class="en-eyebrow">LEARNER PROFILES</div>
        <h1 class="en-title">Your readers.</h1>
        <div class="en-grid">
          <section class="en-card"><h2>Saved learners</h2><div id="apiLearnerList" class="student-list"></div></section>
          <form id="apiLearnerForm" class="en-card">
            <h2>Add a learner</h2>
            <label class="en-label">First name</label><input id="apiFirstName" class="en-input" maxlength="32" required>
            <div class="en-form-grid"><div><label class="en-label">Age range</label><select id="apiAgeBand" class="en-select"><option value="3-5">Ages 3-5</option><option value="6-8">Ages 6-8</option><option value="9-11">Ages 9-11</option></select></div><div><label class="en-label">Interests</label><input id="apiInterests" class="en-input" maxlength="160"></div></div>
            <label class="en-label">Topics to avoid</label><input id="apiAvoid" class="en-input" maxlength="160">
            <button class="en-button" style="width:100%;margin-top:18px">Save learner</button>
          </form>
        </div>
      </section>

      <section id="apiBillingView" class="hidden">
        <div class="en-eyebrow">PLANS AND BILLING</div>
        <h1 class="en-title">Choose the right shelf size.</h1>
        <p class="en-lede">Choose a free demo or start a monthly subscription through Stripe.</p>
        <div class="plan-grid">
          <article class="plan"><h3>Explorer</h3><div class="plan-price">Free</div><button class="en-outline apiPlan" data-plan="explorer">Choose Explorer demo</button></article>
          <article class="plan selected"><h3>Family</h3><div class="plan-price"><span id="apiFamilyPrice">$8</span> <small>/ month</small></div><button class="en-button apiPlan" data-plan="family">Choose Family demo</button><button class="en-outline apiCheckout" data-plan="family" style="margin-top:8px">Start paid checkout</button></article>
          <article class="plan"><h3>Classroom</h3><div class="plan-price">$18 <small>/ month</small></div><button class="en-outline apiPlan" data-plan="classroom">Choose Classroom demo</button><button class="en-outline apiCheckout" data-plan="classroom" style="margin-top:8px">Start paid checkout</button></article>
        </div>
        <div class="en-card" style="margin-top:20px"><h2>Subscription</h2><p id="apiBillingStatus"></p></div>
      </section>
    </main>
    <div id="apiToast" class="toast" role="status" aria-live="polite"></div>
  `;

  const friendlySource = src => src === 'openai' ? 'OpenAI' : src === 'local_app' ? 'Local app' : src;
  const show = name => {
    ['Home', 'Learners', 'Billing'].forEach(part => $(`#api${part}View`).classList.toggle('hidden', part.toLowerCase() !== name));
    document.querySelectorAll('[data-api-view]').forEach(button => button.classList.toggle('active', button.dataset.apiView === name));
  };

  const renderOnboarding = (subscription) => {
    const doneLearner = learners.length > 0;
    const doneStory = stories.length > 0;
    const donePlan = ['demo', 'active'].includes(subscription.status) && ['family', 'classroom'].includes(subscription.plan);
    $('#apiOnboarding').innerHTML = `<div class="en-stat-grid"><div class="en-stat"><strong>${doneLearner ? '✓' : '1'}</strong><span>Create first learner</span></div><div class="en-stat"><strong>${doneStory ? '✓' : '2'}</strong><span>Generate first story</span></div><div class="en-stat"><strong>${donePlan ? '✓' : '3'}</strong><span>Pick paid plan</span></div></div>`;
  };

  const updateStoryVisual = () => {
    const theme = $('#apiTheme')?.value || 'Moonlight';
    const gradeLevel = $('#apiGradeLevel')?.value || '2';
    const domain = $('#apiGoal')?.value || 'comprehension';
    const themeImage = $('#apiThemeImage');
    const gradeBadge = $('#apiGradeBadge');
    const domainIcon = $('#apiDomainIcon');
    if (themeImage) themeImage.src = themeBannerMap[theme] || themeBannerMap.Moonlight;
    if (gradeBadge) gradeBadge.src = gradeBadgeMap[gradeLevel] || gradeBadgeMap['2'];
    if (domainIcon) domainIcon.src = domainIconMap[domain] || domainIconMap.comprehension;
  };

  const domainNames = { oral_language: 'Oral Language', phonics: 'Phonics', fluency: 'Fluency', vocabulary: 'Vocabulary', comprehension: 'Comprehension', writing_response: 'Writing Response', social_emotional_reading: 'Reading Confidence & SEL' };
  async function loadCurriculumOptions(gradeLevel) {
    const goalSelect = $('#apiGoal');
    if (!goalSelect) return;
    try {
      const result = await api(`/api/curriculum?gradeLevel=${encodeURIComponent(gradeLevel)}`);
      const rows = result.curriculum || [];
      const selectedDomain = goalSelect.value;
      goalSelect.innerHTML = rows.map(row => `<option value="${esc(row.domain)}" title="${esc(row.objective)}">${esc(domainNames[row.domain] || row.domain)} (${esc(row.standard_code)})</option>`).join('');
      if ([...goalSelect.options].some(option => option.value === selectedDomain)) goalSelect.value = selectedDomain;
      updateStoryVisual();
    } catch (error) {
      notify(error.message);
    }
  }

  function renderStoryList() {
    const container = $('#apiStoryList');
    if (!container) return;
    if (!stories.length) {
      container.innerHTML = '<p>No saved stories yet.</p>';
      return;
    }
    container.innerHTML = stories.map(s => {
      const gradeLabel = s?.content?.meta?.gradeLevel ? `Grade ${s.content.meta.gradeLevel}` : '';
      const domainLabel = s?.content?.meta?.domain ? s.content.meta.domain.replaceAll('_', ' ') : '';
      const objectiveLabel = s?.content?.meta?.curriculumObjective || '';
      const createdLabel = formatStoryDate(s.created_at);
      const detail = [s.learner_name || '', s.theme || '', s.learning_goal || '', gradeLabel, domainLabel].filter(Boolean).join(' • ');
      return `<div class="story-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee"><div><div style="font-weight:700">${esc(s.title)}</div><div style="font-size:12px;color:#666">${esc(detail)}${s.created_by ? ` • generated by ${esc(friendlySource(s.created_by))}` : ''}</div>${createdLabel ? `<div style="font-size:10px;color:#888;margin-top:2px">Created ${esc(createdLabel)}</div>` : ''}<div style="font-size:10px;color:#888;margin-top:2px">Story ID: ${esc(s.id)}</div>${objectiveLabel ? `<div style="font-size:11px;color:#888;margin-top:2px">Objective: ${esc(objectiveLabel)}</div>` : ''}</div><div><button class="open-story en-button" data-id="${s.id}" style="min-width:86px">Open</button></div></div>`;
    }).join('');
    document.querySelectorAll('.open-story').forEach(btn => {
      btn.onclick = () => {
        const st = stories.find(x => x.id === btn.dataset.id);
        if (st) openServerStory(st);
      };
    });
  }

  async function openServerStory(story) {
    if (!story?.content?.words?.length) {
      try {
        const result = await api(`/api/stories/${story.id}/vocabulary`, { method: 'POST' });
        story = result.story;
        const storedStory = stories.find(item => item.id === story.id);
        if (storedStory) Object.assign(storedStory, story);
      } catch {
        // The story remains readable even if vocabulary enrichment is unavailable.
      }
    }
    let modal = document.getElementById('apiStoryModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'apiStoryModal';
    modal.className = 'book-modal';
    const inner = document.createElement('div');
    inner.className = 'book-modal-card';
    const modalGrade = story?.content?.meta?.gradeLevel ? `Grade ${story.content.meta.gradeLevel}` : '';
    const earlyReader = ['PreK', 'K', '1'].includes(story?.content?.meta?.gradeLevel);
    const modalDomain = story?.content?.meta?.domain ? story.content.meta.domain.replaceAll('_', ' ') : '';
    const modalObjective = story?.content?.meta?.curriculumObjective || '';
    const modalStandard = story?.content?.meta?.curriculumStandard || '';
    const adultEditorMarkup = earlyReader ? '' : '<section class="book-modal-edit"><h3 class="book-modal-subtitle">Adult story editor</h3><p class="book-modal-meta">Use AI to adjust this story while keeping its reading level and learning goal.</p><form id="apiStoryRevision"><label class="en-label" for="apiRevisionPrompt">What should change?</label><textarea id="apiRevisionPrompt" class="en-input" rows="3" maxlength="500" placeholder="Make the ending more surprising, but keep the same reading skill." required></textarea><button type="submit" class="en-outline" style="margin-top:10px">Revise this story</button></form></section>';
    const assessmentMarkup = earlyReader ? '' : '<h3 class="book-modal-subtitle">Talk about it</h3><form id="apiStoryAssessment" class="book-modal-list"></form><div id="apiAssessmentResult" class="book-modal-meta"></div>';
    const modalMeta = [story.learner_name || '', story.theme || '', story.learning_goal || '', modalGrade, modalDomain].filter(Boolean).join(' • ');
    const modalCreated = formatStoryDate(story.created_at);
    const modalGradeBadge = gradeBadgeMap[story?.content?.meta?.gradeLevel] || gradeBadgeMap['2'];
    inner.innerHTML = `<div class="book-modal-head"><h2 class="book-modal-title">${esc(story.title)}</h2><button id="closeApiStory" class="en-outline">Close</button></div><img class="book-modal-hero" src="${themeBannerMap[story.theme] || themeBannerMap.Moonlight}" alt="Story illustration"><div id="apiStoryPages"></div><div class="book-modal-actions"><button id="apiCompleteStory" class="en-button">Mark completed</button></div><section class="story-meta-footer" style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;margin-top:24px;padding-top:18px;border-top:1px solid #ead8bb"><img src="${modalGradeBadge}" alt="${esc(modalGrade || 'Grade')}" style="display:block;flex:0 0 150px;width:150px;height:64px;object-fit:contain;border-radius:8px"><div style="min-width:220px;flex:1"><div class="book-modal-meta">${esc(modalMeta)}</div>${modalCreated ? `<div class="book-modal-meta" style="margin-top:4px">Created ${esc(modalCreated)}</div>` : ''}<div class="book-modal-meta" style="margin-top:4px">Story ID: ${esc(story.id)}</div>${modalStandard ? `<div class="book-modal-meta" style="margin-top:4px">U.S. standard: ${esc(modalStandard)}</div>` : ''}${modalObjective ? `<div class="book-modal-meta" style="margin-top:4px">Objective: ${esc(modalObjective)}</div>` : ''}</div></section><div id="apiUpgradeCta" class="book-modal-upgrade"></div>${adultEditorMarkup}${assessmentMarkup}<h3 class="book-modal-subtitle">Word garden</h3><div id="apiStoryWords" class="book-modal-list"></div>`;
    modal.appendChild(inner);
    document.body.appendChild(modal);

    const pagesEl = inner.querySelector('#apiStoryPages');
    const pages = story?.content?.pages || [];
    let idx = 0;
    const renderPage = () => {
      pagesEl.innerHTML = `<article class="storybook-page"><div class="storybook-page-text">${esc(pages[idx] || '')}</div><div class="storybook-page-footer"><button id="prevPage" class="en-outline" ${idx === 0 ? 'disabled' : ''}>Back</button><div class="storybook-page-count">Page ${idx + 1} of ${pages.length}</div><button id="nextPage" class="en-button" ${idx === pages.length - 1 ? 'disabled' : ''}>Next</button></div></article>`;
      inner.querySelector('#prevPage').onclick = () => { if (idx > 0) { idx -= 1; renderPage(); } };
      inner.querySelector('#nextPage').onclick = () => { if (idx < pages.length - 1) { idx += 1; renderPage(); } };
    };
    renderPage();
    const questions = story?.content?.questions || [];
    const assessment = inner.querySelector('#apiStoryAssessment');
    if (assessment) {
    assessment.innerHTML = questions.map((question, questionIndex) => earlyReader
      ? `<div class="en-label" style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><span style="flex:1">${questionIndex + 1}. ${esc(typeof question === 'string' ? question : question.prompt || '')}</span><button type="button" class="en-outline apiSpeakQuestion" data-question-index="${questionIndex}" aria-label="Read question aloud">Read aloud</button></div>`
      : `<label class="en-label" style="display:block;margin-top:12px">${questionIndex + 1}. ${esc(typeof question === 'string' ? question : question.prompt || '')}<textarea class="en-input apiAssessmentAnswer" data-question-index="${questionIndex}" rows="2" maxlength="1000" required></textarea></label>`).join('') + (questions.length && !earlyReader ? '<button type="submit" class="en-button" style="margin-top:14px">Save reading response</button>' : (!questions.length ? '<p class="book-modal-empty">No questions provided.</p>' : ''));
    if (earlyReader) {
      assessment.innerHTML += '<p class="book-modal-meta" style="margin-top:14px">Discuss these questions together, then use Mark completed when you are finished.</p>';
      assessment.querySelectorAll('.apiSpeakQuestion').forEach(button => {
        button.onclick = () => {
          const question = questions[Number(button.dataset.questionIndex)];
          const text = typeof question === 'string' ? question : question.prompt || '';
          if (!('speechSynthesis' in window)) return notify('Read-aloud is not supported in this browser.');
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        };
      });
    }
    }
    inner.querySelector('#apiStoryWords').innerHTML = (story?.content?.words || []).map(w => `<div><strong>${esc(w.word)}</strong> — ${esc(w.meaning)}</div>`).join('') || '<p class="book-modal-empty">No words provided.</p>';
    inner.querySelector('#closeApiStory').onclick = () => modal.remove();
    modal.onclick = (event) => { if (event.target === modal) modal.remove(); };
    const revisionForm = inner.querySelector('#apiStoryRevision');
    if (revisionForm) revisionForm.onsubmit = async (event) => {
      event.preventDefault();
      const button = event.target.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await api(`/api/stories/${story.id}/revise`, { method: 'PATCH', body: JSON.stringify({ revisionPrompt: $('#apiRevisionPrompt').value }) });
        modal.remove();
        await refresh();
        const revisedStory = stories.find(item => item.id === story.id);
        if (revisedStory) openServerStory(revisedStory);
        notify('Story revised with AI.');
      } catch (error) {
        button.disabled = false;
        notify(error.message);
      }
    };
    if (assessment) assessment.onsubmit = async (event) => {
      event.preventDefault();
      if (earlyReader) return;
      try {
        const responses = [...assessment.querySelectorAll('.apiAssessmentAnswer')].map(input => earlyReader ? (input.checked ? input.value : '') : input.value);
        const result = await api(`/api/stories/${story.id}/assessment`, { method: 'POST', body: JSON.stringify({ responses }) });
        inner.querySelector('#apiAssessmentResult').textContent = result.mastered ? `Saved. ${result.score}% mastery on this reading skill.` : `Saved. ${result.score}% answered. Keep practicing this skill.`;
        assessment.querySelector('button[type="submit"]').disabled = true;
        await refresh();
        notify('Reading response saved.');
      } catch (error) {
        notify(error.message);
      }
    };
    inner.querySelector('#apiCompleteStory').onclick = async () => {
      try {
        await api(`/api/stories/${story.id}/complete`, { method: 'PATCH' });
        inner.querySelector('#apiUpgradeCta').innerHTML = '<div>Great work. Next step: choose Family plan to keep weekly story momentum.</div>';
        await refresh();
        notify('Story marked completed.');
      } catch (error) {
        notify(error.message);
      }
    };
  }

  async function refresh() {
    const [meData, learnerData, storyData, subscriptionData, scoreData, offerData, reminderData, progressData] = await Promise.all([
      api('/api/me'),
      api('/api/learners'),
      api('/api/stories'),
      api('/api/subscription'),
      api('/api/business/scorecard').catch(() => ({ scorecard: null })),
      api('/api/subscription/offer'),
      api('/api/reminders/preferences'),
      api('/api/progress'),
    ]);

    me = meData.account;
    learners = learnerData.learners || [];
    stories = storyData.stories || [];
    const subscription = subscriptionData.subscription || { plan: 'explorer', status: 'active' };
    const score = scoreData.scorecard;

    $('#apiLearner').innerHTML = learners.length ? learners.map(l => `<option value="${l.id}">${esc(l.first_name)} | ages ${esc(l.age_band)}</option>`).join('') : '<option value="">Add a learner first</option>';
    $('#apiLearnerList').innerHTML = learners.length ? learners.map(l => `<div class="student-row"><div class="student-left"><span class="student-avatar">${esc(l.first_name[0] || '?')}</span><div><div class="student-name">${esc(l.first_name)}</div><div class="student-meta">Ages ${esc(l.age_band)} | ${esc(l.interests || 'Ready for stories')}</div></div></div><button class="apiRemove" data-id="${l.id}">Remove</button></div>`).join('') : '<p>Add a learner to begin.</p>';
    const masteredAssessments = (progressData.learners || []).reduce((total, learner) => total + Number(learner.mastered_assessments || 0), 0);
    $('#apiStats').innerHTML = `<div class="en-stat"><strong>${learners.length}</strong><span>learners</span></div><div class="en-stat"><strong>${stories.length}</strong><span>stories saved</span></div><div class="en-stat"><strong>${stories.filter(s => s.completed_at).length}</strong><span>completed</span></div><div class="en-stat"><strong>${masteredAssessments}</strong><span>skills mastered</span></div>`;
    $('#apiPlanBadge').textContent = `PLAN: ${(subscription.plan || 'explorer').toUpperCase()}`;
    $('#apiBillingStatus').textContent = `${subscription.plan} plan: ${subscription.status}.`;
    renderOnboarding(subscription);

    document.querySelectorAll('.apiRemove').forEach(button => {
      button.onclick = async () => {
        if (!confirm('Remove this learner and their saved stories?')) return;
        await api(`/api/learners/${button.dataset.id}`, { method: 'DELETE' });
        await refresh();
        notify('Learner removed.');
      };
    });

    const retentionPct = Math.round((score?.current?.retention4wRate || 0) * 100);
    const scorecard = $('#apiBusinessScore')?.closest('.en-card');
    if (scorecard) scorecard.classList.toggle('hidden', me.isSiteOwner !== true || !score);
    if (score) $('#apiBusinessScore').innerHTML = `<div class="en-stat-grid"><div class="en-stat"><strong>${score.current.pilotCustomers}</strong><span>pilot customers (target ${score.targets.pilotCustomers})</span></div><div class="en-stat"><strong>${retentionPct}%</strong><span>4-week retention (target ${Math.round(score.targets.retention4wRate * 100)}%)</span></div><div class="en-stat"><strong>${score.current.teacherAccounts}</strong><span>teacher accounts (target ${score.targets.schoolPilots})</span></div></div><p style="margin-top:8px;color:#4c4c4c">Reading streak: ${(score.myAccount?.currentReadingStreak || 0)} day(s).</p>`;

    const familyPrice = Number(offerData.offer?.familyPriceCents || 800) / 100;
    $('#apiFamilyPrice').textContent = `$${familyPrice.toFixed(0)}`;
    $('#apiPricingOffer').innerHTML = `<strong>Your offer:</strong> Family $${familyPrice.toFixed(2)} / month, ${offerData.offer?.trialDays || 7}-day trial.`;

    $('#apiAiStatus').textContent = me.ai_external_opt_in
      ? 'AI story generation is enabled for this account.'
      : 'AI story generation consent is required. Please contact the account administrator.';

    $('#apiReminderOpt').innerHTML = `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="apiReminderToggle" ${reminderData.weeklyEmailEnabled ? 'checked' : ''}> Weekly reminder emails</label>`;
    const reminderToggle = $('#apiReminderToggle');
    if (reminderToggle) {
      reminderToggle.onchange = async () => {
        try {
          await api('/api/reminders/preferences', { method: 'POST', body: JSON.stringify({ weeklyEmailEnabled: reminderToggle.checked }) });
          notify(reminderToggle.checked ? 'Weekly reminders enabled.' : 'Weekly reminders disabled.');
        } catch (error) {
          reminderToggle.checked = !reminderToggle.checked;
          notify(error.message);
        }
      };
    }

    const teacherTools = $('#apiTeacherTools');
    if (teacherTools) teacherTools.classList.toggle('hidden', me.role !== 'teacher');

    if (learners.length) {
      try {
        const nextData = await api(`/api/learners/${learners[0].id}/next-story`);
        const suggestion = nextData.nextBestStory;
        $('#apiNextStoryHint').textContent = suggestion ? `Next suggestion: ${suggestion.objective}` : '';
      } catch {
        $('#apiNextStoryHint').textContent = '';
      }
    }

    renderStoryList();
    updateStoryVisual();
  }

  $('#apiClearCache').onclick = () => {
    localStorage.clear();
    sessionStorage.clear();
    notify('Cache cleared!');
    setTimeout(() => location.reload(), 500);
  };

  $('#apiLearnerForm').onsubmit = async (event) => {
    event.preventDefault();
    try {
      await api('/api/learners', {
        method: 'POST',
        body: JSON.stringify({
          firstName: $('#apiFirstName').value,
          ageBand: $('#apiAgeBand').value,
          interests: $('#apiInterests').value,
          topicsToAvoid: $('#apiAvoid').value,
          goals: ['Kindness', 'Curiosity'],
        }),
      });
      event.target.reset();
      await refresh();
      notify('Learner saved securely.');
    } catch (error) {
      notify(error.message);
    }
  };

  $('#apiCreate').onclick = async () => {
    const learnerId = $('#apiLearner').value;
    const prompt = $('#apiPrompt').value.trim();
    const gradeLevel = $('#apiGradeLevel').value;
    const domain = $('#apiGoal').value;
    const theme = $('#apiTheme').value;
    if (!learnerId || !prompt) return notify('Choose a learner and add an adventure.');
    try {
      const learner = learners.find(item => item.id === learnerId);
      const response = await api('/api/stories/generate', { method: 'POST', body: JSON.stringify({ learnerId, prompt, gradeLevel, domain, theme }) });
      if (!response.story) return notify('Story could not be generated.');
      $('#apiPrompt').value = '';
      await refresh();
      notify(`Story generated for ${learner?.first_name || 'learner'}.`);
    } catch (error) {
      notify(error.message);
    }
  };

  document.querySelectorAll('[data-api-view]').forEach(button => button.onclick = () => show(button.dataset.apiView));
  ['apiGradeLevel', 'apiGoal', 'apiTheme'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      if (id === 'apiGradeLevel') loadCurriculumOptions(el.value);
      updateStoryVisual();
    });
  });
  loadCurriculumOptions($('#apiGradeLevel').value);
  $('#apiHome').onclick = () => show('home');
  $('#apiLogout').onclick = () => {
    localStorage.removeItem('storySproutToken');
    localStorage.removeItem('storySproutAccount');
    location.reload();
  };

  document.querySelectorAll('.apiPlan').forEach(button => {
    button.onclick = async () => {
      try {
        await api('/api/subscription/demo', { method: 'POST', body: JSON.stringify({ plan: button.dataset.plan }) });
        await refresh();
        notify('Demo subscription saved.');
      } catch (error) {
        notify(error.message);
      }
    };
  });

  document.querySelectorAll('.apiCheckout').forEach(button => {
    button.onclick = async () => {
      try {
        const payload = await api('/api/subscription/checkout', { method: 'POST', body: JSON.stringify({ plan: button.dataset.plan }) });
        if (payload.checkoutUrl) location.href = payload.checkoutUrl;
      } catch (error) {
        notify(error.message);
      }
    };
  });

  const importBtn = $('#apiImportRoster');
  if (importBtn) {
    importBtn.onclick = async () => {
      try {
        const csv = $('#apiRosterCsv').value || '';
        const result = await api('/api/classroom/roster/import', { method: 'POST', body: JSON.stringify({ csv }) });
        await refresh();
        notify(`Imported ${result.importedCount} learners.`);
      } catch (error) {
        notify(error.message);
      }
    };
  }

  const pdfBtn = $('#apiDownloadPdf');
  if (pdfBtn) {
    pdfBtn.onclick = () => {
      window.open('/api/classroom/progress-summary.pdf', '_blank');
    };
  }

  refresh().catch(error => notify(error.message));
})();
