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
  const formatStoryDateTime = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  const formatStoryTime = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
    const readingSparks = [
      'Reading grows imagination one page at a time.',
      'Reading helps us notice new ideas and different points of view.',
      'Every story gives a reader another way to wonder.',
      'Reading builds words, confidence, and curiosity.',
      'A story can help a child name a feeling and find a possibility.',
      'Reading lets us travel far while we stay right where we are.',
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
  let curriculumOptions = [];

  app.className = 'enterprise';
  app.innerHTML = `
    <header class="en-header">
      <button class="en-brand" id="apiHome"><span class="en-mark"></span>Story Sprout</button>
      <nav class="en-nav">
        <button data-api-view="home" class="active">Home</button>
        <button data-api-view="learners">Learners</button>
        <button id="apiProgressNav" data-api-view="progress">Progress</button>
        <button data-api-view="billing">Plans & billing</button>
        <button data-api-view="guide">Parent guide</button>
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
        <p class="en-lede">Story Sprout helps adults and children create personalized stories that build reading skills, confidence, and a love of books.</p>

        <section class="en-card" style="margin-bottom:20px">
          <h2>Getting started</h2>
          <div id="apiOnboarding"></div>
        </section>

        <div class="en-grid">
          <section class="en-card">
            <h2>Create a story together</h2>
            <p>Choose your learner's interests, reading goal, and adventure to make a child-friendly story you can read, discuss, and explore together.</p>
            <label class="en-label">Learner</label>
            <select id="apiLearner" class="en-select"></select>
            <div style="width:100%">
              <label class="en-label">Grade level</label>
              <select id="apiGradeLevel" class="en-select" aria-label="Grade level"><option value="PreK">PreK</option><option value="K">K</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select>
            </div>
            <div style="width:100%;margin-top:22px;padding-top:16px;border-top:1px solid #e7d9c4">
              <label class="en-label">Reading skill for this grade</label>
              <select id="apiGoal" class="en-select"><option value="comprehension">Comprehension</option><option value="vocabulary">Vocabulary</option><option value="fluency">Fluency</option><option value="phonics">Phonics</option><option value="oral_language">Oral Language</option><option value="writing_response">Writing Response</option><option value="social_emotional_reading">Reading Confidence & SEL</option></select>
              <p id="apiGoalObjective" class="book-modal-meta" style="margin:8px 0 0;text-transform:none;letter-spacing:0;line-height:1.45"></p>
              <p class="book-modal-meta" style="margin:7px 0 0;text-transform:none;letter-spacing:0">The code is the reading benchmark; the sentence above explains the skill in family-friendly language.</p>
            </div>
            <label class="en-label">Choose a story world</label>
            <select id="apiTheme" class="en-select" aria-label="Story world">${themeOptions.map(([value, emoji]) => `<option value="${value}">${emoji} ${value}</option>`).join('')}<option value="Custom">✏️ My own world</option></select>
            <input id="apiCustomTheme" class="en-input hidden" maxlength="80" placeholder="Name your world, such as The Cloud Library" style="margin-top:10px" aria-label="Your story world">
            <label class="en-label">Adventure</label>
            <input id="apiPrompt" class="en-input" maxlength="300" placeholder="Finding a map beneath a moonlit bench">
            <label class="en-label">Story length</label>
            <select id="apiStoryLength" class="en-select" aria-label="Story length"><option value="quick">Quick read</option><option value="standard" selected>Standard story</option><option value="long">Longer adventure</option></select>
            <p class="book-modal-meta" style="margin:7px 0 0;text-transform:none;letter-spacing:0">Length is adjusted to fit the reader's grade level.</p>
            <div class="story-generation-panel" aria-live="polite">
              <button id="apiCreate" class="en-button story-generation-button" type="button"><span class="story-generation-icon">✦</span><span><strong>Generate my story</strong><small>Build a personalized reading adventure</small></span><span class="story-generation-arrow">→</span></button>
              <div id="apiGenerationStatus" class="story-generation-status">Your choices shape the story, questions, and vocabulary.</div>
              <div id="apiGenerationProgress" class="story-generation-progress hidden" role="progressbar" aria-label="Story generation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
            </div>
            <div class="story-visual" id="apiStoryVisual"><img id="apiThemeImage" class="story-visual-banner" alt="Story world image"><div class="story-visual-overlay"><img id="apiGradeBadge" class="story-visual-grade" alt="Grade badge"><img id="apiDomainIcon" class="story-visual-icon" alt="Reading skill icon"></div></div>
          </section>
          <aside class="en-card trial">
            <span class="en-badge" id="apiPlanBadge">PLAN</span>
            <h2 style="margin-top:17px">Private by design.</h2>
            <p>Only the signed-in parent or teacher can access their learner profiles and stories.</p>
            <img src="${asset('images/Speak/speakpanda.png')}" class="trial-mascot" alt="Friendly reading panda">
            <div id="apiPricingOffer" style="margin-top:10px;font-size:13px"></div>
            <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e5d5bf">
              <div class="en-eyebrow">A READING SPARK</div>
              <p id="apiReadingSpark" style="margin:7px 0 0;color:#fff;font-size:17px;line-height:1.4"></p>
            </div>
          </aside>
        </div>

        <section class="en-card" style="margin-top:20px">
          <h2>Saved stories</h2>
          <p class="book-modal-meta" style="margin:0 0 12px;text-transform:none;letter-spacing:0">Your most recent reports appear at the top.</p>
          <input id="apiStorySearch" class="en-input" type="search" placeholder="Search stories by title, learner, world, or standard" aria-label="Search saved stories" style="margin-bottom:14px">
          <div id="apiStoryList" class="story-list"></div>
        </section>

        <section class="en-card" style="margin-top:20px">
          <div class="en-eyebrow">FOR FAMILIES</div>
          <h2>How Story Sprout supports reading</h2>
          <p class="en-lede" style="font-size:15px;margin-top:8px">We turn reading practice into a story a child can understand, talk about, and return to.</p>
          <div class="en-stat-grid" style="margin-top:18px">
            <div class="en-stat"><strong>1</strong><span><b>Start with the right goal.</b><br>Choose a grade and a U.S. reading benchmark so the story has a clear learning purpose.</span></div>
            <div class="en-stat"><strong>2</strong><span><b>Practice through a story.</b><br>AI adjusts the language, sentence length, questions, and vocabulary for the selected grade.</span></div>
            <div class="en-stat"><strong>3</strong><span><b>Notice growth together.</b><br>Adults can listen, discuss the story, review difficult words, and follow completed reading work.</span></div>
          </div>
          <p style="margin:18px 0 0;color:#597076;font:13px/1.5 Arial,sans-serif">Our approach is conversation-first: the goal is not to rush a child through a score, but to help them build confidence, understanding, and a lasting relationship with reading.</p>
        </section>

        <section class="en-card" style="margin-top:20px">
          <div class="en-eyebrow">CURRICULUM GUIDE</div>
          <h2>What do the reading codes mean?</h2>
          <p class="en-lede" style="font-size:15px;margin-top:8px">Each story is connected to a U.S. reading benchmark. The code helps adults and teachers identify the skill; the story gives children a friendly way to practice it.</p>
          <details>
            <summary style="cursor:pointer;font-weight:700;color:#24515b">Open the family guide</summary>
            <div style="display:grid;gap:12px;margin-top:16px;font:14px/1.5 Arial,sans-serif;color:#597076">
              <div><strong>PreK-K</strong><br>Early language, letter sounds, book knowledge, story retelling, and simple comprehension.</div>
              <div><strong>Grades 1-2</strong><br>Foundational reading, fluency, vocabulary, sequencing, main idea, and character understanding.</div>
              <div><strong>Grades 3-5</strong><br>Reading evidence, theme, point of view, vocabulary, writing about reading, and comparing ideas.</div>
              <div><strong>Grades 6-8</strong><br>Text structure, author craft, perspective, argument, evidence-based writing, and critical interpretation.</div>
              <div><strong>Common abbreviations</strong><br><b>RF</b> = Reading Foundational Skills; <b>RL</b> = Reading Literature; <b>RI</b> = Reading Informational Text; <b>L</b> = Language; <b>W</b> = Writing.</div>
              <div><strong>How to read a code</strong><br>In <b>RL.3.1</b>, <b>RL</b> names the reading-literature area, the first number is the grade, and the last number identifies the benchmark. Story Sprout also uses short internal labels such as <b>3-CMP-1</b>; the plain-English objective beside the code is the clearest description of the practice.</div>
            </div>
          </details>
        </section>

        <section class="en-card" style="margin-top:20px">
          <h2>Learner progress</h2>
          <div id="apiStats" class="en-stat-grid"></div>
          <div id="apiAiStatus" style="margin-top:10px"></div>
          <div id="apiReminderOpt" style="margin-top:10px"></div>
        </section>

      </section>

      <section id="apiGuideView" class="hidden">
        <div class="en-eyebrow">PARENT GUIDE</div>
        <h1 class="en-title">How Story Sprout works.</h1>
        <p class="en-lede">Adults guide the learning. Children bring the imagination. Use this quick guide to create a story, read it together, and see what the child understood.</p>
        <div class="en-grid" style="margin-top:30px">
          <section class="en-card">
            <h2>Start here</h2>
            <ol style="font:15px/1.65 Arial,sans-serif;color:#597076;padding-left:22px">
              <li>Add a learner and choose an age range.</li>
              <li>Choose a grade and reading skill.</li>
              <li>Choose a story world and adventure together.</li>
              <li>Select Quick read, Standard story, or Longer adventure.</li>
              <li>Generate the story and read or listen together.</li>
              <li>Answer the multiple-choice questions and check the score.</li>
            </ol>
          </section>
          <section class="en-card">
            <h2>What the score means</h2>
            <p>The score shows how many questions the child answered correctly from that story. It is useful practice feedback, not a complete reading assessment.</p>
            <p>Use <strong>Try again</strong> to repeat the questions, or <strong>Close</strong> to finish the activity.</p>
          </section>
        </div>
        <section class="en-card" style="margin-top:20px">
          <h2>What the reading code means</h2>
          <p>Each story uses a grade-level reading objective. The plain-English objective explains the skill; the code helps identify the curriculum area.</p>
          <div class="en-stat-grid" style="margin-top:16px">
            <div class="en-stat"><strong>RF</strong><span>Reading Foundational Skills</span></div>
            <div class="en-stat"><strong>RL</strong><span>Reading Literature</span></div>
            <div class="en-stat"><strong>RI</strong><span>Reading Informational Text</span></div>
            <div class="en-stat"><strong>L / W</strong><span>Language / Writing</span></div>
          </div>
        </section>
        <section class="en-card" style="margin-top:20px">
          <h2>Keep the adult in control</h2>
          <p>Review stories before using them, supervise the child's use, and avoid entering unnecessary sensitive information. Privacy & data settings let you export or delete account and learner data.</p>
        </section>
      </section>

      <section id="apiProgressView" class="hidden">
        <div class="en-eyebrow">ADULT PROGRESS TOOLS</div>
        <h1 class="en-title">Progress and school tools.</h1>
        <p class="en-lede">Review business signals, export classroom progress, and manage adult-facing reporting here.</p>
        <div id="apiProgressNotice" class="en-card" style="margin-top:20px"></div>
        <div id="apiProgressDestination"></div>
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

  let readingSparkIndex = 0;
  const readingSpark = $('#apiReadingSpark');
  const showReadingSpark = () => {
    if (!readingSpark) return;
    readingSpark.textContent = readingSparks[readingSparkIndex % readingSparks.length];
    readingSparkIndex += 1;
  };
  showReadingSpark();
  setInterval(showReadingSpark, 8000);

  const progressDestination = $('#apiProgressDestination');
  if (progressDestination) {
    const scorecard = $('#apiBusinessScore')?.closest('.en-card');
    const teacherTools = $('#apiTeacherTools');
    if (scorecard) progressDestination.appendChild(scorecard);
    if (teacherTools) progressDestination.appendChild(teacherTools);
  }
  const homeFamilyGuidance = [...document.querySelectorAll('#apiHomeView .en-card')].find(card => card.querySelector('.en-eyebrow')?.textContent === 'FOR FAMILIES');
  const learnerProgressCard = $('#apiStats')?.closest('.en-card');
  if (homeFamilyGuidance && learnerProgressCard) learnerProgressCard.after(homeFamilyGuidance);

  const friendlySource = src => src === 'openai' || src === 'openai_revision' ? 'AI' : src === 'local_app' ? 'Local app' : src;
  const show = name => {
    ['Home', 'Learners', 'Progress', 'Billing', 'Guide'].forEach(part => $(`#api${part}View`).classList.toggle('hidden', part.toLowerCase() !== name));
    document.querySelectorAll('[data-api-view]').forEach(button => button.classList.toggle('active', button.dataset.apiView === name));
  };

  const renderOnboarding = (subscription) => {
    const doneLearner = learners.length > 0;
    const doneStory = stories.length > 0;
    const donePlan = ['demo', 'active'].includes(subscription.status) && ['family', 'classroom'].includes(subscription.plan);
    $('#apiOnboarding').innerHTML = `<div class="en-stat-grid"><button type="button" class="en-stat apiStartStep" data-step="learner"><strong>${doneLearner ? '✓' : '1'}</strong><span>${doneLearner ? 'Learner added' : 'Add a learner'}</span></button><button type="button" class="en-stat apiStartStep" data-step="story"><strong>${doneStory ? '✓' : '2'}</strong><span>${doneStory ? 'First story created' : 'Create your first story'}</span></button><button type="button" class="en-stat apiStartStep" data-step="plan"><strong>${donePlan ? '✓' : '3'}</strong><span>${donePlan ? 'Plan selected' : 'Choose a plan'}</span></button></div>`;
    document.querySelectorAll('.apiStartStep').forEach(button => {
      button.onclick = () => {
        if (button.dataset.step === 'learner') show('learners');
        if (button.dataset.step === 'plan') show('billing');
        if (button.dataset.step === 'story') {
          show('home');
          $('#apiPrompt')?.focus();
        }
      };
    });
  };

  const updateStoryVisual = () => {
    const theme = $('#apiTheme')?.value || 'Moonlight';
    const gradeLevel = $('#apiGradeLevel')?.value || '2';
    const selectedStandard = $('#apiGoal')?.value || '';
    const domain = curriculumOptions.find(row => row.standard_code === selectedStandard)?.domain || selectedStandard || 'comprehension';
    const themeImage = $('#apiThemeImage');
    const gradeBadge = $('#apiGradeBadge');
    const domainIcon = $('#apiDomainIcon');
    if (themeImage) themeImage.src = themeBannerMap[theme] || themeBannerMap.Moonlight;
    if (gradeBadge) gradeBadge.src = gradeBadgeMap[gradeLevel] || gradeBadgeMap['2'];
    if (domainIcon) domainIcon.src = domainIconMap[domain] || domainIconMap.comprehension;
  };

  async function loadCurriculumOptions(gradeLevel) {
    const goalSelect = $('#apiGoal');
    if (!goalSelect) return;
    try {
      const result = await api(`/api/curriculum?gradeLevel=${encodeURIComponent(gradeLevel)}`);
      const rows = result.curriculum || [];
      curriculumOptions = rows;
      const selectedStandard = goalSelect.value;
      goalSelect.innerHTML = rows.map(row => `<option value="${esc(row.standard_code)}" title="${esc(row.objective)}">${esc(row.strand)} (${esc(row.standard_code)})</option>`).join('');
      if ([...goalSelect.options].some(option => option.value === selectedStandard)) goalSelect.value = selectedStandard;
      const selectedRow = rows.find(row => row.standard_code === goalSelect.value) || rows[0];
      if (selectedRow) $('#apiGoalObjective').textContent = `${selectedRow.standard_code}: ${selectedRow.objective}`;
      updateStoryVisual();
    } catch (error) {
      notify(error.message);
    }
  }

  function renderStoryList() {
    const container = $('#apiStoryList');
    if (!container) return;
    const searchTerm = ($('#apiStorySearch')?.value || '').trim().toLowerCase();
    const visibleStories = stories.filter(story => {
      if (!searchTerm) return true;
      const searchable = [
        story.title,
        story.learner_name,
        story.theme,
        story.prompt,
        story.content?.meta?.customTheme,
        story.content?.meta?.curriculumStandard,
        story.content?.meta?.curriculumObjective,
        ...(story.content?.pages || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(searchTerm);
    });
    if (!stories.length) {
      container.innerHTML = '<p>No saved stories yet.</p>';
      return;
    }
    if (!visibleStories.length) {
      container.innerHTML = '<p>No stories match that search.</p>';
      return;
    }
    container.innerHTML = visibleStories.map(s => {
      const gradeLabel = s?.content?.meta?.gradeLevel ? `Grade ${s.content.meta.gradeLevel}` : '';
      const domainLabel = s?.content?.meta?.domain ? s.content.meta.domain.replaceAll('_', ' ') : '';
      const objectiveLabel = s?.content?.meta?.curriculumObjective || '';
      const createdTimeLabel = formatStoryDateTime(s.created_at);
      const detail = [s.learner_name || '', s.content?.meta?.customTheme || s.theme || '', s.learning_goal || '', gradeLabel, domainLabel].filter(Boolean).join(' • ');
      return `<div class="story-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee"><div><div style="font-weight:700">${esc(s.title)}</div><div style="font-size:12px;color:#666">${esc(detail)}${s.created_by ? ` • generated by ${esc(friendlySource(s.created_by))}` : ''}</div>${createdTimeLabel ? `<div style="font-size:10px;color:#888;margin-top:2px">Created ${esc(createdTimeLabel)}</div>` : ''}<div style="font-size:10px;color:#888;margin-top:2px">Story ID: ${esc(s.id)}</div>${objectiveLabel ? `<div style="font-size:11px;color:#888;margin-top:2px">Objective: ${esc(objectiveLabel)}</div>` : ''}</div><div><button class="open-story en-button" data-id="${s.id}" style="min-width:86px">Open</button></div></div>`;
    }).join('');
    document.querySelectorAll('.open-story').forEach(btn => {
      btn.onclick = () => {
        const st = stories.find(x => x.id === btn.dataset.id);
        if (st) openServerStory(st);
      };
    });
  }

  $('#apiStorySearch').addEventListener('input', renderStoryList);

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
    const assessmentMarkup = '<h3 class="book-modal-subtitle">Check understanding</h3><form id="apiStoryAssessment" class="book-modal-list"></form><div id="apiAssessmentResult" class="assessment-result" aria-live="polite"></div>';
    const modalMeta = [story.learner_name || '', story.content?.meta?.customTheme || story.theme || '', story.learning_goal || '', modalGrade, modalDomain].filter(Boolean).join(' • ');
    const modalCreated = formatStoryDate(story.created_at);
    const modalGradeBadge = gradeBadgeMap[story?.content?.meta?.gradeLevel] || gradeBadgeMap['2'];
    inner.innerHTML = `<div class="book-modal-head"><div><div class="book-modal-meta" style="margin:0 0 5px">Story time</div><h2 class="book-modal-title">${esc(story.title)}</h2></div><button id="closeApiStory" class="en-outline">Close</button></div><img class="book-modal-hero" src="${themeBannerMap[story.theme] || themeBannerMap.Moonlight}" alt="Story illustration"><div class="reader-toolbar" role="toolbar" aria-label="Story reading controls" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px;padding:10px;background:#eef5ec;border-radius:8px"><button id="apiReadPage" type="button" class="en-button">Read this page</button><button id="apiReadStory" type="button" class="en-outline">Read story</button><button id="apiStopReading" type="button" class="en-outline">Stop</button><span style="margin-left:auto;font:12px Arial,sans-serif;color:#597076">Text size</span><button id="apiTextSmaller" type="button" class="en-outline" aria-label="Make text smaller">A-</button><button id="apiTextLarger" type="button" class="en-outline" aria-label="Make text larger">A+</button></div><div id="apiStoryPages"></div><div class="book-modal-actions"><button id="apiCompleteStory" class="en-button">Mark completed</button></div><section class="story-meta-footer" style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;margin-top:24px;padding-top:18px;border-top:1px solid #ead8bb"><img src="${modalGradeBadge}" alt="${esc(modalGrade || 'Grade')}" style="display:block;flex:0 0 150px;width:150px;height:64px;object-fit:contain;border-radius:8px"><div style="min-width:220px;flex:1"><div class="book-modal-meta">${esc(modalMeta)}</div>${modalCreated ? `<div class="book-modal-meta" style="margin-top:4px">Created ${esc(modalCreated)}</div>` : ''}<div class="book-modal-meta" style="margin-top:4px">Story ID: ${esc(story.id)}</div>${modalStandard ? `<div class="book-modal-meta" style="margin-top:4px">U.S. standard: ${esc(modalStandard)}</div>` : ''}${modalObjective ? `<div class="book-modal-meta" style="margin-top:4px">Objective: ${esc(modalObjective)}</div>` : ''}</div></section><div id="apiUpgradeCta" class="book-modal-upgrade"></div>${adultEditorMarkup}${assessmentMarkup}<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 class="book-modal-subtitle">Word garden</h3><button id="apiRefreshWords" type="button" class="en-outline">Refresh word garden</button></div><p class="book-modal-meta" style="text-transform:none;letter-spacing:0">Click any word in the story to add a simple definition here.</p><div id="apiStoryWords" class="book-modal-list"></div>`;
    modal.appendChild(inner);
    document.body.appendChild(modal);
    const createdTime = formatStoryTime(story.created_at);
    if (createdTime) {
      const metadataColumn = inner.querySelector('.story-meta-footer > div');
      if (metadataColumn) {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'book-modal-meta';
        timeLabel.style.marginTop = '4px';
        timeLabel.textContent = `Created at ${createdTime}`;
        metadataColumn.appendChild(timeLabel);
      }
    }
    const reportButton = document.createElement('button');
    reportButton.id = 'apiReportSafety';
    reportButton.type = 'button';
    reportButton.className = 'en-outline';
    reportButton.textContent = 'Report safety concern';
    inner.querySelector('.book-modal-actions').appendChild(reportButton);
    const reportForm = document.createElement('form');
    reportForm.id = 'apiSafetyReportForm';
    reportForm.className = 'hidden';
    reportForm.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;padding:10px;background:#fff4e3;border:1px solid #ead8bb;border-radius:8px';
    reportForm.innerHTML = '<select id="apiSafetyCategory" class="en-select" aria-label="Safety report category" style="width:auto"><option value="unsafe_content">Unsafe content</option><option value="incorrect_content">Incorrect content</option><option value="privacy_concern">Privacy concern</option><option value="other">Other</option></select><input id="apiSafetyDetails" class="en-input" maxlength="1000" placeholder="What should we review?" aria-label="Safety report details" style="flex:1;min-width:190px"><button type="submit" class="en-button">Send report</button><button type="button" id="apiCancelSafetyReport" class="en-outline">Cancel</button>';
    inner.querySelector('.book-modal-actions').after(reportForm);
    reportButton.onclick = () => { reportForm.classList.remove('hidden'); reportButton.classList.add('hidden'); reportForm.querySelector('#apiSafetyDetails').focus(); };
    reportForm.querySelector('#apiCancelSafetyReport').onclick = () => { reportForm.classList.add('hidden'); reportButton.classList.remove('hidden'); };
    if (story.completed_at) {
      const completeButton = inner.querySelector('#apiCompleteStory');
      completeButton.disabled = true;
      completeButton.textContent = 'Story complete';
    }
    const voiceSelect = document.createElement('select');
    voiceSelect.id = 'apiVoiceSelect';
    voiceSelect.className = 'en-select';
    voiceSelect.setAttribute('aria-label', 'Narration voice');
    voiceSelect.style.width = 'auto';
    voiceSelect.style.marginLeft = 'auto';
    voiceSelect.innerHTML = '<option value="">Natural voice</option>';
    inner.querySelector('.reader-toolbar').insertBefore(voiceSelect, inner.querySelector('.reader-toolbar span'));

    const pagesEl = inner.querySelector('#apiStoryPages');
    const pages = story?.content?.pages || [];
    let idx = 0;
    let textSize = 24;
    const learnedWords = new Set();
    const storyWordMarkup = text => String(text || '').replace(/[A-Za-z][A-Za-z'-]*/g, (word, offset, fullText) => {
      const firstLetter = fullText.slice(0, offset).match(/[A-Za-z]/) ? '' : `<span style="font-size:1.85em;line-height:.8;color:#b35d3e;font-weight:700">${esc(word[0])}</span>`;
      return `<button type="button" class="apiStoryWord" data-word="${esc(word.toLowerCase())}" style="border:0;border-bottom:1px dashed #b35d3e;background:transparent;color:inherit;padding:0;cursor:pointer">${firstLetter}${esc(firstLetter ? word.slice(1) : word)}</button>`;
    });
    const speak = text => {
      if (!('speechSynthesis' in window)) return notify('Read-aloud is not supported in this browser.');
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
      const femaleVoice = selectedVoice || voices.find(voice => /en-US/i.test(voice.lang) && /female|samantha|ava|victoria|karen|zira|jenny|aria|libby|hazel/i.test(voice.name))
        || voices.find(voice => /en-US/i.test(voice.lang) && /female|samantha|ava|victoria|karen|zira|jenny|aria|libby|hazel/i.test(voice.name))
        || voices.find(voice => /en-US/i.test(voice.lang));
      const utterance = new SpeechSynthesisUtterance(text);
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 0.95;
      window.speechSynthesis.speak(utterance);
    };
    const populateVoiceChoices = () => {
      const selected = voiceSelect.value;
      const voices = window.speechSynthesis?.getVoices?.() || [];
      voiceSelect.innerHTML = '<option value="">Natural voice</option>' + voices.filter(voice => /^en(-|_)/i.test(voice.lang)).map(voice => `<option value="${esc(voice.name)}">${esc(voice.name)}</option>`).join('');
      if ([...voiceSelect.options].some(option => option.value === selected)) voiceSelect.value = selected;
    };
    populateVoiceChoices();
    window.speechSynthesis?.addEventListener('voiceschanged', populateVoiceChoices);
    const renderWordGarden = () => {
      inner.querySelector('#apiStoryWords').innerHTML = (story?.content?.words || []).map(w => `<div class="word-card ${learnedWords.has(w.word.toLowerCase()) ? 'learned' : ''}"><div><strong>${esc(w.word)}</strong><div style="margin-top:3px;color:#597076;font:13px/1.4 Arial,sans-serif">${esc(w.meaning)}</div></div><button type="button" class="apiLearnWord" data-word="${esc(w.word.toLowerCase())}">${learnedWords.has(w.word.toLowerCase()) ? 'Learned' : 'I learned this word'}</button></div>`).join('') || '<p class="book-modal-empty">No words saved yet. Click a story word or refresh the garden.</p>';
      inner.querySelectorAll('.apiLearnWord').forEach(button => {
        button.onclick = () => { learnedWords.add(button.dataset.word); renderWordGarden(); };
      });
    };
    function bindStoryWords() {
      pagesEl.querySelectorAll('.apiStoryWord').forEach(button => {
        button.onclick = async () => {
          button.disabled = true;
          try {
            const result = await api(`/api/stories/${story.id}/vocabulary`, { method: 'POST', body: JSON.stringify({ word: button.dataset.word }) });
            story = result.story;
            renderWordGarden();
            notify(`Added "${button.dataset.word}" to the Word garden.`);
          } catch (error) {
            notify(error.message);
            button.disabled = false;
          }
        };
      });
    }
    const renderPage = () => {
      pagesEl.innerHTML = `<article class="storybook-page"><div class="storybook-page-text" style="font-size:${textSize}px">${storyWordMarkup(pages[idx] || '')}</div><div class="storybook-page-footer"><button id="prevPage" class="en-outline" ${idx === 0 ? 'disabled' : ''}>Back</button><div class="storybook-page-count" aria-live="polite">Page ${idx + 1} of ${pages.length}</div><button id="nextPage" class="en-button" ${idx === pages.length - 1 ? 'disabled' : ''}>Next</button></div></article>`;
      inner.querySelector('#prevPage').onclick = () => { if (idx > 0) { idx -= 1; renderPage(); } };
      inner.querySelector('#nextPage').onclick = () => { if (idx < pages.length - 1) { idx += 1; renderPage(); } };
      bindStoryWords();
    };
    renderPage();
    inner.querySelector('#apiReadPage').onclick = () => speak(pages[idx] || '');
    inner.querySelector('#apiReadStory').onclick = () => speak(pages.join(' '));
    inner.querySelector('#apiStopReading').onclick = () => window.speechSynthesis?.cancel();
    inner.querySelector('#apiTextSmaller').onclick = () => { textSize = Math.max(18, textSize - 2); renderPage(); };
    inner.querySelector('#apiTextLarger').onclick = () => { textSize = Math.min(34, textSize + 2); renderPage(); };
    renderWordGarden();
    inner.querySelector('#apiRefreshWords').onclick = async () => {
      try {
        const result = await api(`/api/stories/${story.id}/vocabulary`, { method: 'POST', body: JSON.stringify({ refresh: true }) });
        story = result.story;
        renderWordGarden();
        notify('Word garden refreshed.');
      } catch (error) {
        notify(error.message);
      }
    };
    const questions = story?.content?.questions || [];
    const objectiveQuestions = questions.length > 0 && questions.every(question => question && typeof question === 'object' && Array.isArray(question.options) && question.answer);
    const assessment = inner.querySelector('#apiStoryAssessment');
    if (assessment && !objectiveQuestions) {
      const reviewPanel = document.createElement('section');
      reviewPanel.id = 'apiAdultReview';
      reviewPanel.className = 'book-modal-edit hidden';
      reviewPanel.innerHTML = '<h3 class="book-modal-subtitle">Adult review</h3><p class="book-modal-meta" style="text-transform:none;letter-spacing:0">The response is complete, but mastery is not determined automatically. Review the answer using the selected reading standard.</p><form id="apiAdultReviewForm"><label class="en-label">Review score (0-100)<input id="apiReviewScore" class="en-input" type="number" min="0" max="100" required></label><label class="en-label" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input id="apiReviewMastered" type="checkbox"> Mark this standard as mastered</label><label class="en-label" style="display:block;margin-top:10px">Review notes<textarea id="apiReviewNotes" class="en-input" rows="2" maxlength="1000" placeholder="What evidence did the reader show?"></textarea></label><button type="submit" class="en-outline" style="margin-top:10px">Save adult review</button></form><p id="apiReviewStatus" class="book-modal-meta"></p>';
      inner.querySelector('#apiAssessmentResult').after(reviewPanel);
      reviewPanel.querySelector('#apiAdultReviewForm').onsubmit = async event => {
        event.preventDefault();
        try {
          const result = await api(`/api/stories/${story.id}/assessment/review`, { method: 'PATCH', body: JSON.stringify({ score: Number(reviewPanel.querySelector('#apiReviewScore').value), mastered: reviewPanel.querySelector('#apiReviewMastered').checked, notes: reviewPanel.querySelector('#apiReviewNotes').value }) });
          reviewPanel.querySelector('#apiReviewStatus').textContent = result.assessment.mastered ? 'Reviewed: standard marked mastered.' : 'Reviewed: keep practicing this standard.';
          await refresh();
          notify('Adult review saved.');
        } catch (error) {
          notify(error.message);
        }
      };
    }
    if (assessment) {
    assessment.innerHTML = questions.map((question, questionIndex) => objectiveQuestions
      ? `<fieldset class="assessment-question"><legend>${questionIndex + 1}. ${esc(question.prompt)}</legend><div class="assessment-options">${question.options.map(option => `<label class="assessment-option"><input class="apiAssessmentAnswer" type="radio" name="assessment-${questionIndex}" data-question-index="${questionIndex}" value="${esc(option)}" required><span>${esc(option)}</span></label>`).join('')}</div><button type="button" class="en-outline apiSpeakQuestion" data-question-index="${questionIndex}" aria-label="Read question aloud">Read aloud</button></fieldset>`
      : `<label class="en-label" style="display:block;margin-top:12px">${questionIndex + 1}. ${esc(typeof question === 'string' ? question : question.prompt || '')}<textarea class="en-input apiAssessmentAnswer" data-question-index="${questionIndex}" rows="2" maxlength="1000" required></textarea></label>`).join('') + (questions.length ? '<button type="submit" class="en-button" style="margin-top:14px">Check answers</button>' : '<p class="book-modal-empty">No questions provided.</p>');
    if (questions.length) {
      assessment.innerHTML += `<p class="book-modal-meta" style="margin-top:14px">${objectiveQuestions ? 'Choose the best answer from the story. Your score is calculated automatically.' : 'This older story uses written responses and still needs adult review.'}</p>`;
      assessment.querySelectorAll('.apiSpeakQuestion').forEach(button => {
        button.onclick = () => {
          const question = questions[Number(button.dataset.questionIndex)];
          const text = typeof question === 'string' ? question : question.prompt || '';
          speak(text);
        };
      });
    }
    }
    inner.querySelector('#closeApiStory').onclick = () => { window.speechSynthesis?.cancel(); modal.remove(); };
    modal.onclick = (event) => { if (event.target === modal) { window.speechSynthesis?.cancel(); modal.remove(); } };
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
      try {
        const responses = questions.map((question, index) => objectiveQuestions
          ? assessment.querySelector(`input[name="assessment-${index}"]:checked`)?.value || ''
          : assessment.querySelector(`[data-question-index="${index}"]`)?.value || '');
        const result = await api(`/api/stories/${story.id}/assessment`, { method: 'POST', body: JSON.stringify({ responses }) });
        const resultPanel = inner.querySelector('#apiAssessmentResult');
        resultPanel.innerHTML = objectiveQuestions
          ? `<strong class="assessment-score">${result.score}<span>/100</span></strong><span class="assessment-score-detail">${result.correct} of ${questions.length} correct. ${result.mastered ? 'Great work. This story check shows the skill was demonstrated.' : 'Keep practicing this skill and try again.'}</span><div class="assessment-result-actions"><button type="button" class="en-button" id="apiRetryAssessment">Try again</button><button type="button" class="en-outline" id="apiCloseAssessment">Close</button></div>`
          : `<strong class="assessment-score">${result.score}<span>/100</span></strong><span class="assessment-score-detail">Practice score saved. Adult review is still required for this older story format.</span><div class="assessment-result-actions"><button type="button" class="en-outline" id="apiCloseAssessment">Close</button></div>`;
        if (!objectiveQuestions) inner.querySelector('#apiAdultReview')?.classList.remove('hidden');
        assessment.querySelector('button[type="submit"]').disabled = true;
        inner.querySelector('#apiRetryAssessment')?.addEventListener('click', () => {
          assessment.reset();
          resultPanel.innerHTML = '';
          assessment.querySelector('button[type="submit"]').disabled = false;
          assessment.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        inner.querySelector('#apiCloseAssessment')?.addEventListener('click', () => inner.querySelector('#closeApiStory').click());
        await refresh();
        notify('Reading response saved.');
      } catch (error) {
        notify(error.message);
      }
    };
    reportForm.onsubmit = async event => {
      event.preventDefault();
      const details = reportForm.querySelector('#apiSafetyDetails').value.trim();
      try {
        await api(`/api/stories/${story.id}/safety-report`, { method: 'POST', body: JSON.stringify({ category: reportForm.querySelector('#apiSafetyCategory').value, details }) });
        reportForm.classList.add('hidden');
        reportButton.classList.remove('hidden');
        reportForm.reset();
        notify('Safety report submitted for review.');
      } catch (error) {
        notify(error.message);
      }
    };
    inner.querySelector('#apiCompleteStory').onclick = async () => {
      try {
        await api(`/api/stories/${story.id}/complete`, { method: 'PATCH' });
        inner.querySelector('#apiCompleteStory').disabled = true;
        inner.querySelector('#apiCompleteStory').textContent = 'Story complete';
        inner.querySelector('#apiUpgradeCta').innerHTML = '<div class="story-finished-state">Story finished. Nice reading work.</div>';
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
    const progressNav = $('#apiProgressNav');
    const canUseProgressTools = me.isSiteOwner === true || me.role === 'teacher';
    if (progressNav) progressNav.classList.toggle('hidden', !canUseProgressTools);
    if (!canUseProgressTools && !$('#apiProgressView').classList.contains('hidden')) show('home');
    const progressNotice = $('#apiProgressNotice');
    if (progressNotice) {
      progressNotice.innerHTML = me.isSiteOwner === true
        ? '<strong>Site owner reporting</strong><p style="margin:6px 0 0;color:#597076">This page contains business signals and operational metrics for the site owner. Learner progress remains on Home.</p>'
        : me.role === 'teacher'
          ? '<strong>Teacher reporting</strong><p style="margin:6px 0 0;color:#597076">Use the school tools below to import a roster and export classroom progress. Learner progress remains on Home.</p>'
          : '<strong>Progress tools are adult-only</strong><p style="margin:6px 0 0;color:#597076">Your learner progress is available on Home. Site-owner and teacher reporting tools are not enabled for this account.</p>';
    }

    const selectedLearnerId = $('#apiLearner')?.value;
    $('#apiLearner').innerHTML = learners.length ? learners.map(l => `<option value="${l.id}">${esc(l.first_name)} | ages ${esc(l.age_band)}</option>`).join('') : '<option value="">Add a learner first</option>';
    if (learners.length) $('#apiLearner').value = learners.some(learner => learner.id === selectedLearnerId) ? selectedLearnerId : learners[0].id;
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

  let generationTimer = null;
  const generationButton = $('#apiCreate');
  const generationStatus = $('#apiGenerationStatus');
  const generationProgress = $('#apiGenerationProgress');
  const setGenerationProgress = (value, message) => {
    const percent = Math.min(100, Math.max(0, value));
    generationProgress.classList.remove('hidden');
    generationProgress.setAttribute('aria-valuenow', String(percent));
    generationProgress.querySelector('span').style.width = `${percent}%`;
    generationStatus.textContent = message;
  };

  $('#apiCreate').onclick = async () => {
    const learnerId = $('#apiLearner').value;
    const prompt = $('#apiPrompt').value.trim();
    const gradeLevel = $('#apiGradeLevel').value;
    const selectedStandard = $('#apiGoal').value;
    const selectedCurriculum = curriculumOptions.find(row => row.standard_code === selectedStandard);
    const domain = selectedCurriculum?.domain || 'comprehension';
    const theme = $('#apiTheme').value;
    const customTheme = $('#apiCustomTheme').value.trim();
    const storyLength = $('#apiStoryLength').value;
    if (!learnerId || !prompt) return notify('Choose a learner and add an adventure.');
    if (theme === 'Custom' && !customTheme) return notify('Name your story world first.');
    generationButton.disabled = true;
    generationButton.classList.remove('is-complete');
    generationButton.classList.add('is-generating');
    generationButton.querySelector('.story-generation-icon').textContent = '✦';
    generationButton.querySelector('strong').textContent = 'Creating your story...';
    setGenerationProgress(12, 'Setting the reading goal...');
    generationTimer = window.setInterval(() => {
      const current = Number(generationProgress.getAttribute('aria-valuenow') || 12);
      if (current < 86) {
        const next = current + (current < 45 ? 11 : 5);
        const messages = ['Shaping the adventure...', 'Writing pages for this reader...', 'Adding questions and useful words...'];
        setGenerationProgress(next, messages[Math.min(2, Math.floor(next / 35))]);
      }
    }, 900);
    try {
      const learner = learners.find(item => item.id === learnerId);
      const response = await api('/api/stories/generate', { method: 'POST', body: JSON.stringify({ learnerId, prompt, gradeLevel, domain, standardCode: selectedStandard, theme, customTheme, storyLength }) });
      if (!response.story) throw new Error('Story could not be generated.');
      window.clearInterval(generationTimer);
      generationTimer = null;
      setGenerationProgress(100, 'Story ready. Your reading adventure is complete.');
      generationProgress.classList.add('hidden');
      generationButton.disabled = false;
      generationButton.classList.remove('is-generating');
      generationButton.classList.add('is-complete');
      generationButton.querySelector('strong').textContent = 'Story ready';
      generationButton.querySelector('.story-generation-icon').textContent = '✓';
      $('#apiPrompt').value = '';
      await refresh();
      notify(`Story generated for ${learner?.first_name || 'learner'}.`);
    } catch (error) {
      window.clearInterval(generationTimer);
      generationTimer = null;
      generationButton.disabled = false;
      generationButton.classList.remove('is-generating');
      generationButton.querySelector('strong').textContent = 'Generate my story';
      generationStatus.textContent = 'Generation could not finish. Check the details and try again.';
      generationProgress.classList.add('hidden');
      notify(error.message);
    }
  };

  document.querySelectorAll('[data-api-view]').forEach(button => button.onclick = () => show(button.dataset.apiView));
  ['apiGradeLevel', 'apiGoal', 'apiTheme'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      if (id === 'apiGradeLevel') loadCurriculumOptions(el.value);
      if (id === 'apiGoal') {
        const selectedRow = curriculumOptions.find(row => row.standard_code === el.value);
        if (selectedRow) $('#apiGoalObjective').textContent = `${selectedRow.standard_code}: ${selectedRow.objective}`;
      }
      if (id === 'apiTheme') $('#apiCustomTheme').classList.toggle('hidden', el.value !== 'Custom');
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
