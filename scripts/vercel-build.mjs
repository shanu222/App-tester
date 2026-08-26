import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyDatabaseEnvAliases } from "./load-db-env.mjs";

const { databaseUrl } = applyDatabaseEnvAliases();

function migrationNames() {
  const root = join(process.cwd(), "prisma", "migrations");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function stripMigrationBoms() {
  const root = join(process.cwd(), "prisma", "migrations");
  for (const name of migrationNames()) {
    const file = join(root, name, "migration.sql");
    try {
      const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
      writeFileSync(file, text, { encoding: "utf8" });
    } catch {
      // ignore missing files
    }
  }
}

function run(command, args, { allowFail = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0 && !allowFail) {
    process.exit(result.status ?? 1);
  }
  return result;
}

/**
 * A migration left half-applied blocks every later deploy, which surfaces as a
 * login failure because the developer bootstrap cannot write its tables.
 * Recover the history without dropping data: clear the stuck entries, then let
 * `db push` converge the schema. `db push` aborts instead of destroying data.
 */
function repairMigrationHistory() {
  const names = migrationNames();
  for (const name of names) {
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", name], { allowFail: true });
  }
  const retry = run("npx", ["prisma", "migrate", "deploy"], { allowFail: true });
  if (retry.status === 0) return;

  console.warn("Migration history is inconsistent with the database. Converging with prisma db push.");
  const pushed = run("npx", ["prisma", "db", "push", "--skip-generate"], { allowFail: true });
  if (pushed.status !== 0) {
    console.warn("prisma db push could not converge the schema. Check /api/health for missing tables.");
    return;
  }
  for (const name of names) {
    run("npx", ["prisma", "migrate", "resolve", "--applied", name], { allowFail: true });
  }
}

stripMigrationBoms();
run("npx", ["prisma", "generate"]);

if (databaseUrl) {
  const first = run("npx", ["prisma", "migrate", "deploy"], { allowFail: true });
  if (first.status !== 0) {
    repairMigrationHistory();
  }
} else {
  console.warn(
    "No DATABASE_URL / POSTGRES_URL found at build time. Skipping prisma migrate deploy. " +
      "Enable the database env vars for the Build environment in Vercel or logins will fail.",
  );
}

run("npx", ["next", "build"]);
