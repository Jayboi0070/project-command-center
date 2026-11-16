// Run ONCE on your own computer. There is no public registration endpoint.
//   cd backend && npm install && DATABASE_URL=... OWNER_EMAIL=... npm run create-owner
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

function ask(prompt, hidden) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (s) => { if (s.includes(prompt)) process.stdout.write(s); };
  return new Promise((r) => rl.question(prompt, (a) => { rl.close(); if (hidden) console.log(); r(a); }));
}
const url = process.env.DATABASE_URL, email = process.env.OWNER_EMAIL?.toLowerCase();
if (!url || !email) { console.error('Set DATABASE_URL and OWNER_EMAIL first.'); process.exit(1); }
const sql = neon(url);
if ((await sql.query('SELECT 1 FROM users LIMIT 1')).length) { console.error('An owner already exists. Aborting.'); process.exit(1); }
const pw = await ask('Choose a password (12+ characters): ', true);
if (pw.length < 12) { console.error('Too short.'); process.exit(1); }
if (pw !== (await ask('Repeat password: ', true))) { console.error('Passwords differ.'); process.exit(1); }
const [u] = await sql.query('INSERT INTO users(email,password_hash,full_name) VALUES ($1,$2,$3) RETURNING id', [email, await bcrypt.hash(pw, 12), 'JIMOH AYANFEOLUWA']);
await sql.query('INSERT INTO app_settings(user_id) VALUES ($1)', [u.id]);
console.log('Owner account created.');
