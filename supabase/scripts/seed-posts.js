const fs = require('fs');
const path = require('path');

// Runs supabase/scripts/seed-posts.sql through the linked Supabase database.
// Preferred usage: npx supabase db push (for migrations) or Dashboard SQL Editor.

async function main() {
  console.log('Post seeder SQL: supabase/scripts/seed-posts.sql');
  console.log('Open Supabase Dashboard → SQL Editor, paste the file contents, then run it.');
  console.log('The seeder uses existing profiles and circles and safely updates seed_post_* rows.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
