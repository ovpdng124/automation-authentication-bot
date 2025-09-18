import { RetryConfig } from '@/types';
import { logger } from './logger';

export class RetryUtil {
  private static defaultConfig: RetryConfig = {
    maxRetries: +(process.env.MAX_RETRIES || 3),
    delayMs: +(process.env.RETRY_DELAY_MS || 2000),
  };

  static async execute<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context = 'operation'
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        logger.debug(`Attempting ${context}, try ${attempt}/${finalConfig.maxRetries}`);
        return await fn();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`${context} failed on attempt ${attempt}:`, lastError.stack);

        if (attempt < finalConfig.maxRetries) {
          logger.debug(`Waiting delay ${finalConfig.delayMs}ms to retry`);
          await this.sleep(finalConfig.delayMs);
        }
      }
    }

    logger.error(`${context} failed after ${finalConfig.maxRetries} attempts`);
    throw lastError!;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
