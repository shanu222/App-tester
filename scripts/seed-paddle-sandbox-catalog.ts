/**
 * Creates (or reuses) the sandbox TestLoop product and $10 USD one-time price.
 * Prints catalog IDs only — never API keys.
 *
 * Requires PADDLE_API_KEY in .env.local (sandbox key, pdl_sdbx_...).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

function loadLocalEnv() {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const PRODUCT_NAME = "TestLoop";
const PRICE_DESCRIPTION = "TestLoop one-time $10 USD";
const USD_CENTS = "1000";

async function main() {
  const apiKey = (process.env.PADDLE_API_KEY || process.env.PADDLE_SANDBOX_API_KEY || "").trim();
  if (!apiKey) {
    console.error("Set PADDLE_API_KEY in .env.local (sandbox key only) before running this script.");
    process.exit(1);
  }
  if (apiKey.startsWith("pdl_live_")) {
    console.error("Refusing to run against a live Paddle API key.");
    process.exit(1);
  }

  const inspectOnly = process.argv.includes("--inspect");
  const paddle = new Paddle(apiKey, { environment: Environment.sandbox });
  let productId = "";
  let priceId = "";
  let productSource = "missing";
  let priceSource = "missing";

  const products = paddle.products.list({ include: ["prices"], perPage: 50 });
  for await (const product of products) {
    if (product.name !== PRODUCT_NAME) continue;
    productId = product.id;
    productSource = "existing";
    const match = (product.prices || []).find(
      (price) =>
        !price.billingCycle &&
        price.unitPrice.currencyCode === "USD" &&
        price.unitPrice.amount === USD_CENTS &&
        price.status === "active",
    );
    if (match) {
      priceId = match.id;
      priceSource = "existing";
    }
    break;
  }

  if (inspectOnly) {
    console.log(`environment=sandbox`);
    console.log(`product=${productSource}${productId ? ` ${productId}` : ""}`);
    console.log(`price=${priceSource}${priceId ? ` ${priceId}` : ""}`);
    return;
  }

  if (!productId) {
    const created = await paddle.products.create({
      name: PRODUCT_NAME,
      taxCategory: "saas",
      description: "TestLoop managed Android testing — one-time $10 USD.",
    });
    productId = created.id;
    productSource = "created";
  }

  if (!priceId) {
    const created = await paddle.prices.create({
      productId,
      name: "TestLoop",
      description: PRICE_DESCRIPTION,
      unitPrice: { amount: USD_CENTS, currencyCode: "USD" },
    });
    priceId = created.id;
    priceSource = "created";
  }

  console.log("Paddle sandbox catalog is ready.");
  console.log(`product=${productSource}`);
  console.log(`price=${priceSource}`);
  console.log(`PADDLE_PRODUCT_ID=${productId}`);
  console.log(`PADDLE_PRICE_ID=${priceId}`);
  console.log("Paste those two ID lines into .env.local. Do not commit the API key.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Catalog setup failed.";
  console.error(message);
  process.exit(1);
});
