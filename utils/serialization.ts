/**
 * Safely stringifies an object, handling circular references by replacing them with a placeholder.
 * This prevents "Converting circular structure to JSON" errors.
 */
export const safeStringify = (obj: any): string => {
  const cache = new WeakSet();
  
  // Outer try-catch as a last resort safety net
  try {
    return JSON.stringify(obj, (key, value) => {
      // Handle null and non-objects immediately
      if (value === null || typeof value !== 'object') {
        return value;
      }
      
      // Handle potential DOM elements or React internal objects that might be circular
      // or have getters that throw errors. We check this BEFORE circularity check
      // to give specific labels.
      try {
        if (value instanceof HTMLElement || (value.nodeType && value.nodeName)) {
          return `[HTMLElement: ${value.nodeName}]`;
        }
        
        if (value instanceof Error) {
          const errorInfo: any = {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
          // Some custom errors have extra properties
          Object.getOwnPropertyNames(value).forEach(prop => {
            if (!['name', 'message', 'stack'].includes(prop)) {
              errorInfo[prop] = (value as any)[prop];
            }
          });
          return errorInfo;
        }

        // Handle Map and Set which JSON.stringify doesn't handle by default
        if (value instanceof Map) {
          return Array.from(value.entries());
        }
        if (value instanceof Set) {
          return Array.from(value.values());
        }

        // Handle basic circular references
        if (cache.has(value)) {
          return '[Circular]';
        }
        
        // Add to cache to track for circularity
        cache.add(value);
      } catch (e) {
        return '[Unserializable]';
      }
      
      return value;
    }, 2); // Added indentation for better logging
  } catch (err) {
    console.error('CRITICAL: safeStringify failed even with replacer:', err);
    try {
      // Fallback: try to just return a string representation
      return String(obj);
    } catch {
      return '[Stringify Failed Completely]';
    }
  }
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
