(() => {
  let progressRequest = 0;
  const helpLabels = { independent: 'independently (adult observed)', some_help: 'with some help (adult observed)', read_together: 'while reading together (adult observed)', not_observed: 'help level not observed' };
  async function renderProgress({ learnerId, api, esc, openStory, isChildSession }) {
    const target = document.getElementById('apiReadingEvidence');
    if (!target) return;
    const request = ++progressRequest;
    if (!learnerId) { target.innerHTML = '<h2>Your reading routine</h2><p>Add a learner, choose a short story, read, and talk together.</p>'; return; }
    target.innerHTML = '<p>Loading your reading snapshot…</p>';
    try {
      const data = await api(`/api/reading/learners/${encodeURIComponent(learnerId)}`);
      if (request !== progressRequest || !target.isConnected) return;
      const latest = data.assessments[0];
      const observed = latest && data.observations.find(item => item.story_id === latest.story_id && Date.parse(item.updated_at) >= Date.parse(latest.created_at));
      const evidence = latest?.standards_evidence;
      const result = typeof evidence?.correct === 'number' ? `${evidence.correct} of ${evidence.questionCount} correct on “${latest.title}”, ${helpLabels[observed?.assistance] || 'help level not recorded'}.` : latest ? 'A previous story check is saved; detailed answer counts were not recorded.' : 'No story check submitted yet.';
      target.innerHTML = `<h2>${isChildSession ? 'Your next reading adventure' : 'Your reading snapshot'}</h2><div class="reading-evidence-grid"><div><h3>Reading activity</h3><p>${Math.floor(data.activeSeconds / 60)} minutes with the reader active.</p><small>Approximate foreground activity, not proof of reading or understanding.</small></div><div><h3>Story understanding</h3><p>${esc(result)}</p><small>Story-specific practice, not overall reading mastery.</small></div>${isChildSession ? '' : `<div><h3>Adult observations</h3>${data.observations.length ? data.observations.map(o => `<p><strong>${esc(o.title)}</strong><br>${esc(helpLabels[o.assistance])}${o.note ? `<br>${esc(o.note)}` : ''}</p>`).join('') : '<p>After reading, record help given and one thing you noticed.</p>'}</div>`}</div><p><strong>Try next:</strong> ${evidence && evidence.correct < evidence.questionCount ? 'Revisit a tricky question and find the sentence that helps. Choose an easier level if the story felt frustrating.' : 'Revisit one new word, then explain a favorite moment together.'}</p>${data.continueStory ? '<button type="button" class="en-button" id="apiResumeReading">Continue reading</button>' : '<p>Choose → read → discuss → return when you are ready.</p>'}`;
      target.querySelector('#apiResumeReading')?.addEventListener('click', () => openStory(data.continueStory));
    } catch {
      if (request === progressRequest) target.innerHTML = '<h2>Reading snapshot unavailable</h2><p>Your stories are still available below. Refresh to try loading progress again.</p>';
    }
  }
  function mountReader({ inner, modal, story, api, esc, isChildSession, narrationAudio, stopNarration, openStory, onNextChapter }) {
    inner.classList.add('reading-focused');
    const toolbar = inner.querySelector('.reader-toolbar');
    const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'en-outline'; pause.textContent = 'Pause narration'; pause.disabled = true;
    toolbar.appendChild(pause);
    const updateAudio = () => { pause.disabled = !narrationAudio.src || narrationAudio.ended; pause.textContent = narrationAudio.paused ? 'Resume narration' : 'Pause narration'; };
    ['play', 'pause', 'ended', 'emptied'].forEach(event => narrationAudio.addEventListener(event, updateAudio));
    pause.onclick = async () => { if (narrationAudio.paused) { try { await narrationAudio.play(); } catch { pause.textContent = 'Use Read this page to retry'; } } else narrationAudio.pause(); };
    const explore = document.createElement('button'); explore.type = 'button'; explore.className = 'en-outline'; explore.id = 'apiExploreStory'; explore.textContent = 'Questions, words & discussion'; explore.setAttribute('aria-expanded', 'false');
    const reveal = () => { inner.classList.remove('reading-focused'); explore.setAttribute('aria-expanded', 'true'); explore.textContent = 'Focus on reading'; };
    explore.onclick = () => { if (inner.classList.contains('reading-focused')) reveal(); else { inner.classList.add('reading-focused'); explore.setAttribute('aria-expanded', 'false'); explore.textContent = 'Questions, words & discussion'; } };
    inner.querySelector('.book-modal-actions').appendChild(explore);
    inner.querySelector('#apiCompleteStory').addEventListener('click', reveal);
    const series = document.createElement('section'); series.className = 'reader-series';
    series.innerHTML = `<p>${story.content?.meta?.chapter ? `Chapter ${Number(story.content.meta.chapter)} · ` : ''}Choose → read → discuss → continue tomorrow.</p>${story.content?.meta?.sharedSeriesCover ? '<small>This chapter shares its series cover.</small>' : ''}`;
    inner.appendChild(series);
    const sharing = document.createElement('details'); sharing.className = 'reader-family-share';
    sharing.innerHTML = `<summary>Share with a sibling</summary><p>A separate copy goes into their library with their own reading progress. The reading level stays the same.</p>${isChildSession ? '' : '<label><input type="checkbox" id="allowSiblingSharing"> Allow children in this family to share stories</label>'}<div class="sibling-share-choices"></div><p role="status" aria-live="polite"></p>`;
    inner.querySelector('.book-modal-actions').after(sharing);
    const shareStatus = sharing.querySelector('[role="status"]');
    const loadSharing = async () => {
      try {
        const data = await api(`/api/reading/stories/${story.id}/sharing`);
        if (!sharing.isConnected) return;
        const toggle = sharing.querySelector('#allowSiblingSharing'); if (toggle) toggle.checked = data.enabled;
        const choices = sharing.querySelector('.sibling-share-choices');
        if (!data.enabled) { choices.innerHTML = '<p>A parent needs to enable sibling sharing first.</p>'; return; }
        if (!data.learners.length) { choices.innerHTML = '<p>Add another learner to your family to share stories.</p>'; return; }
        choices.innerHTML = `<label for="siblingRecipient">Choose a sibling</label><select id="siblingRecipient" class="en-select">${data.learners.map(l => `<option value="${esc(l.id)}">${esc(l.first_name)}</option>`).join('')}</select><button type="button" class="en-button">Share story</button>`;
        choices.querySelector('button').onclick = async () => {
          const button = choices.querySelector('button'); button.disabled = true; shareStatus.textContent = 'Sharing…';
          try { const result = await api(`/api/reading/stories/${story.id}/sharing`, { method: 'POST', body: JSON.stringify({ learnerId: choices.querySelector('select').value }) }); shareStatus.textContent = result.alreadyShared ? 'This story is already in their library.' : 'Shared! They can find the story in their library after refreshing.'; }
          catch (error) { shareStatus.textContent = error.message; } finally { button.disabled = false; }
        };
      } catch (error) { shareStatus.textContent = error.message; }
    };
    sharing.addEventListener('toggle', () => { if (sharing.open) loadSharing(); });
    sharing.querySelector('#allowSiblingSharing')?.addEventListener('change', async event => {
      const toggle = event.target; toggle.disabled = true;
      try { await api('/api/reading/sharing/settings', { method: 'PUT', body: JSON.stringify({ enabled: toggle.checked }) }); shareStatus.textContent = toggle.checked ? 'Sibling sharing enabled.' : 'New sharing disabled. Existing copies stay in their libraries.'; await loadSharing(); }
      catch (error) { toggle.checked = !toggle.checked; shareStatus.textContent = error.message; } finally { toggle.disabled = false; }
    });
    if (!isChildSession) {
      const adult = document.createElement('details'); adult.className = 'reader-adult-notes';
      adult.innerHTML = '<summary>Parent notes after reading</summary><form><label for="readingHelp">How much help did your child need with the story questions?</label><select id="readingHelp" class="en-select"><option value="not_observed">Not observed</option><option value="independent">Answered independently</option><option value="some_help">Needed some help</option><option value="read_together">We read and answered together</option></select><label for="readingObservation">One thing you noticed (optional)</label><textarea id="readingObservation" class="en-input" maxlength="500" placeholder="For example: explained why the character shared the map"></textarea><button class="en-button" type="submit">Save observation</button><p role="status"></p></form>';
      inner.appendChild(adult);
      let edited = false;
      adult.addEventListener('input', () => { edited = true; });
      api(`/api/reading/learners/${encodeURIComponent(story.learner_id || story.learnerId)}`).then(data => { const saved = data.observations.find(o => o.story_id === story.id); if (saved && !edited && adult.isConnected) { adult.querySelector('select').value = saved.assistance; adult.querySelector('textarea').value = saved.note; } }).catch(() => {});
      adult.querySelector('form').onsubmit = async event => { event.preventDefault(); const button = adult.querySelector('button'); button.disabled = true; try { await api(`/api/reading/stories/${story.id}/observation`, { method: 'PUT', body: JSON.stringify({ assistance: adult.querySelector('select').value, note: adult.querySelector('textarea').value }) }); adult.querySelector('[role="status"]').textContent = 'Observation saved. This records what you noticed, not a diagnosis or reading level.'; renderProgress({ learnerId: story.learner_id || story.learnerId, api, esc, openStory, isChildSession }); } catch (error) { adult.querySelector('[role="status"]').textContent = error.message; } finally { button.disabled = false; } };
    }
    const sessionId = crypto.randomUUID();
    let activeSeconds = 0, previous = performance.now(), lastInteraction = previous, lastSaved = 0;
    const interact = () => { lastInteraction = performance.now(); };
    ['pointerdown', 'keydown', 'scroll'].forEach(event => modal.addEventListener(event, interact, true));
    const save = () => { if (activeSeconds <= lastSaved) return; const sent = activeSeconds; api(`/api/reading/stories/${story.id}/session`, { method: 'PUT', keepalive: true, body: JSON.stringify({ sessionId, activeSeconds: sent }) }).then(() => { lastSaved = Math.max(lastSaved, sent); }).catch(() => {}); };
    const tick = () => { const now = performance.now(); if (document.visibilityState === 'visible' && document.hasFocus() && (now - lastInteraction < 60000 || !narrationAudio.paused)) activeSeconds = Math.min(7200, activeSeconds + Math.min(10, Math.floor((now - previous) / 1000))); previous = now; };
    const timer = setInterval(() => { tick(); save(); }, 10000);
    const hide = () => { tick(); save(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', hide);
    const observer = new MutationObserver(() => { if (!modal.isConnected) { tick(); save(); clearInterval(timer); observer.disconnect(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); stopNarration(); } });
    observer.observe(document.body, { childList: true });
  }
  window.StorySproutReading = { mountReader, renderProgress };
})();
