export const DEFAULT_NOTIFICATION_TIMEZONE = "Asia/Karachi";
export const DEFAULT_NOTIFICATION_TIME = "16:00";
export const DEFAULT_NOTIFICATION_FREQUENCY = "daily" as const;
export const DEFAULT_NOTIFICATION_WEEKDAY = 1;

export type NotificationFrequency = "realtime" | "daily" | "weekly" | "disabled";

export type NotificationSchedule = {
  frequency: NotificationFrequency;
  time: string;
  timezone: string;
  weekday: number;
};

const FREQUENCIES = new Set<NotificationFrequency>(["realtime", "daily", "weekly", "disabled"]);

const WEEKDAY_FROM_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const NOTIFICATION_TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Cairo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "UTC",
] as const;

export function parseNotificationTime(value: unknown) {
  if (typeof value !== "string") return DEFAULT_NOTIFICATION_TIME;
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return DEFAULT_NOTIFICATION_TIME;
  return `${match[1]}:${match[2]}`;
}

export function parseNotificationFrequency(value: unknown): NotificationFrequency {
  if (typeof value === "string" && FREQUENCIES.has(value as NotificationFrequency)) {
    return value as NotificationFrequency;
  }
  return DEFAULT_NOTIFICATION_FREQUENCY;
}

export function parseNotificationWeekday(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) return value;
  if (typeof value === "string" && /^\d$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (parsed >= 0 && parsed <= 6) return parsed;
  }
  return DEFAULT_NOTIFICATION_WEEKDAY;
}

export function resolveTimeZone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_NOTIFICATION_TIMEZONE;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_NOTIFICATION_TIMEZONE;
  }
}

export function parseNotificationSchedule(input: {
  notificationFrequency?: unknown;
  notificationTime?: unknown;
  notificationTimezone?: unknown;
  notificationWeekday?: unknown;
}): NotificationSchedule {
  return {
    frequency: parseNotificationFrequency(input.notificationFrequency),
    time: parseNotificationTime(input.notificationTime),
    timezone: resolveTimeZone(input.notificationTimezone),
    weekday: parseNotificationWeekday(input.notificationWeekday),
  };
}

export function zonedDateParts(date: Date, timeZone: string) {
  const zone = resolveTimeZone(timeZone);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const hour = Number.parseInt(parts.hour === "24" ? "0" : parts.hour, 10);
  const minute = Number.parseInt(parts.minute, 10);
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
    weekday: WEEKDAY_FROM_SHORT[parts.weekday] ?? 0,
    minutesOfDay: hour * 60 + minute,
  };
}

export function isScheduledSendDue(date: Date, schedule: NotificationSchedule) {
  if (schedule.frequency !== "daily" && schedule.frequency !== "weekly") return false;
  const local = zonedDateParts(date, schedule.timezone);
  const [hours, minutes] = schedule.time.split(":").map((part) => Number.parseInt(part, 10));
  const preferred = hours * 60 + minutes;
  if (local.minutesOfDay < preferred) return false;
  if (schedule.frequency === "weekly") return local.weekday === schedule.weekday;
  return true;
}

export function digestEventKey(userId: string, schedule: NotificationSchedule, date = new Date()) {
  const local = zonedDateParts(date, schedule.timezone);
  if (schedule.frequency === "weekly") return `digest:weekly:${userId}:${local.dateKey}`;
  return `digest:daily:${userId}:${local.dateKey}`;
}

export function digestLookbackStart(date: Date, frequency: NotificationFrequency) {
  const ms = frequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return new Date(date.getTime() - ms);
}
