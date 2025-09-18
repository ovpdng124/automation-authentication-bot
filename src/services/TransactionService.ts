import { AxiosInstance } from 'axios';
import { Transaction } from '@/types';
import { logger } from '@/utils/logger';
import { RetryUtil } from '@/utils/retry';
import { createHttpClient } from '@/utils/httpClient';

export class TransactionService {
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = createHttpClient();
  }

  async getTransactions(username: string, token: string): Promise<Transaction[]> {
    try {
      logger.info(`Fetching transactions for user: ${username}`);

      const response = await RetryUtil.execute(
        async () => {
          return this.httpClient.get('/api/transactions', { params: { token } });
        },
        {},
        `fetch transactions for ${username}`
      );

      if (!response.data.ok || !response.data.transactions) {
        throw new Error('Invalid response format: missing ok or transactions field');
      }

      const transactions = response.data.transactions;

      const processedTransactions: Transaction[] = transactions.slice(0, 10).map((txn: any) => ({
        username: username,
        tx_date: new Date(txn.date),
        description: txn.desc,
        amount: txn.amount,
        scraped_at: new Date()
      }));

      logger.info(`Successfully fetched ${processedTransactions.length} transactions for ${username}`);
      return processedTransactions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to fetch transactions for ${username}:`, errorMessage);

      throw new Error(`Transaction fetch failed for ${username}: ${errorMessage}`);
    }
  }
}
