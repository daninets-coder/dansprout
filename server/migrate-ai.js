import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:university@localhost:5432/SproutStory' });

async function run() {
  try {
    await pool.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_external_opt_in BOOLEAN NOT NULL DEFAULT FALSE");
    await pool.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_opt_in_at TIMESTAMPTZ");
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_invocations (
      id UUID PRIMARY KEY,
      account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
      story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      model TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    console.log('MIGRATIONS_OK');
  } catch (e) {
    console.error('MIGRATION_ERROR', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
