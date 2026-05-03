/**
 * Safely stringifies an object, handling circular references by replacing them with a placeholder.
 * This prevents "Converting circular structure to JSON" errors.
 */
export const safeStringify = (obj: any): string => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  });
};

/**
 * Safely parses a JSON string, returning a default value if parsing fails.
 */
export const safeParse = <T>(json: string | null, defaultValue: T): T => {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return defaultValue;
  }
};
