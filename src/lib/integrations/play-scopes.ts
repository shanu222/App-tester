/**
 * Scope constants live in their own leaf module so the auth layer and the
 * diagnostics layer can both depend on them without importing each other.
 */

/** The only Play permission TestLoop ever requests. */
export const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

/**
 * App discovery uses the Play Developer Reporting API, which is a separate
 * Google API with its own scope and its own enablement switch.
 */
export const PLAY_REPORTING_SCOPE = "https://www.googleapis.com/auth/playdeveloperreporting";
