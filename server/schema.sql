CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'parent' CHECK ("role" IN ('parent', 'teacher', 'administrator')),
    consented_at TIMESTAMPTZ NOT NULL,
    ai_external_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    ai_opt_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learners (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    age_band TEXT NOT NULL CHECK (age_band IN ('3-5', '6-8', '9-11')),
    interests TEXT NOT NULL DEFAULT '',
    topics_to_avoid TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learner_goals (
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    PRIMARY KEY (learner_id, goal)
);

CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY,
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    theme TEXT NOT NULL,
    learning_goal TEXT NOT NULL,
    prompt TEXT NOT NULL,
    content JSONB NOT NULL,
    completed_at TIMESTAMPTZ,
    created_by TEXT NOT NULL DEFAULT 'local_app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('explorer', 'family', 'classroom')),
    status TEXT NOT NULL DEFAULT 'demo' CHECK (status IN ('demo', 'active', 'canceled')),
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_tracks (
    id UUID PRIMARY KEY,
    grade_level TEXT NOT NULL CHECK (grade_level IN ('PreK', 'K', '1', '2', '3', '4', '5', '6', '7', '8')),
    domain TEXT NOT NULL CHECK (domain IN ('oral_language', 'phonics', 'fluency', 'vocabulary', 'comprehension', 'writing_response', 'social_emotional_reading')),
    strand TEXT NOT NULL,
    standard_code TEXT NOT NULL UNIQUE,
    objective TEXT NOT NULL,
    skill_focus TEXT NOT NULL,
    instructional_priority TEXT NOT NULL,
    evidence_of_learning TEXT,
    source_framework TEXT NOT NULL,
    suggested_story_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_curriculum (
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    curriculum_id UUID NOT NULL REFERENCES curriculum_tracks(id) ON DELETE CASCADE,
    alignment_note TEXT,
    PRIMARY KEY (story_id, curriculum_id)
);

INSERT INTO curriculum_tracks (
    id, grade_level, domain, strand, standard_code, objective,
    skill_focus, instructional_priority, evidence_of_learning,
    source_framework, suggested_story_type
)
VALUES
    (md5(random()::text)::uuid, 'PreK', 'oral_language', 'Listening and Speaking', 'PreK-OL-1', 'Listen to stories and retell key events with pictures and oral language.', 'Narrative retell, listening comprehension, expressive language', 'Critical for early literacy because comprehension grows from rich oral language experiences.', 'Child retells the beginning, middle, and end of a read-aloud.', 'Head Start Early Learning Outcomes Framework; early literacy research', 'gentle bedtime story'),
    (md5(random()::text)::uuid, 'PreK', 'vocabulary', 'Word Knowledge', 'PreK-VOC-1', 'Use newly heard words in everyday conversation and story talk.', 'Vocabulary building, naming, language use', 'Strong vocabulary support improves background knowledge and later reading comprehension.', 'Child uses a target word in a sentence during discussion.', 'Early childhood literacy best practice', 'predictable story with rich vocabulary'),
    (md5(random()::text)::uuid, 'PreK', 'comprehension', 'Story Understanding', 'PreK-CMP-1', 'Identify characters, setting, and what happened in a familiar story.', 'Story elements, sequencing, comprehension', 'Children need repeated, concrete story experiences before abstract interpretation.', 'Child points to the character, place, and action in a story.', 'Early childhood comprehension research', 'simple character-and-setting story'),
    (md5(random()::text)::uuid, 'K', 'phonics', 'Foundational Reading', 'K-PHON-1', 'Recognize beginning sounds and apply them to decoding simple words.', 'Phonemic awareness, letter-sound relationship', 'Systematic phonics is the foundation for fluent reading in early grades.', 'Child identifies the starting sound in a word and reads a simple pattern word.', 'CCSS ELA, state K literacy standards', 'short decodable story'),
    (md5(random()::text)::uuid, 'K', 'fluency', 'Reading Fluency', 'K-FLU-1', 'Read high-frequency words and short texts with increasing smoothness and confidence.', 'Word recognition, pacing, rhythm', 'Fluency grows when students reread familiar texts with purpose and support.', 'Child reads a short repeated text accurately and with expression.', 'K-2 literacy best practice', 'repetitive read-aloud with rhyme'),
    (md5(random()::text)::uuid, 'K', 'comprehension', 'Story Retell', 'K-CMP-1', 'Retell a story in order and answer who, what, where, and when questions.', 'Sequencing, retell, key details', 'Children need explicit comprehension talk before they can infer meaning.', 'Child answers basic story questions using text details.', 'Kindergarten comprehension standards', 'predictable fiction story'),
    (md5(random()::text)::uuid, '1', 'phonics', 'Decoding', '1-PHON-1', 'Decode one-syllable words with common patterns and vowel sounds.', 'Decoding, phonics patterns, word solving', 'Explicit phonics instruction supports independent reading and confidence.', 'Child reads a short word list and decodes new words using patterns.', 'CCSS ELA grade 1', 'pattern-based decodable story'),
    (md5(random()::text)::uuid, '1', 'vocabulary', 'Word Meaning', '1-VOC-1', 'Use context clues and known words to understand story meaning.', 'Context clues, meaning in context', 'Vocabulary learning must connect to meaningful text, not isolated lists.', 'Child explains the meaning of a target word in a sentence from the story.', 'Reading workshop and vocabulary research', 'story with vivid context clues'),
    (md5(random()::text)::uuid, '1', 'comprehension', 'Main Idea and Details', '1-CMP-1', 'Identify important details and explain what the story is mostly about.', 'Main idea, story details, summarization', 'Students need to move from literal recall to summarizing what matters.', 'Child tells the main idea of a short story and supports it with details.', 'Grade 1 comprehension standards', 'short story with clear action'),
    (md5(random()::text)::uuid, '2', 'fluency', 'Expression and Accuracy', '2-FLU-1', 'Read grade-level text with accuracy, rate, and expression during repeated reading.', 'Fluency, prosody, accuracy', 'Fluency makes reading more automatic and frees attention for comprehension.', 'Child reads a familiar passage fluently and with appropriate expression.', 'Reading fluency research', 'repeated reading story'),
    (md5(random()::text)::uuid, '2', 'vocabulary', 'Academic Language', '2-VOC-1', 'Learn and use descriptive and content-rich words in oral and written discussion.', 'Tier 2 vocabulary, discussion, expression', 'Rich oral talk is a bridge to reading complexity and comprehension.', 'Child explains a new word and uses it in a sentence about the story.', 'State literacy standards; vocabulary instruction research', 'rich descriptive story narrative'),
    (md5(random()::text)::uuid, '2', 'comprehension', 'Character and Plot', '2-CMP-1', 'Describe character feelings, decisions, and how events affect the plot.', 'Character analysis, plot, inference', 'Students build strong comprehension when they notice how characters change.', 'Child explains how a character felt and why the event mattered.', 'Grade 2 reading standards', 'character-driven story'),
    (md5(random()::text)::uuid, '3', 'comprehension', 'Literary Analysis', '3-CMP-1', 'Use text evidence to explain character motivation, setting, and conflict.', 'Inference, evidence, plot', 'Character-based reading grows comprehension and critical thinking.', 'Child cites specific story details to explain a character choice.', 'CCSS ELA grade 3', 'story with conflict and resolution'),
    (md5(random()::text)::uuid, '3', 'fluency', 'Text Complexity', '3-FLU-1', 'Read longer texts with accuracy and speed while maintaining understanding.', 'Fluency, pacing, comprehension', 'Fluency supports students as text length and complexity increase.', 'Child reads a longer passage smoothly and retells the main events.', 'Reading science research', 'chapter-style read-aloud story'),
    (md5(random()::text)::uuid, '3', 'writing_response', 'Written Reflection', '3-WR-1', 'Respond in writing to a story by identifying a key idea and personal connection.', 'Short response, evidence, reflection', 'Writing about reading deepens comprehension and helps students notice text meaning.', 'Child writes a brief response with one text detail and one personal connection.', 'Writing-to-learn literacy practices', 'story followed by comprehension reflection'),
    (md5(random()::text)::uuid, '4', 'comprehension', 'Theme and Evidence', '4-CMP-1', 'Infer the theme of a story and support it with details from the text.', 'Theme, inference, evidence', 'Middle elementary students are ready to move beyond plot summary into deeper meaning.', 'Child explains the story lesson and supports it with text evidence.', 'CCSS ELA grades 4-5', 'moral or theme-based story'),
    (md5(random()::text)::uuid, '4', 'vocabulary', 'Academic Vocabulary', '4-VOC-1', 'Use context clues and word parts to understand new academic vocabulary.', 'Word study, morphology, context', 'Vocabulary instruction needs to transfer to reading and discussion.', 'Child identifies a word meaning from clues and uses it in a response.', 'Academic vocabulary research', 'informational narrative with domain vocabulary'),
    (md5(random()::text)::uuid, '4', 'social_emotional_reading', 'Reader Identity', '4-SEL-1', 'Use reading experiences to recognize feelings, identity, and resilience.', 'Self-awareness, empathy, reading confidence', 'Books are powerful tools for developing emotional understanding and confidence.', 'Child connects the story to a feeling or a challenge in their own life.', 'SEL and literacy integration research', 'identity-centred story'),
    (md5(random()::text)::uuid, '5', 'comprehension', 'Analysis and Perspective', '5-CMP-1', 'Compare points of view and explain how different perspectives shape understanding.', 'Perspective, comparison, interpretation', 'Older elementary readers benefit from noticing how voice and viewpoint change meaning.', 'Child explains how a different viewpoint changes the story.', 'Upper elementary ELA standards', 'multi-perspective narrative'),
    (md5(random()::text)::uuid, '5', 'writing_response', 'Text-Based Writing', '5-WR-1', 'Write a clear response using evidence and logical organization.', 'Paragraph structure, evidence, organization', 'Students connect reading and writing through structured, text-based responses.', 'Child writes a paragraph with a claim, evidence, and explanation.', 'Writing standards for grades 4-5', 'argument or reflection response'),
    (md5(random()::text)::uuid, '5', 'fluency', 'Reading for Meaning', '5-FLU-1', 'Read with expression and pacing that supports understanding of complex text.', 'Expression, phrasing, comprehension', 'Fluency must support understanding, not just speed.', 'Child reads a longer narrative with appropriate expression and explains the meaning.', 'Fluency and comprehension research', 'narrative with layered meaning'),
    (md5(random()::text)::uuid, '6', 'comprehension', 'Text Structure', '6-CMP-1', 'Analyze how text structure shapes meaning and helps readers understand ideas.', 'Text structure, organization, analysis', 'Readers in middle grades must understand how structure guides comprehension.', 'Child identifies the structure of a text and explains how it helps the reader.', 'Middle school ELA standards', 'informational narrative or compare-contrast story'),
    (md5(random()::text)::uuid, '6', 'vocabulary', 'Contextual Vocabulary', '6-VOC-1', 'Infer word meanings from context, tone, and surrounding ideas.', 'Context clues, nuance, inference', 'Students need strong vocabulary strategies to read increasingly complex text.', 'Child explains the meaning of a phrase or word based on its surrounding details.', 'Middle grade literacy standards', 'text-rich story with layered vocabulary'),
    (md5(random()::text)::uuid, '6', 'social_emotional_reading', 'Resilience and Empathy', '6-SEL-1', 'Use literature to discuss emotional growth, identity, and resilience.', 'Empathy, resilience, reflective thinking', 'Middle-grade readers often need stories that validate feelings and growth.', 'Child connects the story to a challenge and identifies strengths shown by the character.', 'Adolescent literacy and SEL integration', 'realistic contemporary story'),
    (md5(random()::text)::uuid, '7', 'comprehension', 'Author Craft', '7-CMP-1', 'Analyze how tone, word choice, and structure influence meaning.', 'Author craft, literary analysis, interpretation', 'Students should notice how writers shape meaning, not just what happened.', 'Child explains how the author’s word choice creates mood or emphasis.', 'Grade 7 ELA standards', 'literary narrative with mood and tone'),
    (md5(random()::text)::uuid, '7', 'writing_response', 'Evidence-Based Critique', '7-WR-1', 'Write analytical responses that explain a claim using text evidence and reasoning.', 'Argument from text, analysis, structure', 'Analytical writing improves when students reason from evidence, not opinion alone.', 'Child writes a claim and supports it with several examples from the story.', 'Middle grades writing standards', 'analysis-style reading response'),
    (md5(random()::text)::uuid, '7', 'fluency', 'Reading for Depth', '7-FLU-1', 'Sustain fluent, expressive reading across longer and denser texts.', 'Prosody, pacing, sustained comprehension', 'Fluency remains essential as texts become longer and conceptually demanding.', 'Child reads a longer passage with strong pacing and summaries of meaning.', 'Fluency and comprehension studies', 'novel-like story segment'),
    (md5(random()::text)::uuid, '8', 'comprehension', 'Critical Interpretation', '8-CMP-1', 'Interpret complex text, identify bias or perspective, and evaluate author purpose.', 'Critical thinking, perspective, evaluation', 'Students in grade 8 need to move toward critical interpretation and evidence-based judgment.', 'Child explains the author’s purpose and whether the story’s viewpoint is reliable.', 'Grade 8 ELA standards', 'complex narrative or informational fiction'),
    (md5(random()::text)::uuid, '8', 'vocabulary', 'Tier 3 and Complex Words', '8-VOC-1', 'Apply word analysis and context to understand specialized and nuanced vocabulary.', 'Word etymology, context, academic language', 'Vocabulary study must help students read and reason in more demanding texts.', 'Child explains a difficult word and uses it appropriately in discussion.', 'Middle school academic language research', 'figurative or concept-rich story'),
    (md5(random()::text)::uuid, '8', 'social_emotional_reading', 'Identity and Agency', '8-SEL-1', 'Use reading to reflect on identity, choice, conflict, and growth.', 'Identity, agency, reflection', 'Adolescent readers need stories that support self-understanding and confidence.', 'Child connects the story to a personal choice, challenge, or future goal.', 'Adolescent literacy and SEL frameworks', 'coming-of-age story')
ON CONFLICT (standard_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_curriculum_tracks_grade_domain ON curriculum_tracks(grade_level, domain);
CREATE INDEX IF NOT EXISTS idx_story_curriculum_curriculum_id ON story_curriculum(curriculum_id);

CREATE TABLE IF NOT EXISTS ai_invocations (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS guardian_consent_version TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pricing_variant TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS family_price_cents INTEGER NOT NULL DEFAULT 800;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 7;

CREATE TABLE IF NOT EXISTS consent_audit_log (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('register_consent', 'privacy_acknowledged', 'ai_opt_in_changed')),
    policy_version TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_account_created ON consent_audit_log(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS growth_events (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL CHECK (event_name IN ('account_registered', 'account_login', 'learner_created', 'story_generated', 'story_completed', 'plan_selected')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_events_account_created ON growth_events(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_events_event_created ON growth_events(event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS reminder_preferences (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    weekly_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_imports (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    imported_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS growth_events (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL CHECK (event_name IN ('account_registered', 'account_login', 'learner_created', 'story_generated', 'story_completed', 'plan_selected')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_events_account_created ON growth_events(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_events_event_created ON growth_events(event_name, created_at DESC);
