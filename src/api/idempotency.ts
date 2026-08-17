const STORE_KEY = 'aico.idempotency.v1';

interface StoredKey {
  operation: string;
  hash: string;
  key: string;
}

export function payloadHash(value: unknown): string {
  return JSON.stringify(value);
}

export function getOrCreateIdempotencyKey(operation: string, payload: unknown): string {
  const hash = payloadHash(payload);
  const raw = sessionStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as StoredKey;
      if (stored.operation === operation && stored.hash === hash && stored.key) {
        return stored.key;
      }
    } catch {
      sessionStorage.removeItem(STORE_KEY);
    }
  }
  const key = crypto.randomUUID();
  sessionStorage.setItem(STORE_KEY, JSON.stringify({ operation, hash, key } satisfies StoredKey));
  return key;
}

export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(STORE_KEY);
}
