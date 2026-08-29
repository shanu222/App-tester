import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { maskServiceAccountIdentifier } from "../src/lib/secrets/play-service-account";
import { redactSecrets } from "../src/lib/integrations/google-api-error";
import { safePlayConnection } from "../src/lib/services/play-connection";
import type { GooglePlayConnection } from "@prisma/client";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

function connection(overrides: Partial<GooglePlayConnection>): GooglePlayConnection {
  return {
    id: "conn_1",
    userId: "user_1",
    method: "SERVICE_ACCOUNT",
    status: "CONNECTED",
    googleAccountEmail: "play-bot@testloop-play.iam.gserviceaccount.com",
    cloudProjectId: "testloop-play",
    maskedCredentialLabel: "p••••@••••.gserviceaccount.com",
    playSecretPresent: true,
    scopes: [],
    encryptedCredentials: "iv:tag:ciphertext",
    lastVerifiedAt: null,
    lastSyncAt: null,
    lastError: null,
    errorCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Play service account secret handling", () => {
  it("masks the service-account identifier without exposing client_email or project_id", () => {
    expect(maskServiceAccountIdentifier("play-bot@testloop-play.iam.gserviceaccount.com")).toBe(
      "p••••@••••.gserviceaccount.com",
    );
    const view = safePlayConnection(connection({}));
    expect(view.connected).toBe(true);
    expect(view.accountEmail).toBe("p••••@••••.gserviceaccount.com");
    expect(view.accountEmail).not.toContain("play-bot@testloop-play");
    expect(view.cloudProjectId).toBeNull();
    expect(JSON.stringify(view)).not.toContain("BEGIN PRIVATE");
    expect(JSON.stringify(view)).not.toContain("iv:tag:ciphertext");
  });

  it("keeps the Google account email for OAuth connections and still hides the credential blob", () => {
    const view = safePlayConnection(
      connection({
        method: "OAUTH",
        googleAccountEmail: "developer@example.com",
        cloudProjectId: "oauth-project",
        maskedCredentialLabel: null,
      }),
    );
    expect(view.accountEmail).toBe("developer@example.com");
    expect(view.cloudProjectId).toBeNull();
    expect(JSON.stringify(view)).not.toContain("iv:tag:ciphertext");
  });

  it("uploads a key file instead of a JSON textarea and never echoes stored secrets", () => {
    const wizard = source("src/components/play/service-account-wizard.tsx");
    const panel = source("src/components/play/play-connection-panel.tsx");
    const route = source("src/app/api/google-play/connect/service-account/route.ts");
    const service = source("src/lib/services/play-connection.ts");

    expect(wizard).toContain('type="file"');
    expect(wizard).toContain('name="keyFile"');
    expect(wizard).toContain("Upload the key file");
    expect(wizard).not.toContain("Textarea");
    expect(wizard).not.toContain("private_key");
    expect(panel).toContain("Google Play Console connected ✓");
    expect(panel).toContain("Replace connection");
    expect(route).toContain("publicPlayDiagnostics");
    expect(route).toContain("requireUser");
    expect(service).toContain("writePlayServiceAccountJson");
    expect(service).toContain("shredPlayServiceAccountSecret");
    expect(service).not.toContain("serviceAccountJson: JSON.stringify");
  });

  it("does not put service-account JSON on the application connection row", () => {
    const service = source("src/lib/services/play-connection.ts");
    expect(service).toContain("wipeApplicationCredentialBlob");
    expect(service).toContain("readPlayServiceAccountJson");
    const schema = source("prisma/schema.prisma");
    expect(schema).toContain("model PlayServiceAccountSecret");
    expect(schema).toContain("ciphertext");
  });

  it("redacts a dumped service-account JSON object", () => {
    const dumped = `{ "type": "service_account", "project_id": "secret-proj", "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIB\\n-----END PRIVATE KEY-----", "client_email": "bot@secret-proj.iam.gserviceaccount.com" }`;
    const redacted = redactSecrets(dumped);
    expect(redacted).not.toContain("BEGIN PRIVATE KEY");
    expect(redacted).not.toContain("bot@secret-proj");
    expect(redacted).not.toContain("secret-proj");
  });
});
