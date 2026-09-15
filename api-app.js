(() => {
  const appRoot = document.querySelector('.app');
  if (!appRoot) return;
  const token = localStorage.getItem('storySproutToken');
  if (!token) return;

  let parentConfirmationInFlight = null;
  const confirmParent = async () => {
    const existing = sessionStorage.getItem('storySproutParentConfirmation');
    if (existing) return existing;
    if (parentConfirmationInFlight) return parentConfirmationInFlight;
    parentConfirmationInFlight = (async () => {
      const password = window.prompt('Parent confirmation required. Enter the account password to continue:');
      if (!password) throw new Error('Parent confirmation was canceled.');
      const response = await fetch('/api/auth/confirm-parent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Parent confirmation failed.');
      sessionStorage.setItem('storySproutParentConfirmation', data.token);
      return data.token;
    })();
    try { return await parentConfirmationInFlight; } finally { parentConfirmationInFlight = null; }
  };
  window.__storySproutConfirmParent = confirmParent;

  const api = async (path, options = {}) => {
    const request = async () => fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(sessionStorage.getItem('storySproutParentConfirmation') ? { 'X-Parent-Confirmation': sessionStorage.getItem('storySproutParentConfirmation') } : {}),
        ...(options.headers || {}),
      },
    });
    let response = await request();
    let data = response.status === 204 ? null : await response.json();
    if (response.status === 403 && data?.code === 'PARENT_CONFIRMATION_REQUIRED' && !options.skipParentConfirmation) {
      await confirmParent();
      response = await request();
      data = response.status === 204 ? null : await response.json();
    }
    if (response.status === 401) {
      localStorage.removeItem('storySproutToken');
      localStorage.removeItem('storySproutAccount');
      location.reload();
      throw new Error('Session expired.');
    }
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  const app = document.querySelector('.app');
  const account = JSON.parse(localStorage.getItem('storySproutAccount') || '{}');
  const isChildSession = account.childMode === true || window.__storySproutChildMode === true;
  const restrictedChildViews = new Set(['learners', 'billing']);
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
    Castle: asset('images/banner/matheus-viana-uMgMukqE-pg-unsplash.jpg'),
    Garden: asset('images/banner/annie-spratt-faAef6F6luc-unsplash.jpg'),
    Sky: asset('images/banner/mana5280-lblkLbfWa-I-unsplash.jpg'),
    Space: asset('images/banner/banner01.jpg'),
    Dinosaurs: asset('images/banner/matheus-viana-uMgMukqE-pg-unsplash.jpg'),
    Arctic: asset('images/banner/reno-laithienne-odHhPgEgkWM-unsplash.jpg'),
    Farm: asset('images/banner/annie-spratt-faAef6F6luc-unsplash.jpg'),
    City: asset('images/banner/Designer.jpeg'),
    Jungle: asset('images/banner/shelby-murphy-figueroa-gGbS4kHj4Ho-unsplash.jpg'),
    Desert: asset('images/banner/mana5280-lblkLbfWa-I-unsplash.jpg'),
    Underwater: asset('images/banner/reno-laithienne-odHhPgEgkWM-unsplash.jpg'),
    Fairytale: asset('images/banner/matheus-viana-uMgMukqE-pg-unsplash.jpg'),
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
  let editingLearnerId = null;

  app.className = 'enterprise';
  app.innerHTML = `
    <style>.last-activity-card{border-left:4px solid var(--pine);background:linear-gradient(135deg,#fffdf8,#f4f8ee);padding:16px 17px;margin-bottom:18px}.last-activity-eyebrow{color:#b15c3b;font:700 11px/1.2 Arial,sans-serif;letter-spacing:1.5px}.last-activity-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.last-activity-heading h2{font-size:19px;margin:8px 0 0}.last-activity-date{margin:5px 0 0;color:#718080;font:12px Arial,sans-serif}.last-activity-mark{color:#c88455;font-size:22px}.last-activity-story{display:grid;gap:5px;margin:14px 0;padding:12px;border:1px solid #e4dfd0;background:#fffefb}.last-activity-story strong{font-size:16px;color:#294f55}.last-activity-story>span{color:#b15c3b;font:700 12px Arial,sans-serif}.last-activity-story p{margin:3px 0;color:#597076;font:13px/1.4 Arial,sans-serif}.last-activity-details{display:grid;gap:5px;margin-top:5px;color:#597076;font:12px/1.35 Arial,sans-serif}.last-activity-open{width:100%}.privacy-card{padding:18px}.privacy-card .trial-mascot{max-height:105px;object-fit:contain;margin:4px auto 0}.privacy-card .privacy-spark{margin-top:14px!important;padding-top:12px!important}.avoid-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}.avoid-options label{display:flex;align-items:center;gap:7px;padding:8px 9px;border:1px solid #e5d5bf;border-radius:5px;background:#fffdf9;color:#597076;font:12px Arial,sans-serif}.avoid-options input{accent-color:#2f6c50}@media(max-width:800px){.avoid-options{grid-template-columns:1fr)}.en-mark,.auth-mark{background-color:#db6f47;background-image:radial-gradient(circle at 5px 8px,#fff7ea 0 2px,transparent 2.5px),radial-gradient(circle at 12px 5px,#fff7ea 0 2px,transparent 2.5px),radial-gradient(circle at 18px 5px,#fff7ea 0 2px,transparent 2.5px),radial-gradient(circle at 24px 8px,#fff7ea 0 2px,transparent 2.5px),radial-gradient(ellipse at 5px 15px,#fff7ea 0 3px,transparent 3.5px),radial-gradient(ellipse at 12px 12px,#fff7ea 0 3px,transparent 3.5px),radial-gradient(ellipse at 18px 12px,#fff7ea 0 3px,transparent 3.5px),radial-gradient(ellipse at 24px 15px,#fff7ea 0 3px,transparent 3.5px)}.en-mark:after,.auth-mark:after{content:'';position:absolute;width:7px;height:10px;border:2px solid #db6f47;border-left-color:#fff7ea;border-bottom-color:#fff7ea;border-radius:100% 0;left:10px;top:13px;transform:rotate(35deg);background:#fff7ea}</style>
    <style>.next-actions-card{padding:14px 15px;border:1px solid #e5d5bf;background:#fffdf9}.next-actions-card h3{margin:7px 0 4px;color:#294f55;font-size:18px}.next-actions-card p{margin:0 0 12px;color:#597076;font:13px/1.4 Arial,sans-serif}.next-actions-card button{width:100%}.onboarding-progress{display:grid;gap:4px;margin-bottom:14px;color:#597076;font:13px/1.4 Arial,sans-serif}.onboarding-progress strong{color:#294f55;font-size:16px}.en-stat.is-done{background:#edf7ea}.weekly-return-hero{margin:20px 0;border:2px solid #ccd8c7;background:linear-gradient(135deg,#ffffff 0%,#f5f9f2 100%);box-shadow:0 6px 18px rgba(36,76,83,0.06);border-radius:12px;padding:22px}.weekly-return-eyebrow{color:#b15c3b;font:800 12px/1.2 Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase}.weekly-return-header-row{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}.weekly-return-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.weekly-return-action{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;text-align:left;padding:16px;border:1.5px solid #d5dfd1;border-radius:10px;background:#fff;color:#244c53;cursor:pointer;transition:all .18s ease;box-shadow:0 2px 6px rgba(0,0,0,0.03)}.weekly-return-action:hover{border-color:#3c7a56;background:#f2f7ed;transform:translateY(-2px);box-shadow:0 6px 14px rgba(47,108,80,0.12)}.weekly-return-number{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#dff0df;color:#1e5a39;font:800 15px Arial,sans-serif;flex-shrink:0}.weekly-return-action strong{font:800 15px Arial,sans-serif;color:#20454c;display:block}.weekly-return-action small{margin-top:4px;color:#597076;font:13px/1.4 Arial,sans-serif;display:block}.weekly-return-arrow{color:#c45f3f;font:800 18px Arial,sans-serif}.weekly-return-summary{margin-top:22px;border:1.5px solid #d4ddd1;border-radius:14px;background:#f5f8f3;padding:20px 22px;display:grid;gap:16px}.weekly-vocab-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.weekly-vocab-chip{display:inline-flex;align-items:center;padding:6px 12px;border-radius:20px;background:#eef6ec;color:#235d3d;font:700 13px Arial,sans-serif;border:1px solid #cce0c9}.weekly-story-item{padding:12px 14px;margin-bottom:10px;border-radius:9px;background:#fff;border:1px solid #e3ebe1;display:grid;gap:4px}.weekly-story-item:last-child{margin-bottom:0}@media(max-width:800px){.weekly-return-actions{grid-template-columns:1fr}}</style>
    <header class="en-header">
      <button class="en-brand" id="apiHome"><span class="en-mark"></span>Story Sprout</button>
      <nav class="en-nav">
        <button data-api-view="home" class="active">Home</button>
        <button data-api-view="weekly">Last week review</button>
        <button data-api-view="learners">Learners</button>
        <button id="apiProgressNav" data-api-view="progress">Progress</button>
        <button data-api-view="billing">Plans & billing</button>
        <button data-api-view="guide">Parent guide</button>
      </nav>
      <div style="display:flex;gap:8px">
        <button class="en-family" id="apiChildMode" title="Open a restricted learner reading space">Child Mode</button>
        <button class="en-family" id="apiClearCache" title="Clear cache">Clear cache</button>
        <button class="en-family" id="apiLogout">Sign out</button>
      </div>
    </header>
    <main class="en-main">
      <section id="apiHomeView">
        <div class="en-eyebrow">SECURE FAMILY WORKSPACE</div>
        <h1 class="en-title">Welcome, ${esc(account.displayName || 'Reader')}.</h1>
        <p class="en-lede">Story Sprout helps parents and children create personalized stories that build reading skills, confidence, and a love of books.</p>
        <p class="content-notice" style="margin:12px 0 20px;padding:11px 13px;border-left:4px solid #c88455;background:#fff8ed;color:#597076;font:13px/1.45 Arial,sans-serif"><strong>AI-generated content:</strong> Stories, questions, and vocabulary are created with AI for reading practice. Parents should review each story before sharing it with a child.</p>

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
              <select id="apiGradeLevel" class="en-select" aria-label="Grade level"><option value="PreK">PreK</option><option value="K">K</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select><p id="apiGradeBandNote" class="book-modal-meta" style="margin:8px 0 0;text-transform:none;letter-spacing:0;line-height:1.45"></p>
            </div>
            <div style="width:100%;margin-top:22px;padding-top:16px;border-top:1px solid #e7d9c4">
              <label class="en-label">Reading skill for this grade</label>
              <select id="apiGoal" class="en-select"><option value="comprehension">Comprehension</option><option value="vocabulary">Vocabulary</option><option value="fluency">Fluency</option><option value="phonics">Phonics</option><option value="oral_language">Oral Language</option><option value="writing_response">Writing Response</option><option value="social_emotional_reading">Reading Confidence & SEL</option></select>
              <p id="apiGoalObjective" class="book-modal-meta" style="margin:8px 0 0;text-transform:none;letter-spacing:0;line-height:1.45"></p>
              <p class="book-modal-meta" style="margin:7px 0 0;text-transform:none;letter-spacing:0">The code identifies the practice area; the sentence above explains the skill in family-friendly language. Curriculum alignment is an instructional aid pending qualified educator review.</p>
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
          <aside class="en-card trial privacy-card">
            <section id="apiLastActivity" class="last-activity-card hidden"></section>
            <section id="apiNextActions" class="next-actions-card" style="margin-bottom:18px"></section>
            <span class="en-badge" id="apiPlanBadge">PLAN</span>
            <h2 style="margin-top:14px">Private by design.</h2>
            <p>Only the signed-in parent can access learner profiles and stories.</p>
            <img src="${asset('images/Speak/speakpanda.png')}" class="trial-mascot" alt="Friendly reading panda">
            <div id="apiPricingOffer" style="margin-top:10px;font-size:13px"></div><p class="print-notice" style="margin:10px 0 0;color:#fff;font:12px/1.4 Arial,sans-serif"><strong>Printed storybooks are coming later.</strong> Digital stories are available now.</p>
            <div class="privacy-spark" style="border-top:1px solid #e5d5bf">
              <div class="en-eyebrow">A READING SPARK</div>
              <p id="apiReadingSpark" style="margin:7px 0 0;color:#fff;font-size:17px;line-height:1.4"></p>
            </div>
          </aside>
        </div>

        <section class="en-card" style="margin-top:20px">
          <h2>Saved stories</h2>
          <p class="book-modal-meta" style="margin:0 0 12px;text-transform:none;letter-spacing:0">Your most recent reports appear at the top.</p>
          <input id="apiStorySearch" class="en-input" type="search" placeholder="Search stories by title, learner, world, or standard" aria-label="Search saved stories" style="margin-bottom:14px">
          <div class="story-list-head" style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(120px,.8fr) auto;gap:16px;padding:0 0 8px;border-bottom:2px solid #e7d9c4;color:#597076;font:700 11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase"><span>Story</span><span>Learner</span><span>Actions</span></div>
          <div id="apiStoryList" class="story-list"></div>
        </section>

        <section id="apiDeletedStoriesCard" class="en-card deleted-stories-card" style="margin-top:20px">
          <div class="deleted-stories-heading"><div><div class="en-eyebrow">RECOVERY</div><h2>Recently deleted</h2><p>Restore a story within 30 days, or permanently remove it.</p></div><span class="deleted-stories-mark">↺</span></div>
          <div id="apiDeletedStories" class="deleted-stories-list"></div>
        </section>

        <section class="en-card story-shelf-card" style="margin-top:20px">
          <div class="story-shelf-heading"><div><div class="en-eyebrow">YOUR STORY SHELF</div><h2>Keep the stories that matter.</h2><p>Favorite a story, leave a rating, or pick up where you stopped reading.</p></div><span class="story-shelf-mark">✦</span></div>
          <div id="apiStoryShelf" class="story-shelf-grid"></div>
        </section>

        <section class="en-card" style="margin-top:20px">
          <div class="en-eyebrow">FOR FAMILIES</div>
          <h2>How Story Sprout supports reading</h2>
          <p class="en-lede" style="font-size:15px;margin-top:8px">We turn reading practice into a story a child can understand, talk about, and return to.</p>
          <div class="en-stat-grid" style="margin-top:18px">
            <div class="en-stat"><strong>1</strong><span><b>Start with the right goal.</b><br>Choose a grade and a U.S. reading benchmark so the story has a clear learning purpose.</span></div>
            <div class="en-stat"><strong>2</strong><span><b>Practice through a story.</b><br>AI adjusts the language, sentence length, questions, and vocabulary for the selected grade.</span></div>
            <div class="en-stat"><strong>3</strong><span><b>Notice growth together.</b><br>Parents can listen, discuss the story, review difficult words, and follow completed reading work.</span></div>
          </div>
          <p style="margin:18px 0 0;color:#597076;font:13px/1.5 Arial,sans-serif">Our approach is conversation-first: the goal is not to rush a child through a score, but to help them build confidence, understanding, and a lasting relationship with reading.</p>
        </section>

        <section class="en-card" style="margin-top:20px">
          <div class="en-eyebrow">CURRICULUM GUIDE</div>
          <h2>What do the reading codes mean?</h2>
          <p class="en-lede" style="font-size:15px;margin-top:8px">Each story is connected to a reading practice objective. The code helps parents and teachers identify the skill; the story gives children a friendly way to practice it. These connections are instructional aids and should be reviewed by a qualified educator before being used for school decisions.</p>
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
          <div id="apiProgressBars" class="progress-bars"></div>
          <div id="apiAchievements" class="achievement-row"></div>
          <div id="apiHabit" class="habit-card"></div>
          <div id="apiLearnerReport" class="learner-report-grid"></div>
          <div id="apiAiStatus" style="margin-top:10px"></div>
          <div id="apiReminderOpt" style="margin-top:10px"></div>
          <button id="apiDownloadProgress" class="en-outline" type="button" style="margin-top:14px">Download progress snapshot</button>
        </section>

      </section>

      <section id="apiWeeklyView" class="hidden">
        <div class="weekly-return-eyebrow">LAST WEEK'S LEARNING</div>
        <h1 class="en-title">Learning snapshot & review.</h1>
        <p class="en-lede">Review completed reading work, explore new vocabulary words, and revisit the stories covered last week.</p>

        <section class="en-card" style="margin-top:20px;border:1.5px solid #d8dfd5;background:#ffffff">
          <div id="apiWeeklyPageContent"></div>
        </section>
      </section>

      <section id="apiGuideView" class="hidden">
        <div class="en-eyebrow">PARENT GUIDE</div>
        <h1 class="en-title">How Story Sprout works.</h1>
        <p class="en-lede">Parents guide the learning. Children bring the imagination. Use this quick guide to create a story, read it together, and see what the child understood.</p>
        <div class="en-grid" style="margin-top:30px">
          <section class="en-card">
            <h2>Start here</h2>
            <ol style="font:15px/1.65 Arial,sans-serif;color:#597076;padding-left:22px">
              <li>Add a learner and choose an age range.</li>
              <li>Edit the learner's name, interests, or topics to avoid when needed.</li>
              <li>Choose a grade and reading skill.</li>
              <li>Choose a story world and adventure together.</li>
              <li>Select Quick read, Standard story, or Longer adventure.</li>
              <li>Generate the story and read or listen together.</li>
              <li>Answer the multiple-choice questions and check the score.</li>
              <li>Choose a next reading step from the weekly menu.</li>
            </ol>
          </section>
          <section class="en-card">
            <h2>What the score means</h2>
            <p>The score shows how many questions the child answered correctly from that story. It is useful practice feedback, not a complete reading assessment.</p>
            <p>Use <strong>Try again</strong> to repeat the questions, or <strong>Close</strong> to finish the activity.</p>
            <p>A positive result is evidence from one story activity. It is not automatic proof of overall reading mastery.</p>
          </section>
        </div>
        <section class="en-card" style="margin-top:20px">
          <h2>Keep reading going</h2>
          <p>After a story, the Home page offers a weekly reading menu based on the selected learner's saved activity.</p>
          <div class="en-stat-grid" style="margin-top:16px">
            <div class="en-stat"><strong>1</strong><span>Continue an unfinished story.</span></div>
            <div class="en-stat"><strong>2</strong><span>Practice the same reading goal again.</span></div>
            <div class="en-stat"><strong>3</strong><span>Review vocabulary from the latest story.</span></div>
            <div class="en-stat"><strong>4</strong><span>Create a follow-up adventure in the same world.</span></div>
          </div>
          <p style="margin-top:14px;color:#597076;font:13px/1.5 Arial,sans-serif">Grades 6-8 also receive an evidence and perspective challenge with deeper reasoning.</p>
        </section>
        <section class="en-card" style="margin-top:20px">
          <h2>What the reading code means</h2>
          <p>Each story uses a grade-level reading objective. The plain-English objective explains the skill; the code helps identify the curriculum area.</p>
          <div class="en-stat-grid" style="margin-top:16px">
            <div class="en-stat"><strong>RF</strong><span>Reading Foundational Skills</span></div>
            <div class="en-stat"><strong>RL</strong><span>Reading Literature</span></div>
            <div class="en-stat"><strong>RI</strong><span>Reading Informational Text</span></div>
            <div class="en-stat"><strong>L / W</strong><span>Language / Writing</span></div>
          </div>
          <p style="margin-top:14px;color:#597076;font:13px/1.5 Arial,sans-serif">For Grades 6-8, stories may be longer and include richer vocabulary, evidence, perspective, theme, structure, tone, and author craft.</p>
        </section>
        <section class="en-card" style="margin-top:20px">
          <h2>Save and share privately</h2>
          <p>Parents can download a framed story PDF containing the learner name, date, reading focus, story pages, vocabulary, questions, Story Sprout branding, and a story-check note.</p>
          <p>Parents can also download a private progress snapshot. Story Sprout does not create public child profiles or public achievement links.</p>
        </section>
        <section class="en-card" style="margin-top:20px">
          <h2>Plans, privacy, and support</h2>
          <p><strong>Plans & billing:</strong> View plans, start checkout when configured, and cancel through parent password and one-time email confirmation. Cancellation stops renewal but does not delete learner data.</p>
          <p><strong>Privacy & data:</strong> Export data, review vendor and AI information, delete a learner, or request full account deletion. Learner deletion and account deletion require clear in-page confirmation.</p>
          <p><strong>Support:</strong> Use the in-page Support form for account, billing, privacy, story safety, or technical questions. Never send passwords, card numbers, or secret keys.</p>
        </section>
        <section class="en-card" style="margin-top:20px">
          <h2>Keep parents in control</h2>
          <p>Review AI-generated stories before using them, supervise the child's use, and avoid entering unnecessary sensitive information. Children do not create accounts. Privacy & data settings let you export or delete account and learner data.</p>
        </section>
      </section>

      <section id="apiProgressView" class="hidden">
        <div class="en-eyebrow">PARENT & EDUCATOR PROGRESS TOOLS</div>
        <h1 class="en-title">Progress and school tools.</h1>
        <p class="en-lede">Review business signals, export classroom progress, and manage parent and educator reporting here.</p>
        <div id="apiProgressNotice" class="en-card" style="margin-top:20px"></div>
        <div id="apiProgressDestination"></div>
      </section>

      <section id="apiLearnersView" class="hidden">
        <div class="en-eyebrow">LEARNER PROFILES</div>
        <h1 class="en-title">Your readers.</h1>
        <div class="en-grid">
          <section class="en-card"><h2>Saved learners</h2><div id="apiLearnerList" class="student-list"></div></section>
          <form id="apiLearnerForm" class="en-card">
            <h2 id="apiLearnerFormTitle">Add a learner</h2>
            <label class="en-label">First name</label><input id="apiFirstName" class="en-input" maxlength="32" required>
            <div class="en-form-grid"><div><label class="en-label">Age range</label><select id="apiAgeBand" class="en-select"><option value="3-5">Ages 3-5</option><option value="6-8">Ages 6-8</option><option value="9-11">Ages 9-11</option></select></div><div><label class="en-label">Interests</label><input id="apiInterests" class="en-input" maxlength="160"></div></div>
            <label class="en-label">Topics to avoid</label><p class="book-modal-meta" style="margin:0 0 8px;text-transform:none;letter-spacing:0">Optional. Add phobias, sensitivities, or topics connected to your child's personal experiences.</p><input id="apiAvoid" class="en-input" maxlength="160" placeholder="For example: dogs, hospitals, or stories about parents leaving"><p class="book-modal-meta" style="margin:8px 0 0;text-transform:none;letter-spacing:0;line-height:1.45">Story Sprout also uses safety filters, age-appropriate guidance, and parent review reminders. Read more in <strong>Privacy & data</strong> in the header.</p>
            <button class="en-button" style="width:100%;margin-top:18px">Save learner</button><button id="apiCancelLearnerEdit" class="en-outline hidden" type="button" style="width:100%;margin-top:8px">Cancel editing</button>
          </form>
        </div>
      </section>

      <section id="apiBillingView" class="hidden">
        <div class="en-eyebrow">PLANS AND BILLING</div>
        <h1 class="en-title">Choose the right shelf size.</h1>
        <p class="en-lede">Choose a free demo or start a monthly subscription through Stripe.</p>
        <p style="margin:12px 0 20px;color:#597076;font:13px/1.45 Arial,sans-serif">Canceling stops future renewal but does not delete learner profiles, stories, or reading progress. Cancellation does not automatically issue a prorated refund for the current billing period. Billing errors, duplicate charges, accidental renewals, or service problems can be reviewed through Support. <button type="button" class="en-outline" id="apiBillingPrivacy" style="margin-left:6px;padding:6px 9px">Manage Privacy & data</button></p>
        <div class="plan-grid">
          <article class="plan"><h3>Explorer</h3><div class="plan-price">Free</div><p>One learner with limited monthly story creation.</p><button class="en-outline apiPlan" data-plan="explorer">Choose Explorer demo</button></article>
          <article class="plan"><h3>Individual</h3><div class="plan-price">$10 <small>/ month</small></div><p>One learner with generous story creation and reading tools.</p><button class="en-outline apiPlan" data-plan="individual">Choose Individual demo</button><button class="en-outline apiCheckout" data-plan="individual" style="margin-top:8px">Start paid checkout</button></article>
          <article class="plan selected"><h3>Family</h3><div class="plan-price"><span id="apiFamilyPrice">$15</span> <small>/ month</small></div><p>Up to two learners. Add learners for $2/month each.</p><button class="en-button apiPlan" data-plan="family">Choose Family demo</button><button class="en-outline apiCheckout" data-plan="family" style="margin-top:8px">Start paid checkout</button></article>
          <article class="plan"><h3>Classroom</h3><div class="plan-price">$29 <small>/ month</small></div><button class="en-outline apiPlan" data-plan="classroom">Choose Classroom demo</button><button class="en-outline apiCheckout" data-plan="classroom" style="margin-top:8px">Start paid checkout</button></article>
        </div>
        <div class="en-card" style="margin-top:20px"><h2>Subscription</h2><p id="apiBillingStatus"></p><p style="color:#597076;font:13px/1.45 Arial,sans-serif">Refund policy draft: cancellation stops future renewal. It does not automatically refund the current billing period. Contact Support for duplicate charges, billing errors, accidental renewals, or service problems. Applicable law always applies.</p><div id="apiCancelPanel" class="hidden" style="margin-top:16px;padding:16px;border:1px solid #dfb9a8;border-radius:8px;background:#fff7f2"><h3 style="margin:0 0 7px;color:#8f352b">Before you cancel</h3><p style="margin:0;color:#597076;font:14px/1.5 Arial,sans-serif">Your learner profiles, stories, and progress will remain saved. No future renewal will be charged after the parent confirms through email.</p><label class="en-label" style="margin-top:12px">Current password</label><input id="apiCancelPassword" class="en-input" type="password" autocomplete="current-password"><label class="en-label" style="margin-top:12px">Why are you canceling? <span style="font-weight:400">Optional</span></label><select id="apiCancelReason" class="en-select"><option value="">Choose a reason</option><option>Too expensive</option><option>Not using it right now</option><option>Needs a different learning experience</option><option>Technical problem</option><option>Other</option></select><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px"><button type="button" class="en-outline" id="apiKeepSubscription">Keep my plan</button><button type="button" class="en-button" id="apiConfirmCancel">Send confirmation email</button></div><p id="apiCancelError" role="alert" style="margin:10px 0 0;color:#a63e31;font:13px Arial,sans-serif"></p></div><button type="button" class="en-outline" id="apiStartCancel" style="margin-top:12px">Cancel subscription</button></div>
      </section>
    </main>
    <div id="apiToast" class="toast" role="status" aria-live="polite"></div>
  `;

  if (isChildSession) {
    $('#apiChildMode')?.classList.add('hidden');
    document.querySelector('[data-api-view="learners"]')?.classList.add('hidden');
    document.querySelector('[data-api-view="billing"]')?.classList.add('hidden');
  }

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
    if (isChildSession && restrictedChildViews.has(name)) return;
    ['Home', 'Weekly', 'Learners', 'Progress', 'Billing', 'Guide'].forEach(part => {
      const el = $(`#api${part}View`);
      if (el) el.classList.toggle('hidden', part.toLowerCase() !== name);
    });
    document.querySelectorAll('[data-api-view]').forEach(button => button.classList.toggle('active', button.dataset.apiView === name));
  };

  const openChildModeSetup = async () => {
    const existing = document.querySelector('#apiChildModeDialog');
    if (existing) return;
    const learnerOptions = learners.length
      ? learners.map(learner => `<option value="${esc(learner.id)}">${esc(learner.first_name)} | ages ${esc(learner.age_band)}</option>`).join('')
      : '<option value="">Add a learner first</option>';
    const dialog = document.createElement('div');
    dialog.id = 'apiChildModeDialog';
    dialog.className = 'learner-delete-overlay';
    dialog.innerHTML = `<style>#apiChildModeDialog{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(20,63,74,.38);box-sizing:border-box}#apiChildModeDialog *{box-sizing:border-box}#apiChildModeDialog .child-mode-dialog{width:min(540px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:26px;background:#fffdf9;border:1px solid #cbdcc9;border-radius:10px;box-shadow:0 20px 50px rgba(20,63,74,.25)}#apiChildModeDialog h2{margin:8px 0;color:#294f55}#apiChildModeDialog p{color:#597076;font:14px/1.5 Arial,sans-serif}#apiChildModeDialog .child-mode-note{padding:12px;background:#eef6ec;border-left:4px solid #3c7a56}#apiChildModeDialog .child-mode-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}#apiChildModeDialog .child-mode-error{min-height:18px;color:#a63e31;font:13px Arial,sans-serif}</style><section class="child-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="childModeTitle"><div class="last-activity-eyebrow">PARENT CONTROL</div><h2 id="childModeTitle">Set up Child Mode</h2><p class="child-mode-note">Child Mode gives one learner a focused reading shelf. Billing, learner management, account settings, exports, story generation, and other parent tools stay locked on the server.</p><label class="en-label" for="childModeLearner">Learner</label><select id="childModeLearner" class="en-select">${learnerOptions}</select><label class="en-label" for="childModePin" style="margin-top:12px">Child Mode PIN</label><input id="childModePin" class="en-input" inputmode="numeric" autocomplete="new-password" minlength="6" maxlength="8" pattern="[0-9]{6,8}" placeholder="6 to 8 numbers"><p style="margin:7px 0 0;font-size:12px">Choose a PIN your child will not guess. This is different from the account password.</p><p id="childModeError" class="child-mode-error" role="alert"></p><div class="child-mode-actions"><button type="button" class="en-outline" id="childModeCancel">Cancel</button><button type="button" class="en-outline" id="childModeSave">Save PIN</button><button type="button" class="en-button" id="childModeLaunch">Enter Child Mode</button></div></section>`;
    document.body.appendChild(dialog);
    const close = () => dialog.remove();
    dialog.querySelector('#childModeCancel').onclick = close;
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    const learnerSelect = dialog.querySelector('#childModeLearner');
    const pinInput = dialog.querySelector('#childModePin');
    const error = dialog.querySelector('#childModeError');
    const savePin = async () => {
      const pin = pinInput.value.trim();
      if (!/^\d{6,8}$/.test(pin)) { error.textContent = 'Use 6 to 8 numbers for the PIN.'; return false; }
      try {
        await api('/api/child-mode/settings', { method: 'POST', body: JSON.stringify({ pin }) });
        error.textContent = 'PIN saved. Your child can now enter the selected reading space.';
        return true;
      } catch (requestError) { error.textContent = requestError.message; return false; }
    };
    dialog.querySelector('#childModeSave').onclick = savePin;
    dialog.querySelector('#childModeLaunch').onclick = async () => {
      error.textContent = '';
      const learnerId = learnerSelect.value;
      const pin = pinInput.value.trim();
      if (!learnerId) { error.textContent = 'Add a learner before entering Child Mode.'; return; }
      if (!/^\d{6,8}$/.test(pin)) { error.textContent = 'Enter the Child Mode PIN.'; return; }
      const launchButton = dialog.querySelector('#childModeLaunch');
      launchButton.disabled = true;
      try {
        const response = await fetch('/api/auth/child-mode', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ learnerId, pin }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Unable to enter Child Mode.');
        sessionStorage.setItem('storySproutParentToken', token);
        sessionStorage.setItem('storySproutParentAccount', JSON.stringify(account));
        sessionStorage.removeItem('storySproutParentConfirmation');
        localStorage.setItem('storySproutToken', result.token);
        localStorage.setItem('storySproutAccount', JSON.stringify({ childMode: true, learner: result.learner }));
        location.reload();
      } catch (requestError) { error.textContent = requestError.message; launchButton.disabled = false; }
    };
    pinInput.focus();
  };

  const renderOnboarding = (subscription) => {
    const doneLearner = learners.length > 0;
    const doneStory = stories.length > 0;
    const donePlan = ['demo', 'active'].includes(subscription.status) && ['individual', 'family', 'classroom'].includes(subscription.plan);
    $('#apiOnboarding').innerHTML = `<div class="onboarding-progress"><strong>${[doneLearner, doneStory, donePlan].filter(Boolean).length} of 3 started</strong><span>Build a learner, make a story, then choose the plan that fits your family.</span></div><div class="en-stat-grid"><button type="button" class="en-stat apiStartStep ${doneLearner ? 'is-done' : ''}" data-step="learner"><strong>${doneLearner ? '✓' : '1'}</strong><span>${doneLearner ? 'Learner added' : 'Add a learner'}</span></button><button type="button" class="en-stat apiStartStep ${doneStory ? 'is-done' : ''}" data-step="story"><strong>${doneStory ? '✓' : '2'}</strong><span>${doneStory ? 'First story created' : 'Create your first story'}</span></button><button type="button" class="en-stat apiStartStep ${donePlan ? 'is-done' : ''}" data-step="plan"><strong>${donePlan ? '✓' : '3'}</strong><span>${donePlan ? 'Plan selected' : 'Choose a plan'}</span></button></div>`;
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
    const gradeBandNote = $('#apiGradeBandNote');
    const selectedStandard = $('#apiGoal')?.value || '';
    const storyLength = $('#apiStoryLength');
    const domain = curriculumOptions.find(row => row.standard_code === selectedStandard)?.domain || selectedStandard || 'comprehension';
    const themeImage = $('#apiThemeImage');
    const gradeBadge = $('#apiGradeBadge');
    const domainIcon = $('#apiDomainIcon');
    if (themeImage) themeImage.src = themeBannerMap[theme] || themeBannerMap.Moonlight;
    if (gradeBadge) gradeBadge.src = gradeBadgeMap[gradeLevel] || gradeBadgeMap['2'];
    if (domainIcon) domainIcon.src = domainIconMap[domain] || domainIconMap.comprehension;
    if (gradeBandNote) gradeBandNote.textContent = ['6', '7', '8'].includes(gradeLevel)
      ? 'Middle school mode: longer reading, richer vocabulary, evidence-based questions, perspective, and deeper reasoning.'
      : 'The story language and questions adjust to the selected reading level.';
    if (storyLength) {
      const middleLabels = { quick: 'Focused reading', standard: 'Full story', long: 'Deep dive' };
      const youngerLabels = { quick: 'Quick read', standard: 'Standard story', long: 'Longer adventure' };
      [...storyLength.options].forEach(option => { option.textContent = ['6', '7', '8'].includes(gradeLevel) ? middleLabels[option.value] : youngerLabels[option.value]; });
    }
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
      const detail = [s.content?.meta?.customTheme || s.theme || '', s.learning_goal || '', gradeLabel, domainLabel].filter(Boolean).join(' • ');
      return `<div class="story-row" style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(120px,.8fr) auto;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid #eee"><div><div style="font-weight:700">${esc(s.title)}</div><div style="font-size:12px;color:#666">${esc(detail)}${s.created_by ? ` • generated by ${esc(friendlySource(s.created_by))}` : ''}</div>${createdTimeLabel ? `<div style="font-size:10px;color:#888;margin-top:2px">Created ${esc(createdTimeLabel)}</div>` : ''}<div style="font-size:10px;color:#888;margin-top:2px">Story ID: ${esc(s.id)}</div>${objectiveLabel ? `<div style="font-size:11px;color:#888;margin-top:2px">Objective: ${esc(objectiveLabel)}</div>` : ''}</div><div style="font-weight:700;color:#315b40">${esc(s.learner_name || 'Unassigned')}</div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="open-story en-button" data-id="${s.id}" style="min-width:86px">Open</button>${!isChildSession ? `<button class="delete-story en-outline" data-id="${s.id}" style="min-width:86px">Delete</button>` : ''}</div></div>`;
    }).join('');
    document.querySelectorAll('.open-story').forEach(btn => {
      btn.onclick = () => {
        const st = stories.find(x => x.id === btn.dataset.id);
        if (st) openServerStory(st);
      };
    });
    document.querySelectorAll('.delete-story').forEach(btn => {
      btn.onclick = async () => {
        const story = stories.find(item => item.id === btn.dataset.id);
        if (!story || !window.confirm(`Delete "${story.title}" from your saved stories?`)) return;
        try {
          await api(`/api/stories/${encodeURIComponent(story.id)}`, { method: 'DELETE' });
          stories = stories.filter(item => item.id !== story.id);
          renderStoryList();
          notify('Story deleted from your saved stories.');
        } catch (error) {
          notify(error.message);
        }
      };
    });
  }

  function renderStoryShelf(shelfData) {
    const container = $('#apiStoryShelf');
    if (!container) return;
    const favorites = shelfData?.favorites || [];
    const topRated = shelfData?.topRated || [];
    const card = story => `<button type="button" class="story-shelf-story" data-shelf-story-id="${esc(story.id)}"><span class="story-shelf-story-title">${esc(story.title)}</span><span class="story-shelf-story-meta">For ${esc(story.learner_name || 'your reader')}</span><span class="story-shelf-rating">${story.average_rating ? `★ ${Number(story.average_rating).toFixed(1)} · ${story.rating_count} ratings` : 'Not rated yet'}</span></button>`;
    container.innerHTML = `<div class="story-shelf-column"><div class="story-shelf-label">★ Favorites</div>${favorites.length ? favorites.map(card).join('') : '<p class="story-shelf-empty">Favorite stories will appear here.</p>'}</div><div class="story-shelf-column"><div class="story-shelf-label">✦ Top rated</div>${topRated.length ? topRated.map(card).join('') : '<p class="story-shelf-empty">A story needs two ratings before it appears here.</p>'}</div>`;
    container.querySelectorAll('[data-shelf-story-id]').forEach(button => button.onclick = () => { const story = stories.find(item => item.id === button.dataset.shelfStoryId); if (story) openServerStory(story); });
  }

  function renderDeletedStories(deletedStories) {
    const card = $('#apiDeletedStoriesCard');
    const container = $('#apiDeletedStories');
    if (!card || !container) return;
    if (isChildSession) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    container.innerHTML = deletedStories.length ? deletedStories.map(story => `<div class="deleted-story-row"><div><strong>${esc(story.title)}</strong><span>For ${esc(story.learner_name || 'your reader')} · Deleted ${esc(formatStoryDate(story.deleted_at))}</span></div><div class="deleted-story-actions"><button type="button" class="en-outline restore-story" data-id="${esc(story.id)}">Restore</button><button type="button" class="deleted-permanent permanent-delete-story" data-id="${esc(story.id)}">Delete forever</button></div></div>`).join('') : '<p class="deleted-stories-empty">Deleted stories will appear here for recovery.</p>';
    container.querySelectorAll('.restore-story').forEach(button => button.onclick = async () => {
      try { await api(`/api/stories/${encodeURIComponent(button.dataset.id)}/restore`, { method: 'PATCH' }); await refresh(); notify('Story restored to Saved stories.'); } catch (error) { notify(error.message); }
    });
    container.querySelectorAll('.permanent-delete-story').forEach(button => button.onclick = async () => {
      if (!window.confirm('Permanently delete this story? This cannot be undone.')) return;
      try { await api(`/api/stories/${encodeURIComponent(button.dataset.id)}/permanent`, { method: 'DELETE' }); await refresh(); notify('Story permanently deleted.'); } catch (error) { notify(error.message); }
    });
  }

  $('#apiStorySearch').addEventListener('input', renderStoryList);
  $('#apiLearner').addEventListener('change', event => {
    const val = event.target.value;
    const weeklySelect = $('#apiWeeklyPageLearner');
    if (weeklySelect && weeklySelect.value !== val) weeklySelect.value = val;
    renderLastActivity(window.__storySproutProgressLearners || [], val);
    renderNextActions(window.__storySproutProgressLearners || [], val);
    renderWeeklyReturnActions(window.__storySproutProgressLearners || [], val);
  });
  $('#apiWeeklyPageLearner')?.addEventListener('change', event => {
    const val = event.target.value;
    const homeSelect = $('#apiLearner');
    if (homeSelect && homeSelect.value !== val) homeSelect.value = val;
    renderLastActivity(window.__storySproutProgressLearners || [], val);
    renderNextActions(window.__storySproutProgressLearners || [], val);
    renderWeeklyReturnActions(window.__storySproutProgressLearners || [], val);
  });
  $('#apiGoToWeeklyPage')?.addEventListener('click', () => {
    show('weekly');
    const curLearner = $('#apiLearner')?.value;
    const weeklySelect = $('#apiWeeklyPageLearner');
    if (weeklySelect && curLearner) weeklySelect.value = curLearner;
    renderWeeklyReturnActions(window.__storySproutProgressLearners || [], curLearner);
  });
  $('#apiWeeklyCreateBtn')?.addEventListener('click', () => {
    show('home');
    $('#apiPrompt')?.focus();
  });

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
    const adultEditorMarkup = earlyReader ? '' : '<section class="book-modal-edit"><h3 class="book-modal-subtitle">Parent story editor</h3><p class="book-modal-meta">Use AI to adjust this story while keeping its reading level and learning goal.</p><form id="apiStoryRevision"><label class="en-label" for="apiRevisionPrompt">What should change?</label><textarea id="apiRevisionPrompt" class="en-input" rows="3" maxlength="500" placeholder="Make the ending more surprising, but keep the same reading skill." required></textarea><button type="submit" class="en-outline" style="margin-top:10px">Revise this story</button></form></section>';
    const assessmentMarkup = '<h3 class="book-modal-subtitle">Check understanding</h3><form id="apiStoryAssessment" class="book-modal-list"></form><div id="apiAssessmentResult" class="assessment-result" aria-live="polite"></div>';
    const modalMeta = [story.learner_name || '', story.content?.meta?.customTheme || story.theme || '', story.learning_goal || '', modalGrade, modalDomain].filter(Boolean).join(' • ');
    const modalCreated = formatStoryDate(story.created_at);
    const modalGradeBadge = gradeBadgeMap[story?.content?.meta?.gradeLevel] || gradeBadgeMap['2'];
    inner.innerHTML = `<div class="book-modal-head"><div><div class="book-modal-meta" style="margin:0 0 5px">Story time</div><h2 class="book-modal-title">${esc(story.title)}</h2></div><button id="closeApiStory" class="en-outline">Close</button></div><img class="book-modal-hero" src="${themeBannerMap[story.theme] || themeBannerMap.Moonlight}" alt="Story illustration"><div class="reader-toolbar" role="toolbar" aria-label="Story reading controls" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px;padding:10px;background:#eef5ec;border-radius:8px"><button id="apiReadPage" type="button" class="en-button">Read this page</button><button id="apiReadStory" type="button" class="en-outline">Read story</button><button id="apiStopReading" type="button" class="en-outline">Stop</button><span style="margin-left:auto;font:12px Arial,sans-serif;color:#597076">Text size</span><button id="apiTextSmaller" type="button" class="en-outline" aria-label="Make text smaller">A-</button><button id="apiTextLarger" type="button" class="en-outline" aria-label="Make text larger">A+</button></div><div id="apiStoryPages"></div><div class="book-modal-actions"><button id="apiCompleteStory" class="en-button">Mark completed</button></div><section class="story-meta-footer" style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;margin-top:24px;padding-top:18px;border-top:1px solid #ead8bb"><img src="${modalGradeBadge}" alt="${esc(modalGrade || 'Grade')}" style="display:block;flex:0 0 150px;width:150px;height:64px;object-fit:contain;border-radius:8px"><div style="min-width:220px;flex:1"><div class="book-modal-meta">${esc(modalMeta)}</div>${modalCreated ? `<div class="book-modal-meta" style="margin-top:4px">Created ${esc(modalCreated)}</div>` : ''}<div class="book-modal-meta" style="margin-top:4px">Story ID: ${esc(story.id)}</div>${modalStandard ? `<div class="book-modal-meta" style="margin-top:4px">U.S. standard: ${esc(modalStandard)}</div>` : ''}${modalObjective ? `<div class="book-modal-meta" style="margin-top:4px">Objective: ${esc(modalObjective)}</div>` : ''}</div></section><div id="apiUpgradeCta" class="book-modal-upgrade"></div>${adultEditorMarkup}${assessmentMarkup}<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 class="book-modal-subtitle">Word garden</h3><button id="apiRefreshWords" type="button" class="en-outline">Refresh word garden</button></div><p class="book-modal-meta" style="text-transform:none;letter-spacing:0">Click any word in the story to add a simple definition here.</p><div id="apiStoryWords" class="book-modal-list"></div>`;
    modal.appendChild(inner);
    document.body.appendChild(modal);
    const shelfControls = document.createElement('div');
    shelfControls.className = 'story-shelf-controls';
    shelfControls.innerHTML = `<button type="button" id="apiFavoriteStory" class="en-outline">${story.is_favorite ? '★ Favorited' : '☆ Favorite'}</button><label>Rating <select id="apiStoryRating" class="en-select"><option value="">Not rated</option><option value="1">★</option><option value="2">★★</option><option value="3">★★★</option><option value="4">★★★★</option><option value="5">★★★★★</option></select></label><span id="apiBookmarkStatus"></span>`;
    inner.querySelector('.reader-toolbar').before(shelfControls);
    const ratingSelect = shelfControls.querySelector('#apiStoryRating');
    if (story.rating) ratingSelect.value = String(story.rating);
    const saveShelfPreference = async payload => {
      const result = await api(`/api/stories/${encodeURIComponent(story.id)}/preferences`, { method: 'PUT', body: JSON.stringify(payload) });
      Object.assign(story, { is_favorite: result.preference.isFavorite, rating: result.preference.rating, bookmarked_page: result.preference.bookmarkedPage });
      return result.preference;
    };
    shelfControls.querySelector('#apiFavoriteStory').onclick = async () => {
      try { const preference = await saveShelfPreference({ isFavorite: !story.is_favorite }); shelfControls.querySelector('#apiFavoriteStory').textContent = preference.isFavorite ? '★ Favorited' : '☆ Favorite'; await refresh(); notify(preference.isFavorite ? 'Added to favorites.' : 'Removed from favorites.'); } catch (error) { notify(error.message); }
    };
    ratingSelect.onchange = async () => {
      try { await saveShelfPreference({ rating: ratingSelect.value ? Number(ratingSelect.value) : null }); await refresh(); notify('Story rating saved.'); } catch (error) { notify(error.message); }
    };
    const bookmarkStatus = shelfControls.querySelector('#apiBookmarkStatus');
    bookmarkStatus.textContent = story.bookmarked_page ? `Saved at page ${Number(story.bookmarked_page) + 1}` : 'Bookmark updates as you read';
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
    const followUpButton = document.createElement('button');
    followUpButton.id = 'apiFollowUpStory';
    followUpButton.type = 'button';
    followUpButton.className = 'en-outline';
    followUpButton.textContent = 'Create a follow-up adventure';
    inner.querySelector('.book-modal-actions').appendChild(followUpButton);
    followUpButton.onclick = () => {
      const learner = learners.find(item => item.id === story.learner_id);
      $('#apiLearner').value = story.learner_id || learner?.id || '';
      $('#apiGradeLevel').value = story.content?.meta?.gradeLevel || 'K';
      $('#apiTheme').value = story.theme || 'Moonlight';
      $('#apiCustomTheme').value = story.content?.meta?.customTheme || '';
      $('#apiCustomTheme').classList.toggle('hidden', $('#apiTheme').value !== 'Custom');
      $('#apiPrompt').value = `Continue the story of ${story.title} with a new challenge and a meaningful choice.`;
      loadCurriculumOptions($('#apiGradeLevel').value).then(() => {
        const matchingGoal = curriculumOptions.find(row => row.standard_code === story.content?.meta?.curriculumStandard) || curriculumOptions.find(row => row.domain === story.content?.meta?.domain);
        if (matchingGoal) $('#apiGoal').value = matchingGoal.standard_code;
        updateStoryVisual();
        inner.querySelector('#closeApiStory').click();
        show('home');
        $('#apiPrompt').focus();
      });
    };
    const pdfButton = document.createElement('button');
    pdfButton.id = 'apiDownloadStoryPdf';
    pdfButton.type = 'button';
    pdfButton.className = 'en-outline';
    pdfButton.textContent = 'Download story PDF';
    inner.querySelector('.book-modal-actions').appendChild(pdfButton);
    pdfButton.onclick = async () => {
      pdfButton.disabled = true;
      pdfButton.textContent = 'Preparing PDF...';
      try {
        const parentConfirmation = await confirmParent();
        const response = await fetch(`/api/stories/${encodeURIComponent(story.id)}.pdf`, { headers: { Authorization: `Bearer ${token}`, 'X-Parent-Confirmation': parentConfirmation } });
        if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error || 'Unable to create the story PDF.'); }
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${String(story.title || 'story').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'story'}-story.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
        notify('Story PDF downloaded.');
      } catch (error) { notify(error.message); } finally { pdfButton.disabled = false; pdfButton.textContent = 'Download story PDF'; }
    };
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
    const resumeKey = `storySproutResume:${story.id}`;
    let idx = Math.min(Number(localStorage.getItem(resumeKey) || 0), Math.max(0, pages.length - 1));
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
      saveShelfPreference({ bookmarkedPage: idx }).then(() => { bookmarkStatus.textContent = `Saved at page ${idx + 1}`; }).catch(() => {});
      inner.querySelector('#prevPage').onclick = () => { if (idx > 0) { idx -= 1; localStorage.setItem(resumeKey, String(idx)); renderPage(); } };
      inner.querySelector('#nextPage').onclick = () => { if (idx < pages.length - 1) { idx += 1; localStorage.setItem(resumeKey, String(idx)); renderPage(); } };
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
      reviewPanel.innerHTML = '<h3 class="book-modal-subtitle">Parent review</h3><p class="book-modal-meta" style="text-transform:none;letter-spacing:0">A single story check does not establish overall mastery. Review the response as evidence from this story using the selected reading objective.</p><form id="apiAdultReviewForm"><label class="en-label">Review score (0-100)<input id="apiReviewScore" class="en-input" type="number" min="0" max="100" required></label><label class="en-label" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input id="apiReviewMastered" type="checkbox"> Record positive evidence for this review</label><label class="en-label" style="display:block;margin-top:10px">Review notes<textarea id="apiReviewNotes" class="en-input" rows="2" maxlength="1000" placeholder="What evidence did the reader show?"></textarea></label><button type="submit" class="en-outline" style="margin-top:10px">Save parent review</button></form><p id="apiReviewStatus" class="book-modal-meta"></p>';
      inner.querySelector('#apiAssessmentResult').after(reviewPanel);
      reviewPanel.querySelector('#apiAdultReviewForm').onsubmit = async event => {
        event.preventDefault();
        try {
          const result = await api(`/api/stories/${story.id}/assessment/review`, { method: 'PATCH', body: JSON.stringify({ score: Number(reviewPanel.querySelector('#apiReviewScore').value), mastered: reviewPanel.querySelector('#apiReviewMastered').checked, notes: reviewPanel.querySelector('#apiReviewNotes').value }) });
          reviewPanel.querySelector('#apiReviewStatus').textContent = result.assessment.mastered ? 'Reviewed: positive evidence recorded for this story and skill.' : 'Reviewed: keep practicing this skill.';
          await refresh();
          notify('Parent review saved.');
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
      assessment.innerHTML += `<p class="book-modal-meta" style="margin-top:14px">${objectiveQuestions ? 'Choose the best answer from the story. Your score is calculated automatically.' : 'This older story uses written responses and still needs parent review.'}</p>`;
      if (objectiveQuestions) {
        assessment.querySelectorAll('.assessment-option input').forEach(input => {
          input.addEventListener('change', () => {
            const question = questions[Number(input.dataset.questionIndex)];
            const option = input.closest('.assessment-option');
            assessment.querySelectorAll(`input[name="assessment-${input.dataset.questionIndex}"]`).forEach(choice => choice.closest('.assessment-option')?.classList.remove('is-correct', 'is-incorrect'));
            option.classList.add(input.value === question.answer ? 'is-correct' : 'is-incorrect');
            option.setAttribute('data-feedback', input.value === question.answer ? 'Correct' : 'Try another answer');
          });
        });
      }
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
          ? `<strong class="assessment-score">${result.score}<span>/100</span></strong><span class="assessment-score-detail">${result.correct} of ${questions.length} correct on this story's questions. ${result.mastered ? 'This story check provides positive evidence for the selected skill.' : 'Keep practicing this skill and try again.'}</span><div class="assessment-result-actions"><button type="button" class="en-button" id="apiRetryAssessment">Try again</button><button type="button" class="en-outline" id="apiCloseAssessment">Close</button></div>`
          : `<strong class="assessment-score">${result.score}<span>/100</span></strong><span class="assessment-score-detail">Practice score saved. Parent review is still required for this older story format.</span><div class="assessment-result-actions"><button type="button" class="en-outline" id="apiCloseAssessment">Close</button></div>`;
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
    const [meData, learnerData, storyData, subscriptionData, scoreData, offerData, reminderData, progressData, shelfData, deletedStoryData] = await Promise.all([
      api('/api/me'),
      api('/api/learners'),
      api('/api/stories'),
      api('/api/subscription'),
      api('/api/business/scorecard').catch(() => ({ scorecard: null })),
      api('/api/subscription/offer'),
      api('/api/reminders/preferences'),
      api('/api/progress'),
      api('/api/story-shelf').catch(() => ({ favorites: [], topRated: [] })),
      api('/api/stories/deleted').catch(() => ({ stories: [] })),
    ]);

    me = meData.account;
    learners = learnerData.learners || [];
    stories = storyData.stories || [];
    renderStoryShelf(shelfData);
    renderDeletedStories(deletedStoryData.stories || []);
    const subscription = subscriptionData.subscription || { plan: 'explorer', status: 'active' };
    const score = scoreData.scorecard;
    const progressNav = $('#apiProgressNav');
    const canUseProgressTools = isChildSession || me.isSiteOwner === true || me.role === 'teacher';
    if (progressNav) progressNav.classList.toggle('hidden', !canUseProgressTools);
    if (!canUseProgressTools && !$('#apiProgressView').classList.contains('hidden')) show('home');
    const progressNotice = $('#apiProgressNotice');
    if (progressNotice) {
      progressNotice.innerHTML = me.isSiteOwner === true
        ? '<strong>Site owner reporting</strong><p style="margin:6px 0 0;color:#597076">This page contains business signals and operational metrics for the site owner. Learner progress remains on Home.</p>'
        : me.role === 'teacher'
          ? '<strong>Teacher reporting</strong><p style="margin:6px 0 0;color:#597076">Use the school tools below to import a roster and export classroom progress. Learner progress remains on Home.</p>'
          : '<strong>Parent progress tools</strong><p style="margin:6px 0 0;color:#597076">Your learner progress is available on Home. Site-owner and teacher reporting tools are not enabled for this account.</p>';
    }

    const selectedLearnerId = $('#apiLearner')?.value;
    const learnerOptions = learners.length ? learners.map(l => `<option value="${l.id}">${esc(l.first_name)} | ages ${esc(l.age_band)}</option>`).join('') : '<option value="">Add a learner first</option>';
    if ($('#apiLearner')) $('#apiLearner').innerHTML = learnerOptions;
    if ($('#apiWeeklyPageLearner')) $('#apiWeeklyPageLearner').innerHTML = learnerOptions;
    if (learners.length) {
      const activeLearnerId = learners.some(learner => learner.id === selectedLearnerId) ? selectedLearnerId : learners[0].id;
      if ($('#apiLearner')) $('#apiLearner').value = activeLearnerId;
      if ($('#apiWeeklyPageLearner')) $('#apiWeeklyPageLearner').value = activeLearnerId;
    }
    const visibleProgressLearners = isChildSession
      ? (progressData.learners || []).filter(item => item.id === (account.learner?.id || learners[0]?.id))
      : (progressData.learners || []);
    window.__storySproutProgressLearners = visibleProgressLearners;
    renderLastActivity(visibleProgressLearners, $('#apiLearner')?.value);
    renderNextActions(visibleProgressLearners, $('#apiLearner')?.value);
    renderWeeklyReturnActions(visibleProgressLearners, $('#apiLearner')?.value);
    $('#apiLearnerList').innerHTML = learners.length ? learners.map(l => `<div class="student-row"><div class="student-left"><span class="student-avatar">${esc(l.first_name[0] || '?')}</span><div><div class="student-name">${esc(l.first_name)}</div><div class="student-meta">Ages ${esc(l.age_band)} | ${esc(l.interests || 'Ready for stories')}</div>${l.child_username ? `<div class="student-meta">Child login: ${esc(l.child_username)}</div>` : ''}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="apiChildLogin en-outline" data-id="${l.id}">${l.child_username ? 'Reset child login' : 'Set child login'}</button><button class="apiEdit en-outline" data-id="${l.id}">Edit</button><button class="apiRemove" data-id="${l.id}">Remove</button></div></div>`).join('') : '<p>Add a learner to begin.</p>';
    const masteredAssessments = visibleProgressLearners.reduce((total, learner) => total + Number(learner.mastered_assessments || 0), 0);
    $('#apiStats').innerHTML = `<div class="en-stat"><strong>${learners.length}</strong><span>learners</span></div><div class="en-stat"><strong>${stories.length}</strong><span>stories saved</span></div><div class="en-stat"><strong>${stories.filter(s => s.completed_at).length}</strong><span>completed</span></div><div class="en-stat"><strong>${masteredAssessments}</strong><span>skills with positive story-check evidence</span></div>`;
    const completedStories = stories.filter(story => story.completed_at).length;
    const answeredStories = stories.filter(story => story.content?.questions?.length && story.completed_at).length;
    const progressPercent = stories.length ? Math.min(100, Math.round((completedStories / stories.length) * 100)) : 0;
    $('#apiProgressBars').innerHTML = `<div class="progress-line"><div><strong>Reading practice</strong><span>${completedStories} of ${stories.length} stories completed</span></div><div class="progress-track"><span style="width:${progressPercent}%"></span></div></div><div class="progress-line"><div><strong>Story checks</strong><span>${answeredStories} completed checks</span></div><div class="progress-track"><span style="width:${stories.length ? Math.min(100, Math.round((answeredStories / stories.length) * 100)) : 0}%"></span></div></div>`;
    const achievements = [completedStories >= 1 ? 'First story finished' : 'Your first story is waiting', stories.length >= 3 ? 'Three stories created' : 'Create three stories', masteredAssessments >= 1 ? 'Reading skill demonstrated' : 'Practice a reading skill'];
    $('#apiAchievements').innerHTML = achievements.map((achievement, index) => `<span class="achievement ${((index === 0 && completedStories >= 1) || (index === 1 && stories.length >= 3) || (index === 2 && masteredAssessments >= 1)) ? 'earned' : ''}">${esc(achievement)}</span>`).join('');
    const weekStart = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weekCompleted = stories.filter(story => story.completed_at && new Date(story.completed_at).getTime() >= weekStart).length;
    $('#apiHabit').innerHTML = `<strong>${weekCompleted}/1</strong><span>stories completed this week</span><small>${weekCompleted ? 'Nice reading rhythm. Keep it going.' : 'A small weekly goal: finish one story together.'}</small>`;
    $('#apiLearnerReport').innerHTML = visibleProgressLearners.map(item => `<div class="learner-report"><strong>${esc(item.first_name)}</strong><span>${item.stories_completed} completed • ${item.assessments_completed} checks • ${item.average_assessment_score || 0}% average</span><div class="progress-track"><span style="width:${Math.min(100, Number(item.average_assessment_score || 0))}%"></span></div></div>`).join('');
    $('#apiDownloadProgress').onclick = () => {
      const snapshot = { generatedAt: new Date().toISOString(), note: 'Story-specific reading practice snapshot; not a formal reading assessment.', learners: visibleProgressLearners, stories: stories.map(story => ({ id: story.id, learner: story.learner_name, title: story.title, goal: story.learning_goal, completedAt: story.completed_at, createdAt: story.created_at })) };
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
      link.download = 'story-sprout-progress-snapshot.json';
      link.click();
      URL.revokeObjectURL(link.href);
      notify('Progress snapshot downloaded privately.');
    };
    $('#apiPlanBadge').textContent = `PLAN: ${(subscription.plan || 'explorer').toUpperCase()}`;
    $('#apiBillingStatus').textContent = `${subscription.plan} plan: ${subscription.status}.`;
    const cancelButton = $('#apiStartCancel');
    const cancelPanel = $('#apiCancelPanel');
    const canCancel = ['active', 'demo'].includes(subscription.status) && subscription.plan !== 'explorer';
    if (cancelButton) cancelButton.classList.toggle('hidden', !canCancel);
    if (cancelPanel && !canCancel) cancelPanel.classList.add('hidden');
    renderOnboarding(subscription);


  function renderLastActivity(progressLearners, learnerId) {
    const container = $('#apiLastActivity');
    if (!container) return;
    const item = progressLearners.find(learner => learner.id === learnerId);
    const activity = item?.last_activity;
    if (!activity) {
      container.classList.remove('hidden');
      container.innerHTML = '<div class="last-activity-eyebrow">WELCOME BACK</div><h2>Start your first reading adventure</h2><p>Choose a learner, a reading goal, and an idea to create a personalized story together.</p>';
      return;
    }
    const assessment = activity.assessment;
    const vocabulary = (activity.vocabulary || []).slice(0, 3).map(word => typeof word === 'string' ? word : word.word).filter(Boolean);
    const status = assessment ? `${assessment.score}/100 story check (${assessment.answered} of ${assessment.questionCount} questions answered)` : activity.completedAt ? 'Story completed' : 'Story in progress';
    const nextAction = assessment ? 'Review story' : activity.completedAt ? 'Review story' : 'Continue story';
    container.classList.remove('hidden');
    container.innerHTML = `<div class="last-activity-eyebrow">WELCOME BACK</div><div class="last-activity-heading"><div><h2>${esc(item.first_name)}'s latest reading activity</h2><p class="last-activity-date">${esc(formatStoryDate(activity.completedAt || activity.createdAt))}</p></div><span class="last-activity-mark">✦</span></div><div class="last-activity-story"><strong>${esc(activity.title)}</strong><span>${esc(activity.learningGoal || 'Reading practice')}</span>${activity.objective ? `<p>${esc(activity.objective)}</p>` : ''}<div class="last-activity-details"><span>${esc(status)}</span>${vocabulary.length ? `<span>Words: ${esc(vocabulary.join(', '))}</span>` : ''}</div></div><button type="button" class="en-button last-activity-open" data-story-id="${esc(activity.storyId)}">${nextAction}</button>`;
    container.querySelector('.last-activity-open').onclick = () => {
      const story = stories.find(savedStory => savedStory.id === activity.storyId);
      if (story) openServerStory(story);
    };
  }

  function renderNextActions(progressLearners, learnerId) {
    const container = $('#apiNextActions');
    if (!container) return;
    const learner = progressLearners.find(item => item.id === learnerId);
    const activity = learner?.last_activity;
    const selectedStory = activity && stories.find(story => story.id === activity.storyId);
    const action = !learner ? { title: 'Start with a learner', text: 'Add a reader so Story Sprout can shape the experience around them.', step: 'learner', label: 'Add learner' } : !activity ? { title: 'Make the first story', text: 'Choose an interest, a reading goal, and an adventure.', step: 'story', label: 'Create story' } : !activity.completedAt ? { title: `Continue ${activity.title}`, text: 'Pick up the latest reading adventure where you left off.', story: selectedStory, label: 'Continue story' } : { title: 'Choose what comes next', text: 'Practice the same goal again with a fresh adventure or review the last story.', story: selectedStory, step: 'story', label: 'Create another story' };
    container.innerHTML = `<div class="next-actions-eyebrow">NEXT READING STEP</div><h3>${esc(action.title)}</h3><p>${esc(action.text)}</p><button type="button" class="en-outline" id="apiNextActionButton">${action.label}</button>`;
    container.querySelector('#apiNextActionButton').onclick = () => {
      if (action.story) return openServerStory(action.story);
      if (action.step === 'learner') return show('learners');
      show('home');
      $('#apiPrompt')?.focus();
    };
  }

  function renderWeeklyReturnActions(progressLearners, learnerId) {
    const homeContainer = $('#apiWeeklyReturnActions');
    const pageContainer = $('#apiWeeklyPageContent');
    if (!homeContainer && !pageContainer) return;

    const learner = (progressLearners || []).find(item => item.id === learnerId) || learners.find(item => item.id === learnerId);
    const activity = learner?.last_activity;
    const story = activity && stories.find(item => item.id === activity.storyId);

    if (!learner || !stories.some(savedStory => !learnerId || savedStory.learner_id === learnerId)) {
      const firstRun = !learner
        ? {
          eyebrow: 'START HERE',
          title: 'Your first weekly review starts with a learner.',
          text: 'Add a learner, then create a story together. This page will fill with reading progress, vocabulary, and story checks as you go.',
          label: 'Add a learner',
          step: 'learners',
        }
        : {
          eyebrow: 'READY WHEN YOU ARE',
          title: `${learner.first_name}'s first story is waiting.`,
          text: 'There is no review to show yet. Create a story together and this page will become your place to revisit the reading journey.',
          label: 'Create first story',
          step: 'home',
        };
      const emptyBlock = `<div class="weekly-first-run"><div class="weekly-summary-heading">${firstRun.eyebrow}</div><h3 class="weekly-summary-title">${esc(firstRun.title)}</h3><p>${esc(firstRun.text)}</p><button type="button" class="en-button weekly-first-run-btn">${firstRun.label}</button></div>`;
      const attachFirstRunHandler = rootEl => {
        if (!rootEl) return;
        rootEl.querySelector('.weekly-first-run-btn').onclick = () => {
          show(firstRun.step);
          if (firstRun.step === 'home') $('#apiPrompt')?.focus();
        };
      };
      if (homeContainer) {
        homeContainer.innerHTML = emptyBlock;
        attachFirstRunHandler(homeContainer);
      }
      if (pageContainer) {
        pageContainer.innerHTML = emptyBlock;
        attachFirstRunHandler(pageContainer);
      }
      return;
    }

    const rawRecentStories = stories
      .filter(savedStory => (!learnerId || savedStory.learner_id === learnerId) && savedStory.title)
      .sort((a, b) => new Date(b.created_at || b.completed_at || 0) - new Date(a.created_at || a.completed_at || 0))
      .slice(0, 6);

    const recentStories = rawRecentStories.length ? rawRecentStories : (story ? [story] : []);

    const extractedVocab = [...new Set(recentStories.flatMap(savedStory => {
      const words = Array.isArray(savedStory.content?.words) ? savedStory.content.words : [];
      return words.map(word => typeof word === 'string' ? word : word.word).filter(Boolean);
    }))];

    const recentVocabulary = extractedVocab;

    const realStorySummary = recentStories.map(savedStory => {
      const goal = savedStory.learning_goal || (savedStory.content?.meta?.domain ? savedStory.content.meta.domain.replaceAll('_', ' ') : '');
      const objective = savedStory.content?.meta?.curriculumObjective || '';
      return {
        id: savedStory.id,
        title: savedStory.title,
        learnerName: savedStory.learner_name || learners.find(item => item.id === savedStory.learner_id)?.first_name || learner?.first_name || 'Learner',
        goal,
        objective,
        detail: [goal, objective].filter(Boolean).join(' — '),
        words: Array.isArray(savedStory.content?.words) ? savedStory.content.words.map(word => typeof word === 'string' ? word : word.word).filter(Boolean) : [],
        raw: savedStory
      };
    });

    const displayStories = realStorySummary;

    const summaryHeading = learner ? `${learner.first_name}'s learning snapshot` : 'Learning snapshot';

    const renderBlock = () => `
      <div class="weekly-return-summary">
        <div>
          <div class="weekly-summary-heading">LAST WEEK'S LEARNING</div>
          <h3 class="weekly-summary-title">${esc(summaryHeading)}</h3>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
          <div class="weekly-summary-panel">
            <div class="weekly-summary-panel-title">📚 What was covered</div>
            <div style="color:#597076;line-height:1.5">
              ${displayStories.length ? displayStories.map(item => `
                <div class="weekly-story-item">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                    <div><strong style="color:#20454c;font-size:15px">${esc(item.title)}</strong><span style="display:block;margin-top:3px;color:#597076;font-size:12px">For: ${esc(item.learnerName)}</span></div>
                    ${item.raw ? `<button type="button" class="en-outline weekly-read-again-btn" data-story-id="${item.raw.id}" style="padding:4px 8px;font-size:11px;white-space:nowrap;cursor:pointer">Read story</button>` : ''}
                  </div>
                  ${item.goal ? `<span style="color:#b15c3b;font-weight:700;font-size:12px">${esc(item.goal)}</span>` : ''}
                  ${item.objective ? `<span style="font-size:13px;color:#597076">${esc(item.objective)}</span>` : ''}
                </div>
              `).join('') : '<p style="margin:0">No saved stories are available for this learner yet.</p>'}
            </div>
          </div>

          <div class="weekly-summary-panel">
            <div class="weekly-summary-panel-title">💡 Vocabulary learned</div>
            <div style="color:#597076;line-height:1.5">
              <div class="weekly-vocab-chips">
                ${recentVocabulary.length ? recentVocabulary.map(word => `<span class="weekly-vocab-chip">${esc(word)}</span>`).join('') : '<span>No saved vocabulary is available yet.</span>'}
              </div>
            </div>
          </div>
        </div>

        <div class="weekly-summary-panel">
          <div class="weekly-summary-panel-title">✨ Quick review</div>
          <div style="color:#597076;line-height:1.6;font-size:14px">
            ${displayStories.length ? displayStories.map(item => `
              <div style="margin-bottom:8px;padding-left:12px;border-left:3px solid #3c7a56">
                <strong style="color:#20454c">${esc(item.title)}</strong><span style="display:block;color:#597076;font-size:12px">For: ${esc(item.learnerName)}</span>${item.detail ? `<span>: ${esc(item.detail)}</span>` : ''}
              </div>
            `).join('') : '<p style="margin:0">Complete a story to see a review here.</p>'}
          </div>
        </div>
      </div>
    `;

    const attachHandlers = (rootEl) => {
      if (!rootEl) return;
      rootEl.querySelectorAll('.weekly-read-again-btn').forEach(btn => {
        btn.onclick = () => {
          const storyId = btn.dataset.storyId;
          const targetStory = stories.find(s => s.id === storyId);
          if (targetStory) openServerStory(targetStory);
        };
      });
    };

    if (homeContainer) {
      homeContainer.innerHTML = renderBlock();
      attachHandlers(homeContainer);
    }
    if (pageContainer) {
      pageContainer.innerHTML = renderBlock();
      attachHandlers(pageContainer);
    }
  }

  $('#apiStartCancel').onclick = () => { $('#apiCancelPanel').classList.remove('hidden'); $('#apiCancelError').textContent = ''; $('#apiCancelReason').focus(); };
  $('#apiBillingPrivacy').onclick = () => document.querySelector('.privacy-trigger')?.click();
  $('#apiKeepSubscription').onclick = () => $('#apiCancelPanel').classList.add('hidden');
  $('#apiConfirmCancel').onclick = async () => {
    const error = $('#apiCancelError');
    error.textContent = '';
    try {
      const password = $('#apiCancelPassword').value;
      if (!password) { error.textContent = 'Enter your current password to continue.'; return; }
      const result = await api('/api/subscription/cancellation-request', { method: 'POST', body: JSON.stringify({ currentPassword: password, reason: $('#apiCancelReason').value }) });
      $('#apiCancelPanel').classList.add('hidden');
      $('#apiCancelPassword').value = '';
      notify(result.message || 'Check your email to confirm cancellation.');
    } catch (requestError) { error.textContent = requestError.message; }
  };
      document.querySelectorAll('.apiChildLogin').forEach(button => {
        button.onclick = () => {
          const learner = learners.find(item => item.id === button.dataset.id);
          if (!learner) return;
          const overlay = document.createElement('div');
          overlay.className = 'learner-delete-overlay';
          overlay.innerHTML = `<style>.child-login-dialog{width:min(520px,100%);padding:26px;background:#fffdf9;border:1px solid #cbdcc9;border-radius:10px;box-shadow:0 20px 50px rgba(20,63,74,.25)}.child-login-dialog h2{margin:8px 0;color:#294f55}.child-login-dialog p{color:#597076;font:14px/1.5 Arial,sans-serif}.child-login-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}.child-login-error{min-height:18px;color:#a63e31;font:13px Arial,sans-serif}</style><section class="child-login-dialog" role="dialog" aria-modal="true" aria-labelledby="childLoginTitle"><div class="last-activity-eyebrow">PARENT CONTROL</div><h2 id="childLoginTitle">${learner.child_username ? `Reset ${esc(learner.first_name)}'s child login` : `Create ${esc(learner.first_name)}'s child login`}</h2><p>This lets ${esc(learner.first_name)} sign in directly without opening the parent workspace. The child can access only this learner's reading shelf.</p><label class="en-label" for="childUsername">Child username</label><input id="childUsername" class="en-input" maxlength="32" pattern="[A-Za-z0-9._-]+" value="${esc(learner.child_username || `${learner.first_name.toLowerCase().replace(/[^a-z0-9]+/g, '')}-reader`)}"><label class="en-label" for="childPassword" style="margin-top:12px">Child password</label><input id="childPassword" class="en-input" type="password" minlength="6" maxlength="128" autocomplete="new-password" placeholder="At least 6 characters"><p style="margin:7px 0 0;font-size:12px">Give these credentials to the child. Do not reuse the parent password.</p><p class="child-login-error" role="alert"></p><div class="child-login-actions"><button type="button" class="en-outline" data-child-login-cancel>Cancel</button><button type="button" class="en-button" data-child-login-save>Save child login</button></div></section>`;
          document.body.appendChild(overlay);
          const closeOverlay = () => overlay.remove();
          overlay.querySelector('[data-child-login-cancel]').onclick = closeOverlay;
          overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(); });
          overlay.querySelector('#childUsername').focus();
          overlay.querySelector('[data-child-login-save]').onclick = async () => {
            const error = overlay.querySelector('.child-login-error');
            const username = overlay.querySelector('#childUsername').value.trim();
            const password = overlay.querySelector('#childPassword').value;
            if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) { error.textContent = 'Use 3 to 32 letters, numbers, dots, underscores, or hyphens.'; return; }
            if (password.length < 6) { error.textContent = 'Use a password with at least 6 characters.'; return; }
            try {
              await api(`/api/learners/${button.dataset.id}/child-login`, { method: 'PATCH', body: JSON.stringify({ username, password }) });
              closeOverlay();
              await refresh();
              notify(`Child login saved for ${learner.first_name}.`);
            } catch (requestError) { error.textContent = requestError.message; }
          };
        };
      });
      document.querySelectorAll('.apiEdit').forEach(button => {
        button.onclick = () => {
          const learner = learners.find(item => item.id === button.dataset.id);
          if (!learner) return;
          editingLearnerId = learner.id;
          $('#apiFirstName').value = learner.first_name || '';
          $('#apiAgeBand').value = learner.age_band || '6-8';
          $('#apiInterests').value = learner.interests || '';
          $('#apiAvoid').value = learner.topics_to_avoid || '';
          document.querySelectorAll('#apiAvoidOptions input').forEach(input => { input.checked = (learner.topics_to_avoid_options || []).includes(input.value); });
          $('#apiLearnerFormTitle').textContent = `Edit ${learner.first_name}`;
          $('#apiCancelLearnerEdit').classList.remove('hidden');
          $('#apiLearnersView').scrollIntoView({ behavior: 'smooth', block: 'start' });
          $('#apiFirstName').focus();
        };
      });
      document.querySelectorAll('.apiRemove').forEach(button => {
      button.onclick = async () => {
        const learner = learners.find(item => item.id === button.dataset.id);
        const learnerName = learner?.first_name || 'this learner';
        const overlay = document.createElement('div');
        overlay.className = 'learner-delete-overlay';
        overlay.innerHTML = `<style>.learner-delete-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(20,63,74,.38)}.learner-delete-dialog{width:min(520px,100%);padding:26px;background:#fffdf9;border:1px solid #dfb9a8;border-radius:10px;box-shadow:0 20px 50px rgba(20,63,74,.25)}.learner-delete-dialog h2{margin:8px 0;color:#8f352b}.learner-delete-dialog p{color:#597076;font:14px/1.5 Arial,sans-serif}.learner-delete-dialog label{display:block;margin:16px 0 6px;color:#28444c;font:700 13px Arial,sans-serif}.learner-delete-dialog input{width:100%;padding:11px;border:1px solid #cdbeb2;border-radius:5px;font:14px Arial,sans-serif}.learner-delete-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}.learner-delete-error{min-height:18px;margin:10px 0 0!important;color:#a63e31!important}</style><section class="learner-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="learnerDeleteTitle"><div class="last-activity-eyebrow">PERMANENT ACTION</div><h2 id="learnerDeleteTitle">Delete ${esc(learnerName)}'s learner profile?</h2><p>This permanently deletes the profile, preferences, saved stories, reading progress, story-check results, vocabulary, and reading goals. This cannot be undone.</p><label for="learnerDeleteConfirm">Type DELETE to continue</label><input id="learnerDeleteConfirm" type="text" autocomplete="off"><div class="learner-delete-actions"><button type="button" class="en-outline" data-delete-cancel>Cancel</button><button type="button" class="en-button" data-delete-submit>Delete learner</button></div><p class="learner-delete-error" role="alert"></p></section>`;
        document.body.appendChild(overlay);
        const closeOverlay = () => overlay.remove();
        overlay.querySelector('[data-delete-cancel]').onclick = closeOverlay;
        overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(); });
        overlay.querySelector('#learnerDeleteConfirm').focus();
        overlay.querySelector('[data-delete-submit]').onclick = async () => {
          const error = overlay.querySelector('.learner-delete-error');
          if (overlay.querySelector('#learnerDeleteConfirm').value !== 'DELETE') { error.textContent = 'Type DELETE exactly to confirm.'; return; }
          try {
            await api(`/api/learners/${button.dataset.id}`, { method: 'DELETE' });
            closeOverlay();
            await refresh();
            notify(`${learnerName}'s learner data was permanently deleted.`);
          } catch (requestError) { error.textContent = requestError.message; }
        };
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

    $('#apiReminderOpt').innerHTML = `<label class="reminder-toggle"><input type="checkbox" id="apiReminderToggle" ${reminderData.weeklyEmailEnabled ? 'checked' : ''}><span>Weekly reminder emails</span></label>`;
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
      const payload = {
        firstName: $('#apiFirstName').value,
        ageBand: $('#apiAgeBand').value,
        interests: $('#apiInterests').value,
        topicsToAvoid: $('#apiAvoid').value,
        topicsToAvoidOptions: [...document.querySelectorAll('#apiAvoidOptions input:checked')].map(input => input.value),
        goals: ['Kindness', 'Curiosity'],
      };
      await api(editingLearnerId ? `/api/learners/${editingLearnerId}` : '/api/learners', {
        method: editingLearnerId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      editingLearnerId = null;
      event.target.reset();
      $('#apiLearnerFormTitle').textContent = 'Add a learner';
      $('#apiCancelLearnerEdit').classList.add('hidden');
      await refresh();
      notify('Learner profile saved securely.');
    } catch (error) {
      notify(error.message);
    }
  };

  $('#apiCancelLearnerEdit').onclick = () => {
    editingLearnerId = null;
    $('#apiLearnerForm').reset();
    $('#apiLearnerFormTitle').textContent = 'Add a learner';
    $('#apiCancelLearnerEdit').classList.add('hidden');
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
      const generationPath = isChildSession ? '/api/child-mode/stories/generate' : '/api/stories/generate';
      const generationBody = isChildSession
        ? { prompt, domain, theme, customTheme, storyLength }
        : { learnerId, prompt, gradeLevel, domain, standardCode: selectedStandard, theme, customTheme, storyLength };
      const response = await api(generationPath, { method: 'POST', body: JSON.stringify(generationBody) });
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
  $('#apiChildMode').onclick = openChildModeSetup;
  $('#apiLogout').onclick = () => {
    localStorage.removeItem('storySproutToken');
    localStorage.removeItem('storySproutAccount');
    sessionStorage.removeItem('storySproutParentToken');
    sessionStorage.removeItem('storySproutParentAccount');
    sessionStorage.removeItem('storySproutParentConfirmation');
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
    pdfBtn.onclick = async () => {
      try {
        const parentConfirmation = await confirmParent();
        const response = await fetch('/api/classroom/progress-summary.pdf', { headers: { Authorization: `Bearer ${token}`, 'X-Parent-Confirmation': parentConfirmation } });
        if (!response.ok) throw new Error('Unable to download the classroom progress report.');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(await response.blob());
        link.download = 'classroom-progress-summary.pdf';
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        notify(error.message);
      }
    };
  }

  refresh().catch(error => notify(error.message));
})();
