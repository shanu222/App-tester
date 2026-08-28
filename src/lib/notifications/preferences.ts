export type NotificationPreferenceKey =
  | "testerJoined"
  | "testerAccepted"
  | "testerActionRequired"
  | "testerOnboardingIssue"
  | "playSyncIssues"
  | "playTrackChanges"
  | "playActionRequired"
  | "requestActivity"
  | "requestArchived"
  | "requestCompleted"
  | "dailySummary";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

/** Important alerts on; noisy campaign status mail off. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  testerJoined: true,
  testerAccepted: true,
  testerActionRequired: true,
  testerOnboardingIssue: true,
  playSyncIssues: true,
  playTrackChanges: false,
  playActionRequired: true,
  requestActivity: false,
  requestArchived: false,
  requestCompleted: false,
  dailySummary: true,
};

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const next = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationPreferenceKey[]) {
    if (typeof source[key] === "boolean") next[key] = source[key];
  }
  return next;
}

export function karachiDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
