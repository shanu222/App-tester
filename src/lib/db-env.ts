const CANDIDATE_DATABASE_URLS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NO_SSL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL",
] as const;

const CANDIDATE_DIRECT_URLS = [
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NO_SSL",
  "POSTGRES_URL",
  "DATABASE_URL",
] as const;

function firstEnv(names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function applyDatabaseEnvAliases() {
  const databaseUrl = firstEnv(CANDIDATE_DATABASE_URLS);
  const directUrl = firstEnv(CANDIDATE_DIRECT_URLS) || databaseUrl;
  if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
  if (directUrl) process.env.DIRECT_URL = directUrl;
  return { databaseUrl, directUrl };
}

applyDatabaseEnvAliases();
