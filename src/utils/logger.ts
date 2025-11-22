type LogLevel = 'info' | 'warn' | 'error';

interface LogOptions {
  data?: Record<string, unknown>;
  level?: LogLevel;
}

const formatTimestamp = () => new Date().toISOString();

export const logEvent = (
  scope: string,
  message: string,
  options: LogOptions = {},
) => {
  const { data, level = 'info' } = options;
  const payload = {
    timestamp: formatTimestamp(),
    scope,
    message,
    ...(data ? { data } : {}),
  };

  switch (level) {
    case 'warn':
      console.warn('[metrics]', payload);
      break;
    case 'error':
      console.error('[metrics]', payload);
      break;
    default:
      console.info('[metrics]', payload);
  }
};

/**
 * Track fallback usage voor analytics
 */
const fallbackUsage = new Map<string, number>();

export const trackFallback = (service: string, reason: string) => {
  const key = `${service}:${reason}`;
  const count = fallbackUsage.get(key) || 0;
  fallbackUsage.set(key, count + 1);
  
  logEvent('fallback_usage', `Fallback used: ${service}`, {
    level: 'warn',
    data: {
      service,
      reason,
      totalCount: count + 1,
    },
  });
};

export const getFallbackStats = () => {
  return Object.fromEntries(fallbackUsage);
};

/**
 * Wrapper voor Gemini API calls met consistente error handling
 */
export async function withGeminiErrorHandling<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>,
  fallback: () => T,
  options?: {
    retries?: number;
    retryDelay?: number;
  }
): Promise<T> {
  const retries = options?.retries ?? 2;
  const retryDelay = options?.retryDelay ?? 1000;
  
  let lastError: unknown = null;
  
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const result = await fn();
      logEvent(service, `${operation} succeeded`, {
        data: { attempt: attempt + 1 },
      });
      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logEvent(service, `${operation} attempt failed`, {
        level: 'warn',
        data: {
          attempt: attempt + 1,
          error: errorMessage,
        },
      });
      
      if (attempt < retries - 1) {
        // Wacht voordat retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // Alle retries gefaald, gebruik fallback
  trackFallback(service, lastError instanceof Error ? lastError.message : String(lastError));
  logEvent(service, `Using fallback for ${operation}`, {
    level: 'warn',
    data: {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    },
  });
  
  return fallback();
}

