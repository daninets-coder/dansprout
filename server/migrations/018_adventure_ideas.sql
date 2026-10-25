-- Picture adventure choices for early readers (PreK-2). The natural-voice recording of each label is generated
-- once and stored here (audio BYTEA), so nothing depends on the browser's robotic voices.
CREATE TABLE IF NOT EXISTS adventure_ideas (
    id TEXT PRIMARY KEY,
    icon TEXT NOT NULL,
    label TEXT NOT NULL,
    prompt TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    audio BYTEA,
    audio_version TEXT,
    audio_updated_at TIMESTAMPTZ
);

INSERT INTO adventure_ideas (id, icon, label, prompt, sort_order) VALUES
  ('hidden-treasure', '🗺️', 'Find a hidden treasure', 'Finding a hidden treasure map', 10),
  ('lost-baby-animal', '🐣', 'Help a lost baby animal', 'Helping a lost baby animal find its way home', 20),
  ('moon-rocket', '🚀', 'Fly to the moon', 'Flying a rocket to the moon', 30),
  ('friendly-dragon', '🐉', 'Meet a friendly dragon', 'Meeting a friendly dragon who needs help', 40),
  ('under-the-sea', '🌊', 'Explore under the sea', 'Exploring under the sea with a new friend', 50),
  ('magic-castle', '🏰', 'Visit a magic castle', 'Visiting a magic castle with a surprise inside', 60),
  ('magic-forest', '🌳', 'Wander in a magic forest', 'A big adventure in a magical forest', 70),
  ('friendly-dinosaur', '🦖', 'Find a friendly dinosaur', 'Finding a friendly dinosaur', 80)
ON CONFLICT (id) DO NOTHING;
