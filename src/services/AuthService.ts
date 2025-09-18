import { AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import { BankAccount, LoginResponse } from '@/types';
import { logger } from '@/utils/logger';
import { RetryUtil } from '@/utils/retry';
import { createHttpClient } from '@/utils/httpClient';

export class AuthService {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = createHttpClient();
  }

  async login(account: BankAccount): Promise<LoginResponse> {
    logger.info(`Attempting login for user: ${account.username}`);

    try {
      const nonce = await this.fetchNonce();

      const payloadStr = `${account.username}:${account.password}:${nonce}`;
      const hash = this.sha256Hex(payloadStr);

      const token = await RetryUtil.execute(
        () => this.handleLogin(account, nonce, hash),
        {},
        `login ${account.username}`,
      );

      logger.info(`Login successful for ${account.username}`);

      return {
        success: true,
        token,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown login error';
      logger.error(`Login error for ${account.username}:`, errorMessage);

      return {
        success: false,
        errorMessage: errorMessage,
      };
    }
  }

  private async handleLogin(account: BankAccount, nonce: string, hash: string): Promise<string> {
    const loginRes = await this.httpClient.post('/api/login', {
      username: account.username,
      nonce,
      hash,
    });

    if (!loginRes.data || !loginRes.data.ok || !loginRes.data.token) {
      throw new Error('Login failed - invalid credentials');
    }

    const validateRes = await this.httpClient.get('/api/whoami', {
      params: { token: loginRes.data.token },
    });

    if (validateRes.status !== 200) {
      throw new Error('Token validation failed');
    }

    return loginRes.data.token;
  }

  private async fetchNonce(): Promise<string> {
    return RetryUtil.execute(
      async () => {
        logger.debug('Fetching nonce from /api/nonce');

        const response = await this.httpClient.get('/api/nonce', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });

        if (!response.data || !response.data.nonce) {
          throw new Error('Invalid nonce response: missing nonce field');
        }

        logger.debug(`Received nonce: ${response.data.nonce.substring(0, 10)}...`);
        return response.data.nonce;
      },
      {},
      'fetch nonce',
    );
  }

  private sha256Hex(str: string): string {
    return createHash('sha256').update(str, 'utf8').digest('hex');
  }
}
