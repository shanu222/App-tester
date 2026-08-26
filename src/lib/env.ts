function requiredInProduction(name: string, value: string | undefined) {
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function publicAppUrl() {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const env = {
  appUrl: publicAppUrl(),
  nodeEnv: process.env.NODE_ENV || "development",
  demoMode: process.env.DEMO_MODE === "true",
  databaseUrl: process.env.DATABASE_URL || "",
  encryptionKey: process.env.ENCRYPTION_KEY || "",
  cronSecret: process.env.CRON_SECRET || "",
  authSecret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-insecure-secret-change-me",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  facebookClientId: process.env.FACEBOOK_CLIENT_ID || "",
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
  facebookRedirectUri:
    process.env.FACEBOOK_REDIRECT_URI ||
    `${publicAppUrl()}/api/integrations/facebook/callback`,
  facebookGraphVersion: process.env.FACEBOOK_GRAPH_VERSION || "v21.0",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "TesterBridge <noreply@localhost>",
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || "",
  googleWorkspaceAdminEmail: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || "",
};

export function assertProductionSecrets() {
  if (env.nodeEnv !== "production") return;
  requiredInProduction("DATABASE_URL", process.env.DATABASE_URL);
  requiredInProduction("ENCRYPTION_KEY", process.env.ENCRYPTION_KEY);
  requiredInProduction("CRON_SECRET", process.env.CRON_SECRET);
  if (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_SECRET) {
    requiredInProduction("AUTH_SECRET", process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  }
}

export function isDemoMode() {
  return env.demoMode && env.nodeEnv !== "production";
}

export function googleOAuthConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}
