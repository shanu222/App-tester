export type ScoreInput = {
  message: string;
  postedAt?: Date | null;
  now?: Date;
  alreadyProcessed?: boolean;
  duplicateContent?: boolean;
  customKeywords?: string[];
};

export type ScoreBreakdown = {
  score: number;
  matchedKeywords: string[];
  reciprocal: boolean;
  recencyHours: number | null;
  penalties: string[];
  bonuses: string[];
  whyMatched: string[];
  intent: string;
};

const DEFAULT_KEYWORDS = [
  "need testers",
  "looking for testers",
  "android testers",
  "google play testing",
  "closed testing",
  "beta testers",
  "test my app",
  "i need android testers",
  "app testing",
];

const BONUS_PATTERNS: { label: string; re: RegExp; points: number }[] = [
  { label: "Android testing keyword", re: /\bandroid\b.{0,40}\btest/i, points: 18 },
  { label: "Google Play testing keyword", re: /google\s*play.{0,30}\btest/i, points: 16 },
  { label: "Closed testing keyword", re: /closed\s+test/i, points: 14 },
  { label: "Beta testing keyword", re: /\bbeta\s+(test|tester|testing)\b/i, points: 10 },
  { label: "Explicit tester request", re: /\b(need|looking for|want|require)\b.{0,24}\btesters?\b/i, points: 20 },
  { label: "App-development context", re: /\b(android app|play console|package name|closed track|internal testing)\b/i, points: 10 },
  { label: "Reciprocal testing language", re: /\b(test yours|test mine|reciprocal|i can test|i.?ll test your)\b/i, points: 12 },
];

const PENALTY_PATTERNS: { label: string; re: RegExp; points: number }[] = [
  { label: "Job posting", re: /\b(hiring|we are hiring|job opening|salary|full[- ]time)\b/i, points: 25 },
  { label: "Sales / advertisement", re: /\b(buy now|limited offer|discount|promo code|subscribe for)\b/i, points: 30 },
  { label: "Unrelated spam", re: /\b(crypto|forex|nft giveaway|make money fast)\b/i, points: 40 },
  { label: "Unrelated topic", re: /\b(ios only|iphone testers only)\b/i, points: 20 },
];

export function scorePost(input: ScoreInput): ScoreBreakdown {
  const now = input.now ?? new Date();
  const message = input.message || "";
  const lower = message.toLowerCase();
  const bonuses: string[] = [];
  const penalties: string[] = [];
  const whyMatched: string[] = [];
  let score = 8;

  const keywords = (input.customKeywords?.length ? input.customKeywords : DEFAULT_KEYWORDS).map(
    (item) => item.toLowerCase(),
  );
  const matchedKeywords = keywords.filter((keyword) => lower.includes(keyword));
  score += Math.min(24, matchedKeywords.length * 8);
  if (matchedKeywords.length) {
    whyMatched.push(`Matched keywords: ${matchedKeywords.join(", ")}`);
  }

  for (const pattern of BONUS_PATTERNS) {
    if (pattern.re.test(message)) {
      score += pattern.points;
      bonuses.push(pattern.label);
      whyMatched.push(pattern.label);
    }
  }

  let recencyHours: number | null = null;
  if (input.postedAt) {
    recencyHours = Math.max(0, (now.getTime() - input.postedAt.getTime()) / 36e5);
    if (recencyHours <= 24) {
      score += 12;
      bonuses.push("Posted in last 24 hours");
      whyMatched.push(`Recency: ${Math.max(1, Math.round(recencyHours))} hour(s) ago`);
    } else if (recencyHours <= 72) {
      score += 6;
      bonuses.push("Posted in last 3 days");
    } else if (recencyHours > 168) {
      score -= 15;
      penalties.push("Older than 7 days");
    }
  }

  for (const pattern of PENALTY_PATTERNS) {
    if (pattern.re.test(message)) {
      score -= pattern.points;
      penalties.push(pattern.label);
    }
  }

  if (input.alreadyProcessed) {
    score -= 40;
    penalties.push("Already processed");
  }
  if (input.duplicateContent) {
    score -= 35;
    penalties.push("Duplicate post content");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const reciprocal = /\b(test yours|test mine|reciprocal|i can test|i.?ll test your)\b/i.test(
    message,
  );
  const intent = reciprocal
    ? "Reciprocal Android testing request"
    : matchedKeywords.length || bonuses.length
      ? "Looking for app testers"
      : "Unclear / low confidence";

  return {
    score,
    matchedKeywords,
    reciprocal,
    recencyHours,
    penalties,
    bonuses,
    whyMatched,
    intent,
  };
}

export function relevanceLabel(score: number) {
  if (score >= 80) return "HIGH MATCH";
  if (score >= 55) return "MEDIUM MATCH";
  return "LOW MATCH";
}

export const DEFAULT_SEARCH_KEYWORDS = DEFAULT_KEYWORDS;
