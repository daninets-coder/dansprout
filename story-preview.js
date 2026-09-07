(() => {
  const form = document.querySelector('#createStory');
  const escapeHtml = value => { const node = document.createElement('div'); node.textContent = String(value); return node.innerHTML; };
  let pendingPrompt = '';
  const overlay = document.createElement('div');
  overlay.id = 'storyPreview';
  overlay.className = 'story-preview hidden';
  document.body.appendChild(overlay);

  document.querySelector('#storyPrompt').addEventListener('input', event => {
    pendingPrompt = event.target.value.trim();
  });

  function pickStory(student, goal, prompt) {
    const ageBand = student.split('ages ')[1] || '6-8';
    const words = prompt.toLowerCase().match(/[a-z]+/g) || [];
    const ranked = window.StorySproutLibrary
      .map(story => ({
        story,
        score: (story.ageBands.includes(ageBand) ? 4 : 0)
          + (story.goal === goal ? 6 : 0)
          + story.tags.filter(tag => words.includes(tag)).length,
      }))
      .sort((left, right) => right.score - left.score);

    return ranked[0].story;
  }

  function personalize(text, student) {
    return text.replaceAll('{name}', student);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();

    const selectedStudent = document.querySelector('#storyStudent').selectedOptions[0].textContent;
    const student = selectedStudent.split(' | ')[0];
    const goal = document.querySelector('#storyGoal').value;
    const prompt = pendingPrompt;
    if (!prompt) return;
    const story = pickStory(selectedStudent, goal, prompt);

    overlay.innerHTML = `<article class="preview-book" role="dialog" aria-modal="true" aria-label="New personalized story">
      <button class="preview-close" id="closePreview" aria-label="Close story preview">x</button>
      <div class="preview-eyebrow">A REVIEWED STORY FOR ${escapeHtml(student).toUpperCase()}</div>
      <h1>${escapeHtml(personalize(story.title, student))}</h1>
      <p class="preview-goal">Learning focus: ${escapeHtml(story.goal)} | Selected from the Story Sprout Library</p>
      <div class="preview-scene"><span class="preview-moon"></span><span class="preview-hill"></span><span class="preview-house"></span></div>
      <p class="preview-copy">${escapeHtml(personalize(story.pages[0], student))}</p>
      <p class="preview-copy">${escapeHtml(personalize(story.pages[1], student))}</p>
      <p class="preview-copy">${escapeHtml(personalize(story.pages[2], student))}</p>
      <div class="preview-question"><strong>Talk together</strong><br>${escapeHtml(personalize(story.question, student))}</div>
      <button class="en-button" id="finishPreview">Finish reading</button>
    </article>`;
    overlay.classList.remove('hidden');
    const toast = document.querySelector('#enToast');
    if (toast) toast.textContent = `Story preview ready for ${student}.`;
    pendingPrompt = '';
    document.querySelector('#closePreview').onclick = () => overlay.classList.add('hidden');
    document.querySelector('#finishPreview').onclick = () => overlay.classList.add('hidden');
  }, true);
})();
