(() => {
  const app = document.querySelector('.app');
  const token = localStorage.getItem('storySproutToken');
  if (!app || !token) return;

  const decodeToken = value => {
    try {
      const payload = value.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  };
  const session = decodeToken(token);
  if (!session?.childMode) return;
  window.__storySproutChildMode = true;

  const esc = value => {
    const node = document.createElement('div');
    node.textContent = String(value ?? '');
    return node.innerHTML;
  };
  const api = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Child Mode is unavailable.');
    return data;
  };
  const exit = () => {
    const parentToken = sessionStorage.getItem('storySproutParentToken');
    if (parentToken) {
      localStorage.setItem('storySproutToken', parentToken);
      const parentAccount = sessionStorage.getItem('storySproutParentAccount');
      if (parentAccount) localStorage.setItem('storySproutAccount', parentAccount);
      else localStorage.removeItem('storySproutAccount');
    } else {
      localStorage.removeItem('storySproutToken');
      localStorage.removeItem('storySproutAccount');
    }
    sessionStorage.removeItem('storySproutParentToken');
    sessionStorage.removeItem('storySproutParentAccount');
    sessionStorage.removeItem('storySproutParentConfirmation');
    location.reload();
  };
  const speak = text => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .92;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  async function render() {
    app.className = 'child-mode';
    app.innerHTML = '<main class="child-shell"><div class="child-error">Opening your reading shelf...</div></main>';
    try {
      const context = await api('/api/child-mode/context');
      const learner = context.learner;
      const stories = context.stories || [];
      app.innerHTML = `<main class="child-shell"><header class="child-header"><div class="child-brand">Story Sprout<span>CHILD MODE</span></div><button class="child-exit" id="childExit" type="button">Exit Child Mode</button></header><section class="child-welcome"><div class="child-eyebrow">YOUR READING SHELF</div><h1>Hi, ${esc(learner.first_name)}.</h1><p>Choose a story, read at your own pace, and talk about what you notice.</p></section><section aria-label="Stories"><div class="child-story-grid">${stories.length ? stories.map(story => `<article class="child-story-card"><div class="child-eyebrow">${esc(story.theme || 'STORY')}</div><h2>${esc(story.title)}</h2><p>${esc(story.learning_goal || 'Reading adventure')}${story.completed_at ? ' · Finished' : ''}</p><button type="button" class="child-open-story" data-story-id="${esc(story.id)}">Open story</button></article>`).join('') : '<div class="child-empty">There are no stories on your shelf yet. Ask an adult to create one for you.</div>'}</div></section></main>`;
      document.querySelector('#childExit').onclick = exit;
      document.querySelectorAll('.child-open-story').forEach(button => {
        button.onclick = () => openStory(stories.find(story => story.id === button.dataset.storyId));
      });
      decorateChildHome(learner, stories);
    } catch (error) {
      app.innerHTML = `<main class="child-shell"><div class="child-error">${esc(error.message)}<br><button class="child-exit" id="childErrorExit" type="button">Exit Child Mode</button></div></main>`;
      document.querySelector('#childErrorExit').onclick = exit;
    }
  }

  function decorateChildHome(learner, stories) {
    const welcome = document.querySelector('.child-welcome');
    if (!welcome) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'child-home-toolbar';
    toolbar.innerHTML = `<button type="button" class="child-primary" data-child-create>Make a new story</button><span>${stories.length} ${stories.length === 1 ? 'story' : 'stories'} on your shelf</span>`;
    welcome.appendChild(toolbar);
    toolbar.querySelector('[data-child-create]').onclick = openCreateStory;
    const completed = stories.filter(story => story.completed_at).length;
    const summary = document.createElement('section');
    summary.className = 'child-progress-summary';
    summary.innerHTML = `<div><div class="child-eyebrow">YOUR PROGRESS</div><strong>${completed} of ${stories.length} stories finished</strong></div><div class="child-progress-track"><span style="width:${stories.length ? Math.round((completed / stories.length) * 100) : 0}%"></span></div><p>Keep reading, thinking, and growing your story shelf.</p>`;
    welcome.after(summary);
  }

  function openChildPrompt({ title, label, submitLabel, onSubmit }) {
    const overlay = document.createElement('div');
    overlay.className = 'child-reader';
    overlay.innerHTML = `<article class="child-reader-card child-form-card" role="dialog" aria-modal="true"><header class="child-reader-head"><div><div class="child-eyebrow">STORY STUDIO</div><h2>${esc(title)}</h2></div><button class="child-close" type="button">Close</button></header><p class="child-form-copy">${esc(label)}</p><textarea class="child-story-input" maxlength="300" placeholder="A friendly dragon finds a hidden garden..."></textarea><div class="child-form-error" role="alert"></div><div class="child-form-actions"><button class="child-close child-secondary" type="button">Cancel</button><button class="child-primary child-submit" type="button">${esc(submitLabel)}</button></div></article>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelectorAll('.child-close').forEach(button => button.onclick = close);
    overlay.onclick = event => { if (event.target === overlay) close(); };
    overlay.querySelector('.child-submit').onclick = async () => {
      const input = overlay.querySelector('.child-story-input');
      const error = overlay.querySelector('.child-form-error');
      if (input.value.trim().length < 3) { error.textContent = 'Tell us a little more about your idea.'; return; }
      overlay.querySelector('.child-submit').disabled = true;
      error.textContent = 'Growing your story...';
      try { await onSubmit(input.value.trim()); close(); await render(); } catch (requestError) { overlay.querySelector('.child-submit').disabled = false; error.textContent = requestError.message; }
    };
    overlay.querySelector('.child-story-input').focus();
  }

  function openCreateStory() {
    openChildPrompt({ title: 'Make a new story', label: 'What would you like your adventure to be about?', submitLabel: 'Create story', onSubmit: prompt => api('/api/child-mode/stories/generate', { method: 'POST', body: JSON.stringify({ prompt, theme: 'Garden', storyLength: 'quick' }) }) });
  }

  function openRevision(story) {
    openChildPrompt({ title: 'Update this story', label: 'What should change? Try adding a new challenge, place, character, or ending.', submitLabel: 'Update story', onSubmit: revisionPrompt => api(`/api/child-mode/stories/${encodeURIComponent(story.id)}/revise`, { method: 'PATCH', body: JSON.stringify({ revisionPrompt }) }) });
  }

  function openStory(story) {
    if (!story) return;
    const pages = Array.isArray(story.content?.pages) ? story.content.pages : [];
    const questions = Array.isArray(story.content?.questions) ? story.content.questions : [];
    const words = Array.isArray(story.content?.words) ? story.content.words : [];
    let pageIndex = 0;
    const modal = document.createElement('div');
    modal.className = 'child-reader';
    modal.innerHTML = `<article class="child-reader-card" role="dialog" aria-modal="true" aria-label="Reading ${esc(story.title)}"><header class="child-reader-head"><div><div class="child-eyebrow">STORY TIME</div><h2>${esc(story.title)}</h2></div><button class="child-close" type="button">Close</button></header><div class="child-reader-actions"><button type="button" class="child-speak">Read this page aloud</button><button type="button" class="child-stop">Stop reading</button></div><div class="child-page"></div><div class="child-page-nav"><button type="button" class="child-prev">Back</button><span class="child-page-count"></span><button type="button" class="child-next child-primary">Next</button></div>${words.length ? `<div class="child-words" aria-label="Story words">${words.map(word => `<span class="child-word">${esc(typeof word === 'string' ? word : word.word)}</span>`).join('')}</div>` : ''}<section class="child-check"><h3>Talk about the story</h3><form class="child-assessment">${questions.length ? questions.map((question, index) => { const prompt = typeof question === 'string' ? question : question.prompt || ''; const options = typeof question === 'object' && Array.isArray(question.options) ? question.options : []; return `<fieldset class="child-question"><legend>${index + 1}. ${esc(prompt)}</legend>${options.map(option => `<label class="child-option"><input type="radio" name="child-question-${index}" value="${esc(option)}">${esc(option)}</label>`).join('')}</fieldset>`; }).join('') + '<button type="submit" class="child-primary">Check my answers</button>' : '<p>No questions for this story yet. Tell an adult what you noticed.</p>'}</form><div class="child-result" hidden></div><button type="button" class="child-complete child-primary">Mark story finished</button></section><details class="child-report"><summary>Report a problem with this story</summary><form><select aria-label="Report category"><option value="unsafe_content">Unsafe content</option><option value="incorrect_content">Incorrect content</option><option value="privacy_concern">Privacy concern</option><option value="other">Other</option></select><input maxlength="1000" placeholder="What should an adult review?" aria-label="Report details"><button type="submit">Send report</button></form></details></article>`;
    document.body.appendChild(modal);
    const updateButton = document.createElement('button');
    updateButton.type = 'button';
    updateButton.className = 'child-secondary child-update-story';
    updateButton.textContent = 'Update this story';
    updateButton.onclick = () => { modal.remove(); openRevision(story); };
    modal.querySelector('.child-reader-actions').appendChild(updateButton);
    const page = modal.querySelector('.child-page');
    const count = modal.querySelector('.child-page-count');
    const renderPage = () => {
      page.textContent = pages[pageIndex] || 'This story has no pages yet.';
      count.textContent = `Page ${pageIndex + 1} of ${pages.length}`;
      modal.querySelector('.child-prev').disabled = pageIndex === 0;
      modal.querySelector('.child-next').disabled = pageIndex >= pages.length - 1;
    };
    const close = () => { window.speechSynthesis?.cancel(); modal.remove(); };
    modal.querySelector('.child-close').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    modal.querySelector('.child-prev').onclick = () => { if (pageIndex > 0) { pageIndex -= 1; renderPage(); } };
    modal.querySelector('.child-next').onclick = () => { if (pageIndex < pages.length - 1) { pageIndex += 1; renderPage(); } };
    modal.querySelector('.child-speak').onclick = () => speak(pages[pageIndex] || '');
    modal.querySelector('.child-stop').onclick = () => window.speechSynthesis?.cancel();
    modal.querySelector('.child-complete').onclick = async () => {
      try { await api(`/api/child-mode/stories/${encodeURIComponent(story.id)}/complete`, { method: 'PATCH' }); modal.querySelector('.child-complete').textContent = 'Story finished'; modal.querySelector('.child-complete').disabled = true; } catch (error) { alert(error.message); }
    };
    const assessment = modal.querySelector('.child-assessment');
    assessment.onsubmit = async event => {
      event.preventDefault();
      const responses = questions.map((_, index) => assessment.querySelector(`input[name="child-question-${index}"]:checked`)?.value || '');
      if (responses.some(response => !response)) return alert('Choose an answer for each question first.');
      try {
        const result = await api(`/api/child-mode/stories/${encodeURIComponent(story.id)}/assessment`, { method: 'POST', body: JSON.stringify({ responses }) });
        const resultBox = modal.querySelector('.child-result');
        resultBox.hidden = false;
        resultBox.textContent = `You got ${result.correct ?? 0} of ${result.questionCount} correct. Nice thinking.`;
        assessment.querySelector('button[type="submit"]').disabled = true;
      } catch (error) { alert(error.message); }
    };
    modal.querySelector('.child-report form').onsubmit = async event => {
      event.preventDefault();
      const form = event.target;
      try { await api(`/api/child-mode/stories/${encodeURIComponent(story.id)}/safety-report`, { method: 'POST', body: JSON.stringify({ category: form.querySelector('select').value, details: form.querySelector('input').value }) }); form.innerHTML = '<span>Thanks. An adult will review this.</span>'; } catch (error) { alert(error.message); }
    };
    renderPage();
  }

  render();
})();
