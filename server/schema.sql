CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'parent' CHECK ("role" IN ('parent', 'teacher', 'administrator')),
    consented_at TIMESTAMPTZ NOT NULL,
    email_verified_at TIMESTAMPTZ,
    email_verification_token_hash TEXT,
    email_verification_expires_at TIMESTAMPTZ,
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
    topics_to_avoid_options TEXT[] NOT NULL DEFAULT '{}',
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

CREATE TABLE IF NOT EXISTS reading_assessments (
    id UUID PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    mastered BOOLEAN NOT NULL DEFAULT FALSE,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'auto_scored', 'reviewed', 'corrected')),
    reviewed_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.25 CHECK (confidence >= 0 AND confidence <= 1),
    standards_evidence JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_assessments_learner_created ON reading_assessments(learner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_safety_events (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('input_blocked', 'output_blocked', 'ai_budget_blocked', 'safety_reported')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_safety_events_created ON ai_safety_events(created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_account ON password_reset_tokens(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS account_deletion_tokens (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_tokens_account ON account_deletion_tokens(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_cancellation_tokens (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    reason TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_cancellation_tokens_account ON subscription_cancellation_tokens(account_id, created_at DESC);

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

INSERT INTO curriculum_tracks (
    id, grade_level, domain, strand, standard_code, objective,
    skill_focus, instructional_priority, evidence_of_learning,
    source_framework, suggested_story_type
)
VALUES
    (md5(random()::text)::uuid, 'PreK', 'phonics', 'Print Concepts', 'RF.PK.1', 'Handle books correctly, track print from left to right and top to bottom, and notice spaces between words.', 'Book orientation, print direction, word boundaries', 'Build print awareness through shared reading and repeated story routines.', 'Child demonstrates book handling and follows print during a read-aloud.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'picture-rich read-aloud'),
    (md5(random()::text)::uuid, 'PreK', 'phonics', 'Phonological Awareness', 'RF.PK.2', 'Identify rhyming words, count syllables, and notice initial sounds in simple spoken words.', 'Rhyme, syllables, initial sounds', 'Strengthen sound awareness through playful oral language.', 'Child identifies a rhyme, claps syllables, or names a beginning sound.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'rhyming story'),
    (md5(random()::text)::uuid, 'PreK', 'phonics', 'Letter Knowledge', 'RF.PK.1d', 'Recognize and name upper- and lowercase letters, including letters in the child''s name.', 'Letter names, upper/lowercase matching', 'Connect meaningful print to children''s names and interests.', 'Child names or matches letters during story talk.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'alphabet story'),
    (md5(random()::text)::uuid, 'PreK', 'comprehension', 'Key Ideas and Details', 'RL/RI.PK.1-3', 'Answer who, what, and where questions about a read-aloud and identify characters and settings.', 'Literal comprehension, characters, setting', 'Build understanding through concrete story talk and repetition.', 'Child answers a who, what, or where question about the story.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'simple read-aloud'),
    (md5(random()::text)::uuid, 'PreK', 'comprehension', 'Integration of Knowledge', 'RL/RI.PK.7', 'Use illustrations to describe story events or information from a text.', 'Picture-text connections', 'Help children use images as evidence for meaning.', 'Child points to an illustration and explains what it shows.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'illustrated discovery'),
    (md5(random()::text)::uuid, 'K', 'phonics', 'Print Concepts', 'RF.K.1', 'Recognize all upper- and lowercase letters automatically.', 'Letter recognition, print knowledge', 'Build automatic letter knowledge for early reading.', 'Child names letters encountered in a story or word activity.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'letter-rich story'),
    (md5(random()::text)::uuid, 'K', 'phonics', 'Phonological Awareness', 'RF.K.2', 'Blend and segment single-syllable spoken words.', 'Phoneme blending and segmenting', 'Connect sounds to words through oral practice.', 'Child blends or separates sounds in a story word.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'sound-play story'),
    (md5(random()::text)::uuid, 'K', 'phonics', 'Phonics and Word Recognition', 'RF.K.3', 'Match letters to primary sounds, decode CVC words, and read common sight words.', 'Letter-sound links, CVC decoding, sight words', 'Provide controlled opportunities to apply sound knowledge.', 'Child identifies a letter sound or reads a simple word.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'decodable story'),
    (md5(random()::text)::uuid, 'K', 'fluency', 'Fluency', 'RF.K.4', 'Read emergent-reader text with purpose and basic understanding.', 'Accuracy, purpose, basic understanding', 'Build confidence through short, repeatable text.', 'Child rereads a short story and explains what it means.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'repetitive read-aloud'),
    (md5(random()::text)::uuid, 'K', 'comprehension', 'Key Ideas and Details', 'RL/RI.K.1-3', 'Retell a familiar story and identify key details and connections between people or ideas.', 'Retell, key details, connections', 'Move from listening to organized story understanding.', 'Child retells events or identifies an important detail.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'beginning-middle-end story'),
    (md5(random()::text)::uuid, 'K', 'comprehension', 'Craft and Structure', 'RL/RI.K.5-6', 'Identify book parts and describe the roles of the author and illustrator.', 'Book features, author, illustrator', 'Make the structure and purpose of books visible.', 'Child identifies a cover, title page, author, or illustrator.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'book-about-books'),
    (md5(random()::text)::uuid, '1', 'phonics', 'Phonological Awareness', 'RF.1.2', 'Distinguish long and short vowel sounds in spoken words.', 'Vowel sounds', 'Strengthen sound discrimination for decoding.', 'Child sorts or explains long and short vowel sounds.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'vowel adventure'),
    (md5(random()::text)::uuid, '1', 'phonics', 'Phonics and Word Recognition', 'RF.1.3', 'Decode blends, digraphs, silent-e patterns, and inflectional endings.', 'Phonics patterns, endings', 'Apply predictable spelling patterns in meaningful text.', 'Child notices or decodes a target pattern in a story word.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'pattern-based story'),
    (md5(random()::text)::uuid, '1', 'fluency', 'Fluency', 'RF.1.4', 'Read grade-level text orally with accuracy, appropriate rate, and expression.', 'Accuracy, rate, expression', 'Support rereading with meaning and confidence.', 'Child reads a passage accurately and with expression.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'expressive reading story'),
    (md5(random()::text)::uuid, '1', 'comprehension', 'Key Ideas and Details', 'RL/RI.1.1-3', 'Ask and answer questions about key details and describe characters, settings, and events in sequence.', 'Questions, sequence, story elements', 'Build organized comprehension of narrative and informational text.', 'Child answers a question and sequences major events.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'sequenced adventure'),
    (md5(random()::text)::uuid, '1', 'comprehension', 'Craft and Structure', 'RL/RI.1.4-5', 'Identify words that appeal to the senses or feelings and distinguish fiction from nonfiction.', 'Sensory language, text type', 'Notice how word choice and text purpose guide meaning.', 'Child identifies a sensory word or names the text type.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'sensory story'),
    (md5(random()::text)::uuid, '2', 'phonics', 'Phonics and Word Recognition', 'RF.2.3', 'Decode two-syllable words, recognize common prefixes and suffixes, and identify irregular words.', 'Word parts, multisyllabic decoding', 'Use meaningful context to support word analysis.', 'Child explains a prefix, suffix, or decoding strategy.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'word-solving story'),
    (md5(random()::text)::uuid, '2', 'fluency', 'Fluency', 'RF.2.4', 'Reread text when necessary to self-correct and maintain comprehension.', 'Self-correction, rereading', 'Make rereading a normal and purposeful reading strategy.', 'Child rereads a sentence and corrects a word or meaning.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'rereading mystery'),
    (md5(random()::text)::uuid, '2', 'comprehension', 'Key Ideas and Details', 'RL/RI.2.1-3', 'Answer who, what, where, when, why, and how questions and identify a central message or lesson.', 'Question types, central message', 'Move from details toward meaning and lessons.', 'Child answers varied questions and states the lesson.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'lesson-based story'),
    (md5(random()::text)::uuid, '2', 'comprehension', 'Craft and Structure', 'RL/RI.2.6', 'Identify character points of view, including different voices when reading aloud.', 'Point of view, character voice', 'Help readers notice who is telling or speaking.', 'Child explains a character’s viewpoint or reads dialogue differently.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'character-voice story'),
    (md5(random()::text)::uuid, '2', 'comprehension', 'Text Structure', 'RI.2.5', 'Use captions, bold print, glossaries, and indexes to locate facts.', 'Text features, finding information', 'Build independence with informational text features.', 'Child uses a text feature to locate an answer.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'informational discovery'),
    (md5(random()::text)::uuid, '3', 'phonics', 'Phonics and Word Recognition', 'RF.3.3', 'Decode multisyllabic words and common Latin-derived suffixes.', 'Multisyllabic words, suffixes', 'Equip readers for longer and more complex texts.', 'Child breaks a longer word into parts and explains a suffix.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'word-detective story'),
    (md5(random()::text)::uuid, '3', 'fluency', 'Fluency', 'RF.3.4', 'Read prose and poetry fluently to support full comprehension.', 'Prosody, pacing, comprehension', 'Connect fluent reading with understanding.', 'Child reads a passage smoothly and explains its meaning.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'prose or poetry story'),
    (md5(random()::text)::uuid, '3', 'comprehension', 'Key Ideas and Details', 'RL.3.1-3', 'Use explicit text details to describe character traits, motivations, and feelings.', 'Text evidence, traits, motivation', 'Move readers toward evidence-based character analysis.', 'Child points to a detail that supports an inference.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'character-analysis story'),
    (md5(random()::text)::uuid, '3', 'comprehension', 'Structure', 'RL.3.5', 'Refer to chapters, scenes, and stanzas as structural parts of stories, dramas, and poems.', 'Text structure, literary forms', 'Help readers see how structure organizes meaning.', 'Child identifies a structural part and its purpose.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'chapter or scene story'),
    (md5(random()::text)::uuid, '3', 'comprehension', 'Key Ideas and Details', 'RI.3.1-2', 'Determine main ideas and supporting details and describe cause-and-effect or sequence.', 'Main idea, details, relationships', 'Strengthen reading to learn through organized information.', 'Child states a main idea and supporting detail.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'informational adventure'),
    (md5(random()::text)::uuid, '3', 'comprehension', 'Integration of Knowledge', 'RI.3.7-9', 'Interpret maps, diagrams, and timelines alongside printed text.', 'Text and visual information', 'Integrate multiple representations of information.', 'Child explains how a visual supports the text.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'map or timeline story'),
    (md5(random()::text)::uuid, '4', 'comprehension', 'Key Ideas and Details', 'RL.4.1-3', 'Make logical inferences supported by details and determine theme and summary.', 'Inference, theme, summary', 'Build evidence-based interpretation of literature.', 'Child supports an inference with a specific story detail.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'theme-based story'),
    (md5(random()::text)::uuid, '4', 'comprehension', 'Craft and Structure', 'RL.4.4-6', 'Interpret figurative language and compare first-person and third-person narration.', 'Figurative language, narration', 'Notice how language and viewpoint shape a story.', 'Child explains a metaphor or compares narrators.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'narrator-switching story'),
    (md5(random()::text)::uuid, '4', 'comprehension', 'Key Ideas and Details', 'RI.4.1-3', 'Explain events, procedures, or concepts using evidence from informational text.', 'Evidence, explanation, concepts', 'Use text evidence to explain how or why something works.', 'Child explains an idea with supporting evidence.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'informational explanation'),
    (md5(random()::text)::uuid, '4', 'comprehension', 'Structure and Logic', 'RI.4.5-8', 'Describe organizational structures and explain how evidence supports an author’s points.', 'Text structure, evidence, logic', 'Make information organization visible to readers.', 'Child identifies a structure and explains its effect.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'problem-solving nonfiction'),
    (md5(random()::text)::uuid, '5', 'comprehension', 'Key Ideas and Details', 'RL.5.1-3', 'Quote accurately, explain inferences, and compare characters, settings, or events.', 'Quoting, inference, comparison', 'Prepare readers to support analysis with precise evidence.', 'Child selects an accurate detail and explains its meaning.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'comparative story'),
    (md5(random()::text)::uuid, '5', 'comprehension', 'Craft and Structure', 'RL.5.6', 'Analyze how a narrator''s or speaker''s point of view influences events.', 'Point of view, perspective', 'Help readers evaluate how narration shapes meaning.', 'Child explains how a different narrator changes an event.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'multiple-perspective story'),
    (md5(random()::text)::uuid, '5', 'comprehension', 'Integration of Knowledge', 'RI.5.7-9', 'Use multiple print or digital sources and integrate facts from texts on the same topic.', 'Cross-text reading, source integration', 'Build efficient research and synthesis habits.', 'Child combines facts from two short sources.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'research mystery'),
    (md5(random()::text)::uuid, '5', 'vocabulary', 'Vocabulary Acquisition', 'L.5.4', 'Use Greek and Latin roots and affixes as clues to word meaning.', 'Roots, affixes, morphology', 'Develop transferable strategies for unfamiliar vocabulary.', 'Child uses a root or affix to infer meaning.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'word-root adventure'),
    (md5(random()::text)::uuid, '6', 'comprehension', 'Key Ideas and Details', 'RL.6.1-3', 'Cite textual evidence, determine theme, and explain how details convey meaning.', 'Evidence, theme, analysis', 'Establish habits of close reading and supported interpretation.', 'Child cites evidence and explains its connection to theme.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'close-reading narrative'),
    (md5(random()::text)::uuid, '6', 'vocabulary', 'Craft and Structure', 'RL.6.4-6', 'Analyze connotative and figurative word meanings and explain how an author develops point of view.', 'Tone, connotation, figurative language', 'Connect precise word choice to tone and perspective.', 'Child explains how a word changes tone.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'tone-and-perspective story'),
    (md5(random()::text)::uuid, '6', 'comprehension', 'Key Ideas and Details', 'RI.6.1-3', 'Analyze how a key individual, event, or idea is introduced and developed.', 'Development, elaboration, analysis', 'Track how informational texts build ideas.', 'Child explains how details develop a central idea.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'idea-development story'),
    (md5(random()::text)::uuid, '6', 'comprehension', 'Argumentation', 'RI.6.8', 'Trace and evaluate an argument and distinguish supported claims from unsupported assertions.', 'Claims, evidence, reasoning', 'Build careful evaluation of informational claims.', 'Child identifies a claim and evaluates its support.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'evidence challenge'),
    (md5(random()::text)::uuid, '7', 'comprehension', 'Key Ideas and Details', 'RL.7.1-3', 'Cite multiple pieces of evidence and analyze how story elements interact.', 'Evidence, interaction, analysis', 'Deepen literary analysis beyond isolated details.', 'Child explains how setting shapes a character choice.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'interconnected narrative'),
    (md5(random()::text)::uuid, '7', 'comprehension', 'Structure and Theme', 'RL.7.2-5', 'Track theme development and analyze how drama or poem structure contributes to meaning.', 'Theme, structure, literary form', 'Connect form, development, and interpretation.', 'Child traces a theme across the text.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'drama or poetry story'),
    (md5(random()::text)::uuid, '7', 'comprehension', 'Author''s Craft and Purpose', 'RI.7.6', 'Analyze how an author distinguishes their position from the positions of others.', 'Author stance, perspective', 'Help readers recognize position and rhetorical choices.', 'Child identifies an author''s position and another viewpoint.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'perspective-based nonfiction'),
    (md5(random()::text)::uuid, '7', 'comprehension', 'Comparative Analysis', 'RI.7.9', 'Analyze how authors present different evidence or emphasize different facts about a topic.', 'Cross-text comparison, evidence', 'Build comparison across sources and viewpoints.', 'Child compares evidence or emphasis across two texts.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'two-source investigation'),
    (md5(random()::text)::uuid, '8', 'comprehension', 'Key Ideas and Details', 'RL.8.1-3', 'Cite the strongest evidence and analyze how dialogue or incidents propel plot or reveal character.', 'Strong evidence, plot, character', 'Prepare readers for sustained literary analysis.', 'Child selects the strongest evidence for an interpretation.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'literary analysis story'),
    (md5(random()::text)::uuid, '8', 'vocabulary', 'Literary Analysis', 'RL.8.4-6', 'Analyze analogies, allusions, irony, suspense, and adaptations across forms.', 'Figurative language, irony, adaptation', 'Read critically across literary techniques and formats.', 'Child explains how a technique or adaptation changes meaning.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'adaptation or suspense story'),
    (md5(random()::text)::uuid, '8', 'comprehension', 'Critical Argument Evaluation', 'RI.8.8', 'Distinguish valid reasoning from fallacies, irrelevant facts, or exaggerated claims.', 'Reasoning, fallacies, claim evaluation', 'Build critical reading of arguments and evidence.', 'Child identifies whether reasoning supports a claim.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'argument investigation'),
    (md5(random()::text)::uuid, '8', 'comprehension', 'Cross-Text Synthesis', 'RI.8.9', 'Analyze conflicting information across texts and identify differences in facts or interpretations.', 'Synthesis, conflicting sources, interpretation', 'Prepare readers to reconcile multiple accounts.', 'Child explains where two texts agree or differ.', 'Maryland College and Career-Ready Standards (MCCRS) ELA', 'cross-text inquiry')
ON CONFLICT (standard_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_curriculum_tracks_grade_domain ON curriculum_tracks(grade_level, domain);
CREATE INDEX IF NOT EXISTS idx_story_curriculum_curriculum_id ON story_curriculum(curriculum_id);

CREATE TABLE IF NOT EXISTS ai_invocations (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_usd NUMERIC(10,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS guardian_consent_version TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pricing_variant TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS family_price_cents INTEGER NOT NULL DEFAULT 1500;
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
