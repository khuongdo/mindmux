/**
 * Retry utility with exponential backoff
 * Handles rate limits and transient errors from AI providers
 */

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Check if retryable error
      if (isRateLimitError(error) || isTransientError(error)) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Non-retryable error
      }
    }
  }

  throw new Error('Max retries exceeded');
}

function isRateLimitError(error: any): boolean {
  return error?.status === 429 || error?.code === 'rate_limit_exceeded';
}

function isTransientError(error: any): boolean {
  const transientCodes = [408, 500, 502, 503, 504];
  return transientCodes.includes(error?.status);
}
