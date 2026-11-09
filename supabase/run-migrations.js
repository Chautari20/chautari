/**
 * One-off: run SQL migration files against remote Supabase (uses SUPABASE_DB_URL from .env).
 * Usage: node supabase/run-migrations.js [000|001|002|003|004|005|006|007|008|009|010|011|012|013|014|all]
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) throw new Error('Missing .env with SUPABASE_DB_URL');
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const FILES = {
  '000': '000_reset_public_schema.sql',
  '001': '001_chautari_schema.sql',
  '002': '002_seed_reference_data.sql',
  '003': '003_clear_auth_users.sql',
  '004': '004_rls_content_updates.sql',
  '005': '005_flexible_social_refs.sql',
  '006': '006_storage_media.sql',
  '007': '007_credentials_storage.sql',
  '008': '008_expert_post_mode.sql',
  '009': '009_expert_profile_fields.sql',
  '010': '010_relax_answer_reply_lengths.sql',
  '011': '011_clear_seed_content.sql',
  '012': '012_verified_recovery_email.sql',
  '013': '013_auth_lookup_and_email_login.sql',
  '014': '014_founding_member_number.sql',
};

async function runFile(client, name) {
  const file = path.join(__dirname, 'migrations', name);
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`\n→ ${name}`);
  await client.query(sql);
  console.log(`  ✓ done`);
}

async function main() {
  const env = loadEnvFile();
  const url = env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL not set in .env');

  const arg = process.argv[2] || 'all';
  const order = ['000', '003', '001', '002'];
  const keys = arg === 'all' ? order : [arg];

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const key of keys) {
      const file = FILES[key];
      if (!file) throw new Error(`Unknown step: ${key}`);
      await runFile(client, file);
    }
    console.log('\nAll requested migrations completed.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
