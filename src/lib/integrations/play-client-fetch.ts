import { isTransientPlayError, sleep } from "@/lib/integrations/play-retry";

export async function fetchPlayJson(
  url: string,
  init: RequestInit = {},
  attempts = 3,
): Promise<{ response: Response; data: Record<string, unknown> }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
        ...init,
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if ((response.status === 429 || response.status >= 500) && attempt < attempts) {
        await sleep(350 * 2 ** (attempt - 1));
        continue;
      }
      return { response, data };
    } catch (error) {
      lastError = error;
      if (!isTransientPlayError(error) && !(error instanceof TypeError)) throw error;
      if (attempt === attempts) break;
      await sleep(350 * 2 ** (attempt - 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Google Play could not be reached. Your TestLoop data has not been changed.");
}
