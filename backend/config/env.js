// Fail fast if configuration is missing or weak. Secrets only ever come from environment variables.
function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}
export function config() {
  const jwtSecret = need('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return {
    databaseUrl: need('DATABASE_URL'),
    jwtSecret,
    ownerEmail: need('OWNER_EMAIL').toLowerCase(),
    allowedOrigins: need('ALLOWED_ORIGIN').split(',').map((s) => s.trim()),
  };
}
