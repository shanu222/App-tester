import { spawnSync } from "node:child_process";
import { applyDatabaseEnvAliases } from "./load-db-env.mjs";

const { databaseUrl } = applyDatabaseEnvAliases();

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);

if (databaseUrl) {
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.warn(
    "No DATABASE_URL / POSTGRES_URL found at build time. Skipping prisma migrate deploy. Set a Postgres URL for Production + Build, or connect Vercel Postgres / Neon.",
  );
}

run("npx", ["next", "build"]);
