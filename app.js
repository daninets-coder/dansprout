(() => {
  const appRoot = document.querySelector('.app');
  if (!appRoot) return;

  const token = localStorage.getItem('storySproutToken');
  if (token) return;

  const brandName = 'StoryAura Land';

  appRoot.innerHTML = `
    <header class="landing-header">
      <div class="brand"><span class="sprout"></span>${brandName}</div>
      <div class="top-actions">
        <nav class="marketing-nav" aria-label="${brandName} account">
          <a href="#how-it-works">How it works</a>
          <a href="#inside">Inside a story</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
          <button type="button" class="marketing-link" data-auth-open="login">Sign in</button>
          <button type="button" class="marketing-cta" data-auth-open="register">Get started free</button>
        </nav>
      </div>
    </header>
    <main class="shell">
      <section id="landingView">
        <div class="landing-hero">
          <div class="landing-hero-copy">
            <div class="eyebrow">PERSONALIZED READING FOR FAMILIES</div>
            <h1>Stories kids want to <span class="landing-highlight">keep opening.</span></h1>
            <p class="lede">${brandName} turns a child&#39;s name, interests, and reading goal into an illustrated story a parent opens on a computer and reads with the child on screen.</p>
            <div class="landing-cta-row">
              <button type="button" class="landing-cta-primary" data-auth-open="register">Get started free</button>
              <button type="button" class="landing-cta-secondary" id="sampleStoryOpen">Read a sample story</button>
            </div>
            <ul class="landing-trust" aria-label="Why parents trust ${brandName}">
              <li>Adult-managed accounts</li>
              <li>Private family libraries</li>
              <li>No public feed</li>
              <li>Built for K–8 readers</li>
            </ul>
          </div>
          <div class="landing-hero-image">
            <figure class="hero-frame">
              <img src="images/parentChildAnime-poster1.png" width="960" height="840" alt="A parent and child create a story on a computer, read it together, build a reading habit, and keep it on a private family shelf">
            </figure>
          </div>
        </div>

        <div class="landing-preview" aria-label="Example stories">
          <span class="landing-preview-label">Stories families are reading</span>
          <div class="preview-card">
            <div class="preview-avatar"><img src="imagesAI/avatars/maya-avatar.png" alt=""></div>
            <div class="preview-copy">
              <strong>Maya</strong>
              <span>Moonlight rescue &middot; guided reading</span>
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-avatar"><img src="imagesAI/avatars/theo-avatar.png" alt=""></div>
            <div class="preview-copy">
              <strong>Theo</strong>
              <span>Rainforest quest &middot; new words in context</span>
            </div>
          </div>
          <div class="preview-card">
            <div class="preview-avatar"><img src="imagesAI/avatars/priya-avatar.png" alt=""></div>
            <div class="preview-copy">
              <strong>Priya</strong>
              <span>Ocean mystery &middot; progress trail</span>
            </div>
          </div>
        </div>

        <section class="landing-section landing-video" id="watch">
          <div class="eyebrow">SEE IT IN ACTION</div>
          <h2>See ${brandName} in action.</h2>
          <p class="landing-section-lede">A quick look at how a story goes from your child&#39;s ideas to a page they can read, hear, and understand.</p>
          <div class="landing-video-frame">
            <video controls playsinline preload="none" poster="images/brand/reel-poster.jpg" aria-label="Short video showing how ${brandName} turns a child&#39;s interests into a story">
              <source src="video/StoryAura_Land_Reel.mp4" type="video/mp4">
              Your browser cannot play this video. You can still read a sample story above.
            </video>
          </div>
        </section>

        <section class="landing-section landing-workflow" id="how-it-works">
          <div class="eyebrow">HOW IT WORKS</div>
          <h2>From a quiet evening to a star on the fridge.</h2>
          <p class="landing-section-lede">One short routine: the parent sets it up, the child brings the ideas, and you read the finished story together.</p>
          <figure class="workflow-figure">
            <div class="workflow-scroll" tabindex="0" aria-label="Story workflow illustration. Scroll sideways on small screens.">
              <img src="images/storyWorkFlow.jpg" width="1376" height="768" loading="lazy" alt="Five illustrated panels: a parent sets up ${brandName} on a laptop, the child shares interests like dinosaurs, rockets and soccer, the child whispers story ideas, parent and child read the story together on the couch, and the child adds a star to a chart on the fridge.">
            </div>
          </figure>
          <ol class="workflow-steps">
            <li>
              <span class="workflow-step-number">1</span>
              <h3>Evening set-up</h3>
              <p>A parent signs in and adds a learner profile with a reading level and goal.</p>
            </li>
            <li>
              <span class="workflow-step-number">2</span>
              <h3>Sharing interests</h3>
              <p>The child shares what they love: dinosaurs, rockets, soccer, or school subjects.</p>
            </li>
            <li>
              <span class="workflow-step-number">3</span>
              <h3>Whispered imagination</h3>
              <p>Those ideas become an illustrated story built around the child.</p>
            </li>
            <li>
              <span class="workflow-step-number">4</span>
              <h3>Story time</h3>
              <p>Open it on a computer and read it together, page by page.</p>
            </li>
            <li>
              <span class="workflow-step-number">5</span>
              <h3>Star chart success</h3>
              <p>Story questions and saved progress make every finished story worth celebrating.</p>
            </li>
          </ol>
        </section>

        <section class="landing-section landing-inside" id="inside">
          <div class="eyebrow">INSIDE EVERY STORY</div>
          <h2>More than a story: words, questions, and sharing built in.</h2>
          <p class="landing-section-lede">Every story ${brandName} creates comes with tools that turn reading time into real reading practice.</p>
          <div class="inside-grid">
            <article class="inside-card">
              <div class="inside-demo inside-demo-words" aria-hidden="true">
                <p class="inside-demo-text">The garden <span class="inside-word">shimmered</span> under the moon.</p>
                <div class="inside-garden">
                  <span class="inside-garden-title">&#127793; Word garden</span>
                  <div class="inside-leaf"><strong>shimmered</strong><span>shone with a soft, flickering light</span></div>
                  <div class="inside-leaf"><strong>curious</strong><span>wanting to find out more</span></div>
                </div>
              </div>
              <h3>Word garden</h3>
              <p>Tap any word in the story to hear it and save a kid-friendly definition. Each story also plants 2–3 key words to learn.</p>
            </article>
            <article class="inside-card">
              <div class="inside-demo inside-demo-quiz" aria-hidden="true">
                <span class="inside-demo-label">Question 1 of 3</span>
                <p class="inside-question">Why did the seed glow brighter?</p>
                <span class="inside-option">It was almost morning</span>
                <span class="inside-option is-correct">Maya helped the fox</span>
                <span class="inside-evidence">Story evidence: &ldquo;The seed glowed brighter each time Maya helped.&rdquo;</span>
              </div>
              <h3>Comprehension questions</h3>
              <p>Three multiple-choice questions after each story, answered from the text and scored instantly, with the sentence that proves each answer.</p>
            </article>
            <article class="inside-card">
              <div class="inside-demo inside-demo-share" aria-hidden="true">
                <div class="inside-share-book">
                  <span class="inside-share-cover"></span>
                  <div><strong>Maya and the Moonlight Garden</strong><span>Grade 2 &middot; 8 pages</span></div>
                </div>
                <div class="inside-share-to">
                  <img src="imagesAI/avatars/maya-avatar.png" alt="">
                  <span class="inside-share-arrow">&rarr;</span>
                  <img src="imagesAI/avatars/theo-avatar.png" alt="">
                  <span class="inside-share-pill">Share story</span>
                </div>
                <span class="inside-share-status">&#10003; Shared. Theo can open it from Saved stories.</span>
              </div>
              <h3>Share with siblings</h3>
              <p>Loved a story? Share it with a brother or sister in your family account. Parents turn sharing on, and it lands on their shelf.</p>
            </article>
          </div>
        </section>

        <section class="landing-section" id="features">
          <div class="eyebrow">WHY FAMILIES SUBSCRIBE</div>
          <h2>Personal stories with real reading practice inside.</h2>
          <div class="features-grid">
            <div class="feature-card">
              <span class="feature-icon" aria-hidden="true">&#9998;</span>
              <h3>Built around the child</h3>
              <p>Their name, interests, and reading goal shape every story, so it feels like it was made for them.</p>
            </div>
            <div class="feature-card">
              <span class="feature-icon" aria-hidden="true">&#128218;</span>
              <h3>Matched to their level</h3>
              <p>Choose a grade from K–8 and a reading goal. Stories are written at that level, with new words taught in context.</p>
            </div>
            <div class="feature-card">
              <span class="feature-icon" aria-hidden="true">&#128172;</span>
              <h3>Talk-together prompts</h3>
              <p>Every story ends with a reflection question, so reading time turns into a real conversation with your child.</p>
            </div>
            <div class="feature-card">
              <span class="feature-icon" aria-hidden="true">&#128266;</span>
              <h3>Read together, or listen</h3>
              <p>Read page by page on a computer, or turn on narration when younger readers want to follow along.</p>
            </div>
          </div>
        </section>

        <section class="landing-section landing-split">
          <div class="landing-split-copy">
            <div class="eyebrow">READING PROGRESS</div>
            <h2>Know what they understood, not just what they read.</h2>
            <ul class="landing-checklist">
              <li><strong>Instant story checks.</strong> Answers are scored right away, with the story evidence behind each question.</li>
              <li><strong>Parent notes after reading.</strong> Record how much help your child needed and anything you noticed.</li>
              <li><strong>A shelf they return to.</strong> Saved stories and progress stay in one private place, ready for the next session.</li>
              <li><strong>Progress you can download.</strong> Export a progress PDF for your own records or to share with a teacher.</li>
            </ul>
          </div>
          <div class="landing-split-media">
            <img src="images/storyaura-bed-reading.jpg" loading="lazy" alt="A child reading a book in bed by a bright window">
          </div>
        </section>

        <section class="landing-section landing-privacy" id="privacy">
          <div class="eyebrow">PRIVATE FAMILY SPACE</div>
          <h2>Adults stay in control of every account.</h2>
          <p class="landing-section-lede">No public feed, no child sign-ups, and no strangers. Just a private story shelf centered on your child.</p>
          <div class="privacy-points">
            <div><strong>Adults approve profiles</strong><span>Learner profiles are created and managed by a parent or caregiver.</span></div>
            <div><strong>Adults manage logins</strong><span>Child logins are set up from the parent side, never self-registered.</span></div>
            <div><strong>Export or delete</strong><span>Download your family&#39;s data or remove it at any time.</span></div>
          </div>
        </section>

        <section class="landing-section landing-testimonials">
          <div class="eyebrow">FROM OUR EARLY FAMILY TESTERS</div>
          <h2>Less guessing. More reading.</h2>
          <div class="testimonial-grid">
            <blockquote class="testimonial">
              <p>&ldquo;The story feels like it was built for my child instead of just being assigned to them.&rdquo;</p>
              <footer>Parent tester</footer>
            </blockquote>
            <blockquote class="testimonial">
              <p>&ldquo;The next step is obvious, and that makes it easier to keep going tomorrow.&rdquo;</p>
              <footer>Caregiver tester</footer>
            </blockquote>
            <blockquote class="testimonial">
              <p>&ldquo;The preview made me want the private version right away.&rdquo;</p>
              <footer>Early signup tester</footer>
            </blockquote>
          </div>
          <p class="landing-proof-note">Want to judge for yourself? <button type="button" class="landing-inline-link" data-sample-open>Read the sample story</button> in under two minutes.</p>
        </section>

        <section class="landing-section" id="faq">
          <div class="eyebrow">COMMON QUESTIONS</div>
          <h2>What parents usually want to know before they start.</h2>
          <div class="faq-list">
            <details class="faq-item" open>
              <summary>Is this just a story generator?</summary>
              <p>No. It is a private reading space where stories, goals, story checks, and progress stay together so families can come back to the same shelf again and again.</p>
            </details>
            <details class="faq-item">
              <summary>Can I use school subjects as interests?</summary>
              <p>Yes. Interests can include hobbies, favorite topics, or school subjects like science, math, and social studies.</p>
            </details>
            <details class="faq-item">
              <summary>Do children create their own accounts?</summary>
              <p>No. Adults create and manage learner profiles, child logins, and privacy settings from the parent side.</p>
            </details>
            <details class="faq-item">
              <summary>What happens if I cancel?</summary>
              <p>Canceling stops future renewal. Learner profiles, stories, and reading progress stay in your account, and you can export or delete your data at any time.</p>
            </details>
          </div>
        </section>

        <section class="landing-final-cta">
          <div class="eyebrow">READY TO TRY IT?</div>
          <h2>Create a private reading space your child will want to return to.</h2>
          <p class="lede">Create a free account and make your first story tonight, built around your child&#39;s name, interests, and reading goal.</p>
          <div class="landing-cta-row landing-final-actions">
            <button type="button" class="landing-cta-primary" data-auth-open="register">Create your free account</button>
            <button type="button" class="landing-cta-secondary" data-sample-open>Read a sample story</button>
          </div>
        </section>
      </section>
    </main>
    <div class="sample-story-backdrop hidden" id="sampleStoryBackdrop" aria-hidden="true">
      <section class="sample-story-card" role="dialog" aria-modal="true" aria-labelledby="sampleStoryTitle">
        <button type="button" class="sample-story-close" id="sampleStoryClose" aria-label="Close sample story">×</button>
        <div class="sample-story-badge">SAMPLE STORY</div>
        <h2 id="sampleStoryTitle">The Moonseed Helpers</h2>
        <p class="sample-story-meta">A fictional preview. We do not use a child&#39;s name or personal details here.</p>
        <div class="sample-story-note">
          <strong>Private by design.</strong>
          <p>This preview is a teaser. Register to unlock a version built from the details you choose inside your private account, then read it together on a screen.</p>
        </div>
        <div class="sample-story-goals" aria-label="Sample reading goals">
          <span>Inference</span>
          <span>Evidence</span>
          <span>Vocabulary in context</span>
        </div>
        <div class="sample-story-scene" aria-hidden="true">
          <img class="sample-story-photo" src="images/storyaura-tent-reading.jpg" alt="">
          <span class="sample-scene-tint"></span>
          <span class="sample-moon"></span>
          <span class="sample-cloud sample-cloud-1"></span>
          <span class="sample-cloud sample-cloud-2"></span>
          <span class="sample-hill"></span>
          <span class="sample-house"></span>
          <span class="sample-page-flash"></span>
        </div>
        <div class="sample-story-pages" id="sampleStoryPages"></div>
        <div class="sample-story-choice" id="sampleStoryChoice"></div>
        <div class="sample-story-outro hidden" id="sampleStoryOutro">
          <div class="sample-story-outro-copy"></div>
          <button type="button" class="sample-story-try" id="sampleStoryTry">Try another ending</button>
        </div>
        <div class="sample-story-hidden hidden" id="sampleStoryHidden">
          <div class="sample-story-hidden-copy"></div>
          <div class="sample-story-hidden-actions">
            <button type="button" class="sample-story-unlock" data-auth-open="register">Unlock this hidden scene</button>
            <span>The personalized version opens after sign-up.</span>
          </div>
        </div>
        <div class="sample-story-footer">
          <span id="sampleStoryCue">Soft page-turn chime</span>
          <div class="sample-story-footer-actions">
            <button type="button" class="sample-story-unlock" data-auth-open="register">Unlock the personalized version</button>
            <button type="button" class="sample-story-finish" id="sampleStoryFinish">Finish reading</button>
          </div>
        </div>
      </section>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  const sampleBackdrop = document.querySelector('#sampleStoryBackdrop');
  const sampleButton = document.querySelector('#sampleStoryOpen');
  const sampleClose = document.querySelector('#sampleStoryClose');
  const sampleFinish = document.querySelector('#sampleStoryFinish');
  const sampleTry = document.querySelector('#sampleStoryTry');
  const sampleChoice = document.querySelector('#sampleStoryChoice');
  const sampleOutro = document.querySelector('#sampleStoryOutro');
  const sampleHidden = document.querySelector('#sampleStoryHidden');
  const samplePages = document.querySelector('#sampleStoryPages');
  const sampleCue = document.querySelector('#sampleStoryCue');
  const sampleCard = document.querySelector('.sample-story-card');

  const sampleStory = {
    intro: {
      pages: [
        'Maya found a silver seed on the porch just after dinner. It glowed softly, like a tiny lamp waiting for a friend.',
        'The seed led Maya into the garden, where a sleepy fox was trying to carry moonlight in a bucket. "I think the moon is leaking," Maya whispered.'
      ],
      question: 'Which clue should Maya trust first: the glow or the whisper?',
      outro: 'The next pages stay hidden in this teaser. The full story reveals a new clue, a secret doorway, and a much stranger ending.',
      hidden: 'Behind the vines, a small door opens only when someone notices the right clue. The real story keeps going from there.',
      goals: ['Inference', 'Evidence', 'Prediction']
    },
    care: {
      pages: [
        'Maya held the moonseed in both hands and walked carefully toward the fox. The fox yawned, then smiled when the glow reached its whiskers.',
        'Together they set the bucket under the moonbeam. The seed hummed once, and the garden turned bright enough for new shadows to dance.'
      ],
      question: 'What does the bright garden tell you about the moonseed?',
      outro: 'That ending is bright and kind. The hidden scene adds a different clue and a sharper reading challenge.',
      hidden: 'A second page waits behind the light: the fox notices a carved mark on the bucket that only appears in moonlight.',
      goals: ['Cause and effect', 'Evidence', 'Vocabulary in context']
    },
    listen: {
      pages: [
        'Maya knelt beside the seed and listened. It made a tiny chiming sound, like a spoon tapping a glass star.',
        'The fox heard it too and followed the sound to the moonbeam. Once they found it, the bucket filled with light all by itself.'
      ],
      question: 'What detail proves the moonseed is trying to guide them?',
      outro: 'That ending is quiet and strange. The hidden scene turns the same clue into a new adventure.',
      hidden: 'The seed has one more secret: if the reader notices the sound pattern, the garden opens a route to the sky.',
      goals: ['Inference', 'Sequencing', 'Vocabulary in context']
    }
  };

  const audioContext = window.AudioContext || window.webkitAudioContext;
  let cueContext = null;
  const playCue = kind => {
    if (!audioContext) return;
    cueContext = cueContext || new audioContext();
    if (cueContext.state === 'suspended') cueContext.resume().catch(() => {});
    const now = cueContext.currentTime;
    const gain = cueContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    gain.connect(cueContext.destination);
    const chords = kind === 'finish'
      ? [523.25, 659.25]
      : kind === 'open'
        ? [392, 523.25]
        : [659.25, 783.99];
    chords.forEach((frequency, index) => {
      const osc = cueContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now + index * 0.08);
      osc.connect(gain);
      osc.start(now + index * 0.08);
      osc.stop(now + 0.22 + index * 0.08);
    });
  };

  const renderSample = state => {
    const story = sampleStory[state];
    samplePages.innerHTML = story.pages.map(page => `<p class="sample-story-page">${page}</p>`).join('');
    sampleChoice.innerHTML = `<strong>Talk together</strong><p class="sample-story-prompt">${story.question}</p><div class="sample-story-actions"><button type="button" class="sample-story-option${state === 'care' ? ' selected' : ''}" data-sample-choice="care">Follow the glow</button><button type="button" class="sample-story-option${state === 'listen' ? ' selected' : ''}" data-sample-choice="listen">Listen for the whisper</button></div>`;
    sampleBackdrop.dataset.sampleState = state;
    sampleOutro.classList.toggle('hidden', state === 'intro');
    sampleOutro.querySelector('.sample-story-outro-copy').textContent = story.outro;
    sampleHidden.classList.toggle('hidden', state === 'intro');
    sampleHidden.querySelector('.sample-story-hidden-copy').textContent = story.hidden;
    sampleHidden.querySelector('.sample-story-hidden-actions span').textContent = `Reading goals: ${story.goals.join(' · ')}.`;
    sampleTry.textContent = state === 'care' ? 'Try the other ending' : 'Try another ending';
    sampleCue.textContent = state === 'intro' ? 'Soft page-turn chime' : 'Another page-turn chime';
    sampleCard.classList.remove('is-turning');
    void sampleCard.offsetWidth;
    sampleCard.classList.add('is-turning');
    window.setTimeout(() => sampleCard.classList.remove('is-turning'), 260);
    playCue(state === 'intro' ? 'open' : 'turn');
  };

  const openSample = () => {
    renderSample('intro');
    sampleBackdrop.classList.remove('hidden');
    sampleBackdrop.setAttribute('aria-hidden', 'false');
  };
  const closeSample = () => {
    sampleBackdrop.classList.add('hidden');
    sampleBackdrop.setAttribute('aria-hidden', 'true');
  };

  sampleButton?.addEventListener('click', openSample);
  document.querySelectorAll('[data-sample-open]').forEach(button => button.addEventListener('click', openSample));
  sampleClose?.addEventListener('click', closeSample);
  sampleFinish?.addEventListener('click', () => {
    playCue('finish');
    closeSample();
  });
  sampleBackdrop?.addEventListener('click', event => { if (event.target === sampleBackdrop) closeSample(); });
  sampleBackdrop?.addEventListener('click', event => {
    const choice = event.target.closest?.('[data-sample-choice]');
    if (!choice) return;
    renderSample(choice.dataset.sampleChoice === 'listen' ? 'listen' : 'care');
  });
  sampleTry?.addEventListener('click', () => {
    const currentState = sampleBackdrop.dataset.sampleState === 'listen' ? 'listen' : 'care';
    renderSample(currentState === 'care' ? 'listen' : 'care');
  });
  sampleBackdrop?.addEventListener('click', event => {
    const registerPrompt = event.target.closest?.('[data-auth-open="register"]');
    if (registerPrompt) {
      sessionStorage.setItem('storyAuraLandTeaserSource', 'sample-story');
      closeSample();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !sampleBackdrop.classList.contains('hidden')) closeSample();
  });
})();
