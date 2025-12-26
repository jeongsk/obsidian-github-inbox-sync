/**
 * GitHub Inbox Sync - Exponential Backoff Utility
 */

import { CONFIG } from '../constants';

/**
 * Backoff 설정
 */
export interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  multiplier: number;
  jitterFactor?: number;
}

/**
 * 기본 Backoff 설정
 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelayMs: CONFIG.BACKOFF_INITIAL_MS,
  maxDelayMs: CONFIG.BACKOFF_MAX_MS,
  maxRetries: CONFIG.MAX_RETRIES,
  multiplier: CONFIG.BACKOFF_MULTIPLIER,
  jitterFactor: 0.1,
};

/**
 * 지정된 시간만큼 대기
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 대기 시간 계산
 */
export function calculateDelay(attempt: number, config: BackoffConfig = DEFAULT_BACKOFF_CONFIG): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.multiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Jitter 추가 (선택적)
  if (config.jitterFactor && config.jitterFactor > 0) {
    const jitter = cappedDelay * config.jitterFactor * Math.random();
    return Math.floor(cappedDelay + jitter);
  }

  return Math.floor(cappedDelay);
}

/**
 * 에러가 재시도 가능한지 확인
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit 에러
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return true;
    }

    // 네트워크 에러
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return true;
    }
  }

  // HTTP 상태 코드 기반 판단
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    // 429: Too Many Requests
    // 500, 502, 503, 504: 서버 에러
    return status === 429 || (status >= 500 && status <= 504);
  }

  return false;
}

/**
 * Response 헤더에서 retry-after 값 추출
 */
export function getRetryAfterSeconds(headers: Headers | Record<string, string>): number | null {
  let retryAfter: string | null = null;

  if (headers instanceof Headers) {
    retryAfter = headers.get('retry-after');
  } else if (typeof headers === 'object') {
    retryAfter = headers['retry-after'] || headers['Retry-After'] || null;
  }

  if (!retryAfter) return null;

  // 초 단위 숫자인 경우
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // HTTP 날짜 형식인 경우
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const diffMs = date.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  return null;
}

/**
 * Exponential backoff으로 함수 재시도
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 재시도 불가능한 에러는 즉시 throw
      if (!isRetryableError(error)) {
        throw lastError;
      }

      // 마지막 시도였으면 throw
      if (attempt === config.maxRetries - 1) {
        throw lastError;
      }

      // 대기 후 재시도
      const delay = calculateDelay(attempt, config);
      console.log(`[GitHub Inbox Sync] 재시도 ${attempt + 1}/${config.maxRetries}, ${delay}ms 후 시도`);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
