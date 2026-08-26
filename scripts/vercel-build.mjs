import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyDatabaseEnvAliases } from "./load-db-env.mjs";

const { databaseUrl } = applyDatabaseEnvAliases();

function stripMigrationBoms() {
  const root = join(process.cwd(), "prisma", "migrations");
  for (const folder of readdirSync(root, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const file = join(root, folder.name, "migration.sql");
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

stripMigrationBoms();
run("npx", ["prisma", "generate"]);

if (databaseUrl) {
  const first = run("npx", ["prisma", "migrate", "deploy"], { allowFail: true });
  if (first.status !== 0) {
    console.warn("Init migration was left in a failed state. Marking it rolled back and retrying.");
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", "20260826120000_init"], {
      allowFail: true,
    });
    run("npx", ["prisma", "migrate", "deploy"]);
  }
} else {
  console.warn(
    "No DATABASE_URL / POSTGRES_URL found at build time. Skipping prisma migrate deploy.",
  );
}

run("npx", ["next", "build"]);
