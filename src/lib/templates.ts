export const DEFAULT_TEMPLATES = {
  RECIPROCAL_TESTING_REQUEST: {
    name: "Reciprocal testing request",
    subject: "",
    body: "Hi! I'd be happy to test your Android app. I'm also currently looking for testers for my Google Play app. If you're interested in reciprocal testing, please share the Gmail address you use for Google Play testing and I'll send you my testing link.",
  },
  TESTER_ADDED: {
    name: "Tester added",
    subject: "Your Google Play testing access is ready",
    body: "Hi! Thanks for agreeing to test my Android app.\n\nI've added your Google Play account to the testing group.\n\nPlease use the link below to join the test:\n\n{{testingLink}}\n\nAfter joining, install the app from Google Play.\n\nOnce you've installed it, please let me know and I'll test your app as well.\n\nThanks!",
  },
  FEEDBACK_REQUEST: {
    name: "Feedback request",
    subject: "Quick feedback on the test build",
    body: "Thanks for testing the app. I'd really appreciate any feedback you have, especially bugs, UI issues, performance problems, or anything that could be improved.",
  },
} as const;

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

export const TONE_PRESETS: Record<string, string> = {
  professional:
    "Hi! I'd be happy to test your Android app. I'm also currently looking for testers for my Google Play app. If you're interested in reciprocal testing, please share the Gmail address you use for Google Play testing and I'll send you my testing link.",
  friendly:
    "Hi! Happy to test your Android app — I'm looking for Google Play testers too. If you want to swap tests, send me the Gmail you use for Play testing and I'll share my testing link.",
  short:
    "Happy to do reciprocal Android testing. Please send the Gmail you use for Google Play testing and I'll send my opt-in link.",
  "developer-to-developer":
    "Hey — I can join your closed test. I'm recruiting testers for my Play Console closed track as well. If you're up for a reciprocal test, share your Play testing Gmail and I'll send the opt-in URL.",
};

export function renderTemplate(
  body: string,
  vars: Record<string, string | undefined | null>,
) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] || `[${key} unavailable]`);
}

export function generateReply(tone: string = "professional") {
  return TONE_PRESETS[tone] || TONE_PRESETS.professional;
}
