const TRANSIENT_PATTERN =
  /econnreset|etimedout|enotfound|eai_again|fetch failed|socket hang up|aborted|timeout|429|503|unavailable|temporarily|rate.?limit|quota/i;

export function isTransientPlayError(error: unknown) {
  const gaxios = error as { response?: { status?: number }; code?: string; message?: string; status?: number };
  const status = gaxios?.response?.status ?? gaxios?.status;
  if (status === 429 || (typeof status === "number" && status >= 500)) return true;
  const code = String(gaxios?.code || "");
  if (/^(ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|ABORT_ERR)$/i.test(code)) return true;
  return TRANSIENT_PATTERN.test(`${code} ${gaxios?.message || ""} ${error instanceof Error ? error.message : ""}`);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(work: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          const timeout = new Error("Google Play did not respond in time. No Google Play data was changed.");
          timeout.name = "PlayTimeoutError";
          reject(timeout);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withPlayRetry<T>(
  work: () => Promise<T>,
  options?: { attempts?: number; timeoutMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const timeoutMs = options?.timeoutMs ?? 12_000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return timeoutMs > 0 ? await withTimeout(work, timeoutMs) : await work();
    } catch (error) {
      lastError = error;
      const retryable = isTransientPlayError(error) || (error instanceof Error && error.name === "PlayTimeoutError");
      if (!retryable || attempt === attempts) throw error;
      await sleep(350 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
